"""Ritsu-skill SkillOpt environment adapter.

Connects the ReflACT trainer to the ritsu-works synth-data format
produced by `eval-evo/skillopt-gen-data`. Items are
`(input, expected_behavior, rubric, …)` tuples written as JSONL.

Architecture (per spec §19.4.5 — Sprint 3.5 gap fix):

    train.py --env ritsu_skill --backend ritsu_file_queue --config <cfg.yaml>
        │
        ├── RitsuSkillAdapter
        │     ├── build_train_env / build_eval_env  → BatchSpec.payload = list[dict]
        │     ├── rollout(items, skill, out_dir)
        │     │     │  for each item:
        │     │     │    chat_target(system=anchor+skill, user=task.input)
        │     │     │    judge(task, target_output)  → score in [0, 1]
        │     │     └─ returns [{id, hard, soft, …}]
        │     └── reflect(results, skill, out_dir)
        │           └─ chat_optimizer minibatches → patch list
        │
        └── All chat_* calls route through ritsu_file_queue (bypassing
            skillopt.model re-export which is hardcoded to openai_chat/
            claude_chat backends — Sprint 1 design issue, isolated here).

Subscription invariant: zero HTTP calls. Every LLM call → file queue
request → session bridge dispatch via Task() → subscription billing.
The session bridge classifies requests by `kind`:
  - `kind: "target"`   → `skillopt-target-rollout` subagent (Haiku)
  - `kind: "optimizer"`→ `skillopt-optimizer-reflect` subagent (Sonnet)
  - `kind: "judge"`    → `skillopt-target-rollout` subagent (the runner
                          dispatches the judge via the target subagent
                          with a judge-shaped prompt — v1.0 of judge
                          reuses target's no-tool zero-attack-surface
                          structure; v1.2 may add a dedicated judge
                          subagent).
"""
from __future__ import annotations

import json
import os
import re
import time
from concurrent.futures import FIRST_COMPLETED, ThreadPoolExecutor, wait

# Import chat_target / chat_optimizer DIRECTLY from ritsu_file_queue.
# Going through skillopt.model.__init__ would dispatch via
# get_target_backend()/get_optimizer_backend(), which hardcode openai_chat/
# claude_chat (see backend_config.py:set_*_backend allow-list — does NOT
# include 'ritsu_file_queue'). Direct import bypasses that issue and
# guarantees subscription routing per spec §19 architecture.
from skillopt.model.ritsu_file_queue import (
    chat_target as _chat_target_queued,
    chat_optimizer as _chat_optimizer_queued,
)
from skillopt.envs.base import EnvAdapter
from skillopt.envs.ritsu_skill.loader import RitsuSkillDataLoader


# Anchor files — Pillar 5 context (per spec §19.5 + skillopt-gen-data SKILL.md).
# Resolved relative to the repo root; in production the trainer is invoked from
# ritsu-works root. Anchor content is included in every rollout prompt so the
# frozen target knows brand voice + product purpose + decision principles.
_DEFAULT_ANCHOR_PATHS = (
    "00-core/brand_voice.md",
    "00-core/product.md",
    "00-core/principles.md",
)


def _read_anchor_files(paths: tuple[str, ...]) -> str:
    """Concat anchor file contents (~3K tokens). Missing files are skipped
    silently because the trainer may run from a sandboxed copy where
    not every 00-core file is present."""
    chunks: list[str] = []
    for rel in paths:
        if not os.path.exists(rel):
            continue
        try:
            with open(rel, encoding="utf-8") as f:
                chunks.append(f"# ANCHOR: {rel}\n\n{f.read().strip()}")
        except (OSError, UnicodeDecodeError):
            # Anchor read failure is non-fatal; the rollout still runs
            # with skill alone. Surface in stderr for debugging.
            print(f"  [ritsu_skill] WARN: could not read anchor {rel}", flush=True)
    return "\n\n---\n\n".join(chunks)


