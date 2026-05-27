---
name: eval-evo/skillopt-gen-data
description: |
  Phase B of /evolve skillopt. Generates synthetic (task, expected_behavior, rubric)
  tuples from a target SKILL.md by blending up to 5 grounding pillars:
  founder gold examples, ops.run_summaries silver-gold, wiki RAG silver,
  gbrain opt-in silver, and 00-core anchor context. Writes every produced
  task as a citation-spine row in ops.evolve_extractions with confidence
  rounded to {0.95 auto-accept, 0.85 pending-review, 0.6 pending-review}.
  Surfaces 5 randomly-sampled tasks to the founder for accept/reject/regen
  decision before bulk generation proceeds. Output dataset cached under
  runtime/skillopt/<entity>/data/v<ts>/.
trigger: invoked-by-skillopt-runner
budget_cap_task_kind: entity-update-distill-skill   # placeholder; gen-data shares the distill cap pattern (~$0.10-0.20/run)
spec: wiki/capabilities/evolve/spec.md §19.5 (after Phase 8 promotion); draft .archives/cla/evolve-extend-skillopt/spec.md
---

# Skill: eval-evo/skillopt-gen-data

Builds the synth-data minibatch that drives `/evolve skillopt` Phase C
(rollouts). Five grounding pillars per spec §19.5; per-task confidence
rounded to the v3.0 wiki-sync 3-bucket convention so the founder review
queue (Pillar 2/3/4 entries → `pending_review`) stays manageable.

## When to invoke

Invoked exclusively by `eval-evo/skillopt-runner` (Sprint 3 deliverable)
between Phase A (pre-flight: lock, drift, vendor smoke) and Phase C
(rollouts). Do NOT invoke directly from a session unless dry-running for
validation (`--dry-run --gen-count=5`).

## Inputs (from skillopt-runner)

```json
{
  "run_id": "<uuid>",
  "entity_type": "skill",
  "entity_path": "06-ai-ops/skills/<...>/SKILL.md",
  "entity_content": "<current SKILL.md body>",
  "gen_count":        25,
  "gen_sources":      "auto" | { "pillars": [1, 2, 3, 4, 5] } | { "pillars": [1, 3] },
  "regen_data":       true | false,
  "dry_run":          true | false,
  "max_messages_cap": 500
}
```

v1.1 surface uses `--gen-sources=auto` by default → resolves to pillars
1, 2, 3, 5 (Pillar 4 gbrain is opt-in 0% per TCDP-1; `auto` excludes
it). Explicit `pillars=1,2,3,4` enables Pillar 4 at ~$0.005/run cost.

## Outputs

1. `runtime/skillopt/<entity>/data/v<ts>/dataset.jsonl` — one task per
   line, schema below. The `latest/` symlink updates to this version.
2. `runtime/skillopt/<entity>/data/v<ts>/source-manifest.json` — manifest
   recording: pillar mix actual, skill_hash, gen_count_requested vs
   produced, founder gate decision.
3. `ops.evolve_extractions` rows — one per produced task; `entity_type =
   'skill'`, `entity_slug = <SKILL name>`, `ref_path` = pillar source path,
   `ref_chunk_index` = pillar ordinal, `raw_quote` = excerpt, `proposed_change`
   = `task.input`, `confidence` per-pillar (see below), `review_state`
   per founder-gate outcome.
4. STDOUT JSON summary for skillopt-runner.

### Task schema (one line of dataset.jsonl)

```jsonc
{
  "id": "<uuid>",
  "pillar": 1 | 2 | 3 | 4 | 5,
  "input":              "<the task prompt presented to skillopt-target-rollout>",
  "expected_behavior":  "<observable signal of success, plain English>",
  "rubric": [
    { "criterion": "<verbatim string the rollout self-grades against>", "weight": 1 },
    ...
  ],
  "source_path":    "<ref_path used for citation spine>",
  "source_chunk":   <integer pillar ordinal>,
  "raw_quote":      "<verbatim ≤500-char excerpt the rubric was derived from>",
  "confidence":     0.95 | 0.85 | 0.6,
  "difficulty":     1 | 2 | 3   // easy/medium/hard heuristic
}
```

## Process

### Step 1 — Resolve gen_sources

