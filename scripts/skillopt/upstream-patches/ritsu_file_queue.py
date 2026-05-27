"""SkillOpt backend that routes LLM calls through a JSON file queue.

Added by ritsu-works /evolve v1.1 (capability_id: evolve, supersedes 1.0.0).
See .archives/cla/evolve-extend-skillopt/spec.md (promoted to
wiki/capabilities/evolve/spec.md at Phase 8) §19 for design rationale.

This file is patched in by scripts/skillopt/install-vendor.sh into the
SkillOpt vendor directory at vendor/skillopt/skillopt/model/ritsu_file_queue.py.
It lives in OUR repo (scripts/skillopt/upstream-patches/) so the SHA-pinned
submodule remains a clean read of microsoft/SkillOpt upstream. See
scripts/skillopt/UPSTREAM-DEVIATION.md for the full patch contract.

Subscription invariant: this file MUST NOT make any HTTP calls. It only
writes JSON request files and reads JSON response files. The session bridge
(scripts/skillopt/session-bridge.cjs, Sprint 1 sub-PR C) reads requests,
dispatches via session subagents using Claude Code subscription billing,
and writes responses back to the queue.
"""
from __future__ import annotations

import json
import os
import time
import uuid
from pathlib import Path
from typing import Any

from .common import TokenTracker, tracker as _global_tracker

_local_tracker = TokenTracker()

# ── Queue protocol ───────────────────────────────────────────────────────────

QUEUE_DIR_ENV = "SKILLOPT_FILE_QUEUE_DIR"
TIMEOUT_ENV = "SKILLOPT_FILE_QUEUE_TIMEOUT_S"
POLL_INTERVAL_ENV = "SKILLOPT_FILE_QUEUE_POLL_S"

DEFAULT_TIMEOUT_S = 600.0
DEFAULT_POLL_S = 0.5


def _queue_dir() -> Path:
    path = os.environ.get(QUEUE_DIR_ENV, "")
    if not path:
        raise RuntimeError(
            f"ritsu_file_queue backend requires {QUEUE_DIR_ENV} env var "
            f"pointing to a directory under which llm-requests/ and "
            f"llm-responses/ live."
        )
    base = Path(path)
    (base / "llm-requests").mkdir(parents=True, exist_ok=True)
    (base / "llm-responses").mkdir(parents=True, exist_ok=True)
    return base


def _timeout_s() -> float:
    try:
        return float(os.environ.get(TIMEOUT_ENV, str(DEFAULT_TIMEOUT_S)))
    except ValueError:
        return DEFAULT_TIMEOUT_S


def _poll_s() -> float:
    try:
        return float(os.environ.get(POLL_INTERVAL_ENV, str(DEFAULT_POLL_S)))
    except ValueError:
        return DEFAULT_POLL_S


def _enqueue_request(payload: dict[str, Any]) -> str:
    base = _queue_dir()
    req_id = uuid.uuid4().hex
    payload = dict(payload, id=req_id, ts=time.time())
    req_dir = base / "llm-requests"
    tmp = req_dir / f"req-{req_id}.json.tmp"
    final = req_dir / f"req-{req_id}.json"
    tmp.write_text(json.dumps(payload, ensure_ascii=False))
    tmp.rename(final)
    return req_id


def _await_response(req_id: str, *, timeout_s: float | None = None) -> dict[str, Any]:
    base = _queue_dir()
    deadline = time.time() + (timeout_s if timeout_s is not None else _timeout_s())
    resp_path = base / "llm-responses" / f"resp-{req_id}.json"
    poll = _poll_s()
    while time.time() < deadline:
        if resp_path.exists():
            return json.loads(resp_path.read_text())
        time.sleep(poll)
    raise TimeoutError(
        f"ritsu_file_queue: no response for req {req_id} after "
        f"{(timeout_s if timeout_s is not None else _timeout_s())}s"
    )


def _record_usage(stage: str, usage: dict[str, Any]) -> dict[str, int]:
    prompt = int(usage.get("prompt_tokens", usage.get("input_tokens", 0)) or 0)
    completion = int(
        usage.get("completion_tokens", usage.get("output_tokens", 0)) or 0
    )
    _local_tracker.record(stage, prompt, completion)
    _global_tracker.record(stage, prompt, completion)
    return {
        "prompt_tokens": prompt,
        "completion_tokens": completion,
        "total_tokens": prompt + completion,
    }


def _round_trip(
    payload: dict[str, Any],
    *,
    retries: int,
    stage: str,
    timeout: int | None,
    return_message: bool = False,
) -> tuple[Any, dict[str, int]]:
    last_err: Exception | None = None
    attempts = max(1, retries)
    for attempt in range(attempts):
        try:
            req_id = _enqueue_request({**payload, "attempt": attempt})
            resp = _await_response(req_id, timeout_s=timeout)
            if resp.get("error"):
                raise RuntimeError(f"backend response error: {resp['error']}")
            text = resp.get("text", "")
            usage = _record_usage(stage, resp.get("usage", {}))
            if return_message:
                return resp.get("message", text), usage
            return text, usage
        except Exception as exc:
            last_err = exc
            if attempt + 1 < attempts:
                time.sleep(min(2 ** attempt, 16))
    raise RuntimeError(
        f"ritsu_file_queue {stage} failed after {attempts} attempts"
    ) from last_err