def _build_rollout_system(skill_content: str, anchor: str) -> str:
    """System prompt sent to the frozen target subagent.

    Layout: SKILL block (target's behavior contract) + ANCHOR
    (Pillar 5 context). The skillopt-target-rollout subagent treats the
    SKILL block as its operational definition.
    """
    skill_block = skill_content.strip() or "(skill is empty)"
    anchor_section = f"\n\n---\n\n## Context (Pillar 5 anchor)\n\n{anchor}" if anchor else ""
    return (
        "You are the frozen target under SkillOpt training. The SKILL block "
        "below defines your behavior. Follow it. Do not improvise.\n\n"
        f"## SKILL\n\n{skill_block}{anchor_section}"
    )


def _build_rollout_user(item: dict) -> str:
    """User prompt: TASK block. Format mirrors skillopt-target-rollout's
    invocation contract (see .claude/agents/skillopt-target-rollout.md)."""
    task = {
        "input": item.get("input", ""),
        "expected_behavior": item.get("expected_behavior", ""),
        "rubric": item.get("rubric", []),
    }
    return f"TASK:\n{json.dumps(task, ensure_ascii=False, indent=2)}"


def _build_judge_user(item: dict, target_output: str, self_grade: list | None) -> str:
    """User prompt for kind=judge. Mirrors skillopt-judge SKILL.md inputs
    schema. The judge subagent is the same Haiku subagent as target (no
    dedicated judge subagent in v1.0; see module docstring)."""
    judge_input = {
        "task": {
            "id": str(item.get("id") or ""),
            "input": item.get("input", ""),
            "expected_behavior": item.get("expected_behavior", ""),
            "rubric": item.get("rubric", []),
            "difficulty": int(item.get("difficulty") or 1),
        },
        "target_output": target_output,
        "self_grade_per_criterion": self_grade,
    }
    return (
        "You are now acting as the SkillOpt JUDGE for this single grading "
        "request. Score the TARGET_OUTPUT against the rubric (binary "
        "per criterion). Output strict JSON only:\n\n"
        '{"score": <float 0..1>, "per_criterion": [{"criterion": "<verbatim>", '
        '"passed": 0|1, "rationale": "<≤200 char>"}], '
        '"self_vs_judge_delta": <float|null>, '
        '"confidence": "high"|"medium"|"low", "warnings": [<str>]}\n\n'
        f"INPUT:\n{json.dumps(judge_input, ensure_ascii=False, indent=2)}"
    )


# Strict-JSON parser tolerant to subagent code-fence wrapping.
_FENCE_RE = re.compile(r"```(?:json)?\s*\n?(.*?)\n?```", re.DOTALL)


def _parse_strict_json(text: str) -> dict | None:
    """Parse a subagent JSON response. Tolerates ```json ... ``` fences.
    Returns None on parse failure (caller decides how to penalize)."""
    if not text:
        return None
    raw = text.strip()
    m = _FENCE_RE.search(raw)
    if m:
        raw = m.group(1).strip()
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        # Try last-resort: find the outermost {...} block.
        first = raw.find("{")
        last = raw.rfind("}")
        if first >= 0 and last > first:
            try:
                return json.loads(raw[first : last + 1])
            except json.JSONDecodeError:
                return None
        return None