If `gen_sources == "auto"`:
- Default mix: pillars `[1, 2, 3, 5]` (Pillar 4 gbrain stays OFF unless explicit).
- Per spec §19.5:
  - Pillar 1: 30-40% of dataset
  - Pillar 2: 0-30% (only if `ops.run_summaries` has ≥ 10 rows for this entity)
  - Pillar 3: 15-20% (always for skills attached to a wiki capability)
  - Pillar 5: context-only (anchor in prompts, never emits tasks)
- If actual available content from pillars sums to < `gen_count` budget,
  rebalance upward (e.g., Pillar 1 fills to 60% if Pillar 2 has no rows).

If `gen_sources == { "pillars": [...] }`, use exactly those.

### Step 2 — Pillar extraction

Per-pillar extraction logic (run in parallel via `Promise.all`):

**Pillar 1 (gold) — SKILL.md `<example>` blocks**
- Scan `entity_content` for `<example>...</example>` blocks (case-insensitive).
- Each example becomes 1-2 candidate tasks: input from example user-side,
  expected_behavior from example assistant-side, rubric inferred from
  what the example demonstrates as success.
- `confidence = 0.95` (founder-authored canonical examples).
- `review_state = 'auto_accepted'`.

**Pillar 2 (silver-gold) — `ops.run_summaries`**
- Query `mcp__supabase-ops__query`: `SELECT run_id, summary, artifacts
  FROM ops.run_summaries WHERE agent_slug LIKE '<entity-prefix>%' AND ts
  > now() - interval '90 days' ORDER BY ts DESC LIMIT 50`.
- If < 10 rows returned, skip this pillar (per spec — insufficient signal).
- For each row, apply PII redaction using the same regex set as
  `pre-tool-secrets.md` (single source of truth for redaction patterns —
  see R-S2-1 in sprint-plan). Reject any row where redaction altered
  > 30% of length (likely PII-heavy; not safe to use).
- LLM-distill (Haiku) the redacted summary into a task: "what did the
  agent do successfully?" → input/expected_behavior/rubric.
- `confidence = 0.85` (real signal but second-hand).
- `review_state = 'pending_review'` (founder reviews via §"Founder gate" below).

**Pillar 3 (silver) — Wiki RAG**
- Query `mcp__supabase-ops__wiki_ask({ question: "edge cases and
  scenarios for: <skill title from SKILL.md>", source: null, limit: 20 })`.
- For each chunk returned, LLM-distill (Sonnet) into a task framing
  the chunk's content as a use-case the skill should handle.
- `confidence = 0.6` (broad domain knowledge, possibly tangential).
- `review_state = 'pending_review'`.

**Pillar 4 (silver opt-in) — gbrain READ**
- Only runs if explicit `gen_sources.pillars` includes `4`.
- Query `mcp__gbrain__search({ query: "<skill semantic intent>", limit:
  20, kind: ["concept", "observation", "decision"] })`.
- LLM-distill (Sonnet) into operational-lessons tasks.
- `confidence = 0.6` (gbrain content varies in quality).
- `review_state = 'pending_review'`.
- Cost: ~$0.005/run for the gbrain query + distillation. Logged to
  `ops.cost_attributions` cost_bucket `gbrain.eval-evo-orchestrator.search`.

**Pillar 5 (anchor) — 00-core context (NO task extraction)**
- Read `00-core/{brand_voice,product,principles}.md` + the skill's
  parent pillar's SOPs (e.g., `06-ai-ops/sops/SOP-AIOPS-001-*.md`).
- Concatenate ~3K-token anchor prepended to every rollout prompt as
  background context — the skill knows the voice, product, principles.
- **Pillar 5 produces ZERO task rows.** It's context-only per @cto NIT 3
  (Phase 5 review). The anchor goes into the skillopt-runner's rollout
  dispatch, not into `dataset.jsonl`.

### Step 3 — Mix + balance

Take per-pillar candidates produced in Step 2. Truncate each pillar to
its target % of `gen_count`. If a pillar produced more candidates than
its share, randomly sample down (with seed for reproducibility). If a
pillar produced fewer, redistribute the shortfall to Pillar 1 (cap 60%)
and Pillar 3.

Estimate difficulty per task on a 1-3 scale: 1 if task input is
< 200 chars and behavior is single-shot; 2 if multi-step or has edge
case; 3 if requires nuanced judgment. Used by skillopt-judge for
weighting.

### Step 4 — Founder review gate