# ── Backend interface called by skillopt.model.router ────────────────────────


def chat_optimizer(
    system: str,
    user: str,
    max_completion_tokens: int = 16384,
    retries: int = 5,
    stage: str = "optimizer",
    timeout: int | None = None,
) -> tuple[str, dict[str, int]]:
    return _round_trip(
        {
            "kind": "optimizer",
            "stage": stage,
            "deployment": None,
            "system": system,
            "user": user,
            "max_completion_tokens": max_completion_tokens,
            "retries": retries,
        },
        retries=retries,
        stage=stage,
        timeout=timeout,
    )


def chat_target(
    system: str,
    user: str,
    max_completion_tokens: int = 16384,
    retries: int = 5,
    stage: str = "target",
    timeout: int | None = None,
) -> tuple[str, dict[str, int]]:
    return _round_trip(
        {
            "kind": "target",
            "stage": stage,
            "deployment": None,
            "system": system,
            "user": user,
            "max_completion_tokens": max_completion_tokens,
            "retries": retries,
        },
        retries=retries,
        stage=stage,
        timeout=timeout,
    )


def chat_with_deployment(
    deployment: str,
    system: str,
    user: str,
    max_completion_tokens: int = 16384,
    retries: int = 5,
    stage: str = "custom",
    timeout: int | None = None,
) -> tuple[str, dict[str, int]]:
    return _round_trip(
        {
            "kind": "custom",
            "stage": stage,
            "deployment": deployment,
            "system": system,
            "user": user,
            "max_completion_tokens": max_completion_tokens,
            "retries": retries,
        },
        retries=retries,
        stage=stage,
        timeout=timeout,
    )


def chat_optimizer_messages(
    messages: list[dict[str, Any]],
    max_completion_tokens: int = 16384,
    retries: int = 5,
    stage: str = "optimizer",
    *,
    tools: list[dict[str, Any]] | None = None,
    tool_choice: str | dict[str, Any] | None = None,
    return_message: bool = False,
    timeout: int | None = None,
) -> tuple[Any, dict[str, int]]:
    return _round_trip(
        {
            "kind": "optimizer",
            "stage": stage,
            "deployment": None,
            "messages": messages,
            "max_completion_tokens": max_completion_tokens,
            "retries": retries,
            "tools": tools,
            "tool_choice": tool_choice,
            "return_message": return_message,
        },
        retries=retries,
        stage=stage,
        timeout=timeout,
        return_message=return_message,
    )


def chat_target_messages(
    messages: list[dict[str, Any]],
    max_completion_tokens: int = 16384,
    retries: int = 5,
    stage: str = "target",
    *,
    tools: list[dict[str, Any]] | None = None,
    tool_choice: str | dict[str, Any] | None = None,
    return_message: bool = False,
    timeout: int | None = None,
) -> tuple[Any, dict[str, int]]:
    return _round_trip(
        {
            "kind": "target",
            "stage": stage,
            "deployment": None,
            "messages": messages,
            "max_completion_tokens": max_completion_tokens,
            "retries": retries,
            "tools": tools,
            "tool_choice": tool_choice,
            "return_message": return_message,
        },
        retries=retries,
        stage=stage,
        timeout=timeout,
        return_message=return_message,
    )


def chat_messages_with_deployment(
    deployment: str,
    messages: list[dict[str, Any]],
    max_completion_tokens: int = 16384,
    retries: int = 5,
    stage: str = "custom",
    *,
    tools: list[dict[str, Any]] | None = None,
    tool_choice: str | dict[str, Any] | None = None,
    return_message: bool = False,
    timeout: int | None = None,
) -> tuple[Any, dict[str, int]]:
    return _round_trip(
        {
            "kind": "custom",
            "stage": stage,
            "deployment": deployment,
            "messages": messages,
            "max_completion_tokens": max_completion_tokens,
            "retries": retries,
            "tools": tools,
            "tool_choice": tool_choice,
            "return_message": return_message,
        },
        retries=retries,
        stage=stage,
        timeout=timeout,
        return_message=return_message,
    )


def get_token_summary() -> dict[str, dict[str, int]]:
    return _local_tracker.summary()


def reset_token_tracker() -> None:
    _local_tracker.reset()


def set_reasoning_effort(effort: str | None) -> None:
    """No-op: bridge ignores reasoning effort; subagents pick their own model."""


def set_target_deployment(deployment: str) -> None:
    """No-op: bridge selects subagent type from request kind, not deployment."""


def set_optimizer_deployment(deployment: str) -> None:
    """No-op: bridge selects subagent type from request kind, not deployment."""