def _process_one(
    item: dict,
    *,
    skill_content: str,
    anchor: str,
    out_root: str,
    judge_timeout: int = 120,
    exec_timeout: int = 120,
) -> dict:
    """Execute one task: target rollout → judge grade → result row.

    Returns a RolloutResult dict per `skillopt.types.RolloutResult`:
        { id: str, hard: 0|1, soft: float in [0,1], ... }
    """
    item_id = str(item.get("id") or "")
    pred_dir = os.path.join(out_root, "predictions", item_id or "unknown")
    os.makedirs(pred_dir, exist_ok=True)

    result: dict = {
        "id": item_id,
        "task_type": "ritsu_skill",
        "task_description": item.get("input", "")[:200],
        "input": item.get("input", ""),
        "expected_behavior": item.get("expected_behavior", ""),
        "rubric": item.get("rubric", []),
        "hard": 0,
        "soft": 0.0,
        "judge_score": 0.0,
        "self_grade_per_criterion": None,
        "target_response": "",
        "judge_response": None,
        "fail_reason": "",
        "agent_ok": False,
    }

    system = _build_rollout_system(skill_content, anchor)
    user = _build_rollout_user(item)

    # Step 1 — rollout (kind=target). Routes through ritsu_file_queue →
    # bridge → Task(skillopt-target-rollout).
    try:
        target_text, _ = _chat_target_queued(
            system=system,
            user=user,
            max_completion_tokens=2048,
            # 2026-05-28: bumped from 3 → 10. In-session orchestrator can
            # take >120s on a single batch turn (multiple parallel Task()
            # dispatches + bash overhead); with retries=3 a slow turn
            # exhausts the budget before the response lands. See
            # `project_evolve_skillopt_vendor_retry_gap` memory.
            retries=10,
            stage="target",
            timeout=exec_timeout,
        )
        result["target_response"] = target_text
        result["agent_ok"] = True
    except Exception as exc:  # noqa: BLE001
        result["fail_reason"] = f"target_rollout_error: {type(exc).__name__}: {exc}"
        # Persist prompt for forensics.
        try:
            with open(os.path.join(pred_dir, "target_system.txt"), "w") as f:
                f.write(system)
            with open(os.path.join(pred_dir, "target_user.txt"), "w") as f:
                f.write(user)
        except OSError:
            pass
        return result

    # Parse target's self-grade (skillopt-target-rollout returns
    # `{trajectory, self_grade_per_criterion}` JSON).
    parsed_target = _parse_strict_json(target_text)
    if parsed_target:
        self_grade = parsed_target.get("self_grade_per_criterion")
        if isinstance(self_grade, list):
            result["self_grade_per_criterion"] = self_grade
        # If the subagent returned trajectory separately, prefer it as the
        # judge's input (cleaner than the wrapper JSON).
        traj = parsed_target.get("trajectory")
        if isinstance(traj, str) and traj:
            result["target_trajectory"] = traj

    # Step 2 — judge grade (kind=judge). Uses the chat_target queue path
    # because the bridge classifies by `kind` in the queue payload, not by
    # which Python wrapper called it. We re-call with stage="judge" so the
    # request envelope carries kind=target but stage=judge. The bridge's
    # session-side runner sees kind=target and dispatches the
    # skillopt-target-rollout subagent with a judge-shaped prompt
    # (v1.0 judge architecture per module docstring).
    judge_user = _build_judge_user(item, target_text, result["self_grade_per_criterion"])
    try:
        judge_text, _ = _chat_target_queued(
            system=(
                "You are the SkillOpt JUDGE. For this single invocation, "
                "ignore any prior role. Read the INPUT block and grade the "
                "target output against the rubric. Output strict JSON only."
            ),
            user=judge_user,
            max_completion_tokens=1024,
            # 2026-05-28: bumped from 3 → 10 (same rationale as target above).
            retries=10,
            stage="judge",
            timeout=judge_timeout,
        )
        result["judge_response"] = judge_text
    except Exception as exc:  # noqa: BLE001
        result["fail_reason"] = f"judge_error: {type(exc).__name__}: {exc}"
        result["judge_response"] = None
        # Don't return yet — we still have the target response; record
        # a degenerate score so the row counts as a failure.
        result["hard"] = 0
        result["soft"] = 0.0
        result["judge_score"] = 0.0
        return result

    # Step 3 — parse judge score.
    parsed_judge = _parse_strict_json(judge_text)
    if parsed_judge and isinstance(parsed_judge.get("score"), (int, float)):
        score = float(parsed_judge["score"])
        score = max(0.0, min(1.0, score))
        result["judge_score"] = score
        result["soft"] = score
        # hard = 1 iff the judge passed every criterion (score == 1.0).
        # This mirrors SearchQA's EM convention: hard is binary; soft is
        # continuous. The reflect stage uses `hard` to bucket
        # success/failure trajectories.
        result["hard"] = 1 if score >= 1.0 else 0
        # Emit warnings + confidence to the result for downstream review.
        result["judge_confidence"] = parsed_judge.get("confidence")
        result["judge_warnings"] = parsed_judge.get("warnings")
    else:
        result["fail_reason"] = result["fail_reason"] or "judge_unparseable"
        result["judge_score"] = 0.0
        result["soft"] = 0.0
        result["hard"] = 0

    # Persist artifacts for the analyst + forensics.
    try:
        with open(os.path.join(pred_dir, "target_system.txt"), "w") as f:
            f.write(system)
        with open(os.path.join(pred_dir, "target_user.txt"), "w") as f:
            f.write(user)
        with open(os.path.join(pred_dir, "target_response.txt"), "w") as f:
            f.write(target_text)
        with open(os.path.join(pred_dir, "judge_response.json"), "w") as f:
            f.write(judge_text)
    except OSError:
        pass

    return result