Sample 5 tasks uniformly at random across all pillars. Show via
`AskUserQuestion`:

> "Synth-data preview for `<entity>`. 5 of <N> generated tasks below.
> Pillar mix: P1=<n1>, P2=<n2>, P3=<n3>, P4=<n4>. Difficulty: easy=<e>
> medium=<m> hard=<h>. Accept and proceed to Phase C? [Yes / Show 5
> more / Reject and regenerate / Abort]"

- **Yes:** all `pending_review` rows in `ops.evolve_extractions` flip
  to `founder_accepted`. Proceed to Step 5.
- **Show 5 more:** sample a fresh 5; repeat the prompt. Max 3 rounds
  before automatically asking Reject/Abort.
- **Reject and regenerate:** rollback (DELETE the just-inserted
  extraction rows). Re-run from Step 1 with adjusted gen_sources OR a
  new gen_count, your choice via follow-up AskUserQuestion.
- **Abort:** rollback + emit `ritsu.evolve.skillopt-genata-aborted`
  event. skillopt-runner halts the entire run.

Founder time ~3 minutes. Becomes ritualized after 3-5 runs.

In `dry_run` mode, the founder gate is bypassed (auto-accept).

### Step 5 — Write outputs

- Write `dataset.jsonl` and `source-manifest.json` to
  `runtime/skillopt/<entity>/data/v<ts>/`. Update `latest/` symlink.
- INSERT `ops.evolve_extractions` rows (already done with
  `pending_review` in Step 2 if Pillars 2-4; Pillar 1 rows are
  `auto_accepted` on insert). UPDATE pending rows to
  `founder_accepted` if gate passed.
- Emit STDOUT JSON for skillopt-runner:

```json
{
  "dataset_path":       "runtime/skillopt/<entity>/data/v<ts>/dataset.jsonl",
  "manifest_path":      "runtime/skillopt/<entity>/data/v<ts>/source-manifest.json",
  "task_count":         <int>,
  "pillar_mix":         { "1": <n1>, "2": <n2>, "3": <n3>, "4": <n4> },
  "difficulty_mix":     { "1": <e>,  "2": <m>,  "3": <h> },
  "founder_gate":       "accepted" | "skipped_dry_run" | "regenerated_<n>_times",
  "extraction_run_ids": ["<uuid>", ...]
}
```

## Cache hit logic

If `regen_data == false` (default) and a `latest/source-manifest.json`
exists for this entity:
- Read its `skill_hash` field.
- Compute SHA-256 of current `entity_content`.
- If equal → reuse the cached dataset, skip Steps 1-5, emit STDOUT with
  `cached: true` flag.
- If different → SKILL has changed; force regen.

If `regen_data == true`, always run Steps 1-5 and bump version timestamp.

## Compose with

- `eval-evo/skillopt-runner` (Sprint 3 — the orchestrator that invokes
  this skill at Phase B)
- `eval-evo/skillopt-judge` (Sprint 2 — grades rollouts produced from
  the dataset)
- `eval-evo/review-extractions` (existing — founder review queue for
  pending_review rows if they pile up across runs)

## Cost model

Per-run cost budget ~$0.10-0.20 depending on pillar mix:
- Pillar 1 extraction: ~$0.02 (Haiku, small examples)
- Pillar 2 distillation: ~$0.05 (Haiku, ~50 row summaries)
- Pillar 3 wiki RAG + distillation: ~$0.05 (Sonnet, 20 chunks)
- Pillar 4 (opt-in): +$0.005 (gbrain query) + $0.05 (Sonnet distillation)
- Pillar 5: $0 (deterministic file read)
- Founder gate: $0 (AskUserQuestion, no LLM)
- Citation spine writes: $0 (DB insert)

Logged to `ops.cost_attributions` under `eval-evo-orchestrator` role.

## Reference

- Spec: `wiki/capabilities/evolve/spec.md` §19.5 (after Phase 8 promotion;
  current draft `.archives/cla/evolve-extend-skillopt/spec.md`)
- Brainstorm: `.archives/brainstorming/skillopt-integration-2026-05-27/04-synthetic-data-grounding.md`
- Companion skills: `skillopt-judge`, `skillopt-runner`, `review-extractions`
- Citation spine schema: `ops.evolve_extractions` (migration 00040, capability `update` v1.0)