def _run_minibatch_reflect_queued(
    *,
    results: list[dict],
    skill_content: str,
    out_dir: str,
    minibatch_size: int = 8,
    edit_budget: int = 4,
    failure_only: bool = False,
    workers: int = 4,
) -> list[dict | None]:
    """Minimal reflect that routes through ritsu_file_queue (kind=optimizer).

    We do NOT use `skillopt.gradient.reflect.run_minibatch_reflect` because
    it imports `chat_optimizer` from `skillopt.model` (the re-export), which
    is hardcoded to openai_chat/claude_chat backends per
    `backend_config.set_optimizer_backend`. Our direct import of
    `chat_optimizer` from `ritsu_file_queue` keeps the call on the
    subscription path.

    The reflect prompt mirrors `.claude/agents/skillopt-optimizer-reflect.md`
    so the subagent's behavior contract is honored. Output is a list of
    raw patch dicts (`{"patch": {"edits": [...]}, "source_type": "failure"|"success"}`).
    """
    if not results:
        return []

    failures = [r for r in results if not r.get("hard")]
    successes = [r for r in results if r.get("hard")]

    minibatches: list[tuple[str, list[dict]]] = []
    for i in range(0, len(failures), minibatch_size):
        minibatches.append(("failure", failures[i : i + minibatch_size]))
    if not failure_only:
        for i in range(0, len(successes), minibatch_size):
            minibatches.append(("success", successes[i : i + minibatch_size]))

    if not minibatches:
        return []

    patches_dir = os.path.join(out_dir, "patches")
    os.makedirs(patches_dir, exist_ok=True)

    def _reflect_one(idx: int, kind: str, batch: list[dict]) -> dict | None:
        system = (
            "You are the SkillOpt OPTIMIZER. Read CURRENT_SKILL and "
            "MINIBATCH (trajectories with judge scores). Propose ≤"
            f"{edit_budget} minimal add/delete/replace edits to the skill "
            "that would fix failure patterns OR preserve success patterns. "
            "Output strict JSON only:\n\n"
            '{"edits": [{"op": "add"|"delete"|"replace", "target": "<line range or section anchor>", '
            '"new_text": "<for add/replace>", "rationale": "<one-sentence pattern citation>"}], '
            '"meta_skill_update": "<optional one-paragraph cross-skill lesson, may be empty>"}'
        )
        minibatch_payload = {
            "current_skill": skill_content,
            "minibatch_kind": kind,
            "items": [
                {
                    "id": r.get("id"),
                    "input": r.get("input", ""),
                    "expected_behavior": r.get("expected_behavior", ""),
                    "rubric": r.get("rubric", []),
                    "target_response": r.get("target_response", "")[:2000],
                    "judge_score": r.get("judge_score", 0.0),
                    "self_grade": r.get("self_grade_per_criterion"),
                    "fail_reason": r.get("fail_reason", ""),
                }
                for r in batch
            ],
            "edit_budget": edit_budget,
        }
        user = f"MINIBATCH ({kind}, {len(batch)} items):\n\n{json.dumps(minibatch_payload, ensure_ascii=False, indent=2)}"
        try:
            response, _ = _chat_optimizer_queued(
                system=system,
                user=user,
                max_completion_tokens=4096,
                # 2026-05-28: bumped retries 3 → 10 AND timeout 180 → 1800
                # (30 min). Optimizer reflect prompts are ~20-25KB user
                # context (full skill + minibatch + meta-skill), so Sonnet
                # subagent dispatch + JSON parsing takes longer than 180s
                # under in-session orchestration. See
                # `project_evolve_skillopt_vendor_retry_gap` memory.
                retries=10,
                stage="optimizer",
                timeout=1800,
            )
        except Exception as exc:  # noqa: BLE001
            print(
                f"    [ritsu_skill reflect] minibatch {idx} ({kind}) error: "
                f"{type(exc).__name__}: {exc}",
                flush=True,
            )
            return None

        parsed = _parse_strict_json(response)
        if not parsed or not isinstance(parsed.get("edits"), list):
            print(
                f"    [ritsu_skill reflect] minibatch {idx} ({kind}) "
                f"unparseable response",
                flush=True,
            )
            return None
        # Persist for forensics
        try:
            with open(os.path.join(patches_dir, f"patch_{idx:03d}_{kind}.json"), "w") as f:
                json.dump(parsed, f, ensure_ascii=False, indent=2)
        except OSError:
            pass
        return {"patch": {"edits": parsed["edits"]}, "source_type": kind}

    raw_patches: list[dict | None] = [None] * len(minibatches)
    with ThreadPoolExecutor(max_workers=max(1, workers)) as ex:
        futs = {
            ex.submit(_reflect_one, idx, kind, batch): idx
            for idx, (kind, batch) in enumerate(minibatches)
        }
        for fut in list(futs.keys()):
            idx = futs[fut]
            try:
                raw_patches[idx] = fut.result()
            except Exception as exc:  # noqa: BLE001
                print(
                    f"    [ritsu_skill reflect] worker idx={idx} crashed: "
                    f"{type(exc).__name__}: {exc}",
                    flush=True,
                )
                raw_patches[idx] = None
    return raw_patches


class RitsuSkillAdapter(EnvAdapter):
    """SkillOpt environment adapter for the ritsu_skill format.

    Trainer-facing methods (per `skillopt.envs.base.EnvAdapter`):
        - build_train_env / build_eval_env  → list[dict] (BatchSpec.payload)
        - rollout(env_manager, skill, out_dir)  → list[RolloutResult]
        - reflect(results, skill, out_dir)      → list[RawPatch]
        - get_task_types()  → ["ritsu_skill"]
    """

    def __init__(
        self,
        # Loader-routed params (forwarded to RitsuSkillDataLoader)
        split_dir: str = "",
        data_path: str = "",
        split_mode: str = "ratio",
        split_ratio: str = "7:1:2",
        split_seed: int = 42,
        split_output_dir: str = "",
        seed: int = 42,
        limit: int = 0,
        # Adapter-specific params
        anchor_paths: tuple[str, ...] | list[str] | None = None,
        max_turns: int = 1,
        exec_timeout: int = 120,
        judge_timeout: int = 120,
        workers: int = 4,
        analyst_workers: int = 4,
        minibatch_size: int = 8,
        edit_budget: int = 4,
        failure_only: bool = False,
    ) -> None:
        self.max_turns = max_turns
        self.exec_timeout = exec_timeout
        self.judge_timeout = judge_timeout
        self.workers = max(1, int(workers or 1))
        self.analyst_workers = max(1, int(analyst_workers or 1))
        self.minibatch_size = max(1, int(minibatch_size or 1))
        self.edit_budget = max(1, int(edit_budget or 1))
        self.failure_only = bool(failure_only)
        if anchor_paths is None:
            self._anchor_paths = _DEFAULT_ANCHOR_PATHS
        else:
            self._anchor_paths = tuple(str(p) for p in anchor_paths)
        self._anchor_cache: str | None = None

        self.dataloader = RitsuSkillDataLoader(
            split_dir=split_dir,
            data_path=data_path,
            split_mode=split_mode,
            split_ratio=split_ratio,
            split_seed=split_seed,
            split_output_dir=split_output_dir,
            seed=seed,
            limit=limit,
        )

    # ── Lifecycle ────────────────────────────────────────────────────────

    def setup(self, cfg: dict) -> None:
        super().setup(cfg)
        # Allow cfg to override anchor_paths (e.g., a sandbox run might
        # point at a copied 00-core/).
        anchor_cfg = cfg.get("anchor_paths")
        if anchor_cfg:
            if isinstance(anchor_cfg, str):
                self._anchor_paths = (anchor_cfg,)
            elif isinstance(anchor_cfg, (list, tuple)):
                self._anchor_paths = tuple(str(p) for p in anchor_cfg)
        self.dataloader.setup(cfg)

    def get_dataloader(self):
        return self.dataloader

    def get_task_types(self) -> list[str]:
        return ["ritsu_skill"]

    def _get_anchor(self) -> str:
        if self._anchor_cache is None:
            self._anchor_cache = _read_anchor_files(self._anchor_paths)
        return self._anchor_cache

    # ── Batch construction (delegates to dataloader) ─────────────────────

    def build_env_from_batch(self, batch, **kwargs):
        return list(batch.payload or [])

    def build_train_env(self, batch_size: int, seed: int, **kwargs):
        batch = self.dataloader.build_train_batch(
            batch_size=batch_size, seed=seed, **kwargs
        )
        return self.build_env_from_batch(batch, **kwargs)

    def build_eval_env(self, env_num: int, split: str, seed: int, **kwargs):
        batch = self.dataloader.build_eval_batch(
            env_num=env_num, split=split, seed=seed, **kwargs
        )
        return self.build_env_from_batch(batch, **kwargs)

    # ── Rollout + reflect ────────────────────────────────────────────────

    def rollout(
        self,
        env_manager,
        skill_content: str,
        out_dir: str,
        **kwargs,
    ) -> list[dict]:
        """Run the frozen target on each item + judge each output.

        Resume-aware: re-loads `results.jsonl` if present and skips
        already-completed item IDs. Mirrors SearchQA's resume pattern.
        """
        items: list[dict] = list(env_manager) if env_manager else []
        os.makedirs(out_dir, exist_ok=True)
        results_path = os.path.join(out_dir, "results.jsonl")

        # Resume: load already-done.
        done_ids: set[str] = set()
        existing: list[dict] = []
        if os.path.exists(results_path):
            with open(results_path, encoding="utf-8") as f:
                for line in f:
                    stripped = line.strip()
                    if not stripped:
                        continue
                    try:
                        r = json.loads(stripped)
                    except json.JSONDecodeError:
                        continue
                    rid = str(r.get("id") or "")
                    if rid:
                        done_ids.add(rid)
                        existing.append(r)

        pending = [it for it in items if str(it.get("id") or "") not in done_ids]
        if not pending:
            return existing

        anchor = self._get_anchor()
        total = len(existing) + len(pending)
        completed = len(existing)
        if existing:
            print(
                f"    [ritsu_skill rollout] resuming: {completed}/{total} already done",
                flush=True,
            )

        results = list(existing)

        def _run(item: dict) -> dict:
            return _process_one(
                item,
                skill_content=skill_content,
                anchor=anchor,
                out_root=out_dir,
                judge_timeout=self.judge_timeout,
                exec_timeout=self.exec_timeout,
            )

        with open(results_path, "a", encoding="utf-8") as outf:
            with ThreadPoolExecutor(max_workers=self.workers) as ex:
                futs = {ex.submit(_run, it): it for it in pending}
                pending_set = set(futs)
                while pending_set:
                    done, _pending = wait(
                        pending_set, timeout=5, return_when=FIRST_COMPLETED
                    )
                    for fut in done:
                        pending_set.remove(fut)
                        item = futs[fut]
                        try:
                            res = fut.result()
                        except Exception as exc:  # noqa: BLE001
                            res = {
                                "id": str(item.get("id") or ""),
                                "task_type": "ritsu_skill",
                                "hard": 0,
                                "soft": 0.0,
                                "judge_score": 0.0,
                                "agent_ok": False,
                                "fail_reason": (
                                    f"unexpected_worker_error: "
                                    f"{type(exc).__name__}: {exc}"
                                ),
                            }
                        results.append(res)
                        completed += 1
                        acc = (
                            sum(1 for r in results if r.get("hard")) / completed
                            if completed
                            else 0
                        )
                        print(
                            f"    [ritsu_skill rollout] {completed}/{total} "
                            f"(hard_acc={acc:.3f}) id={res.get('id')} "
                            f"soft={res.get('soft', 0.0):.3f}",
                            flush=True,
                        )
                        outf.write(json.dumps(res, ensure_ascii=False) + "\n")
                        outf.flush()

        return results

    def reflect(
        self,
        results: list[dict],
        skill_content: str,
        out_dir: str,
        **kwargs,
    ) -> list[dict | None]:
        return _run_minibatch_reflect_queued(
            results=results,
            skill_content=skill_content,
            out_dir=out_dir,
            minibatch_size=self.minibatch_size,
            edit_budget=self.edit_budget,
            failure_only=self.failure_only,
            workers=self.analyst_workers,
        )
