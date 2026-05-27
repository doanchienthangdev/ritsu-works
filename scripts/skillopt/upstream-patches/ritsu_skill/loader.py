"""Ritsu-skill JSONL dataloader for SkillOpt env adapter.

Reads `dataset.jsonl` produced by `eval-evo/skillopt-gen-data` (one JSON
object per line) and routes items into train/val/test splits.

Dataset schema (per `06-ai-ops/skills/eval-evo/skillopt-gen-data/SKILL.md`):

    { "id": "<uuid>",
      "pillar": 1 | 3 | 5,
      "input": "<task prompt>",
      "expected_behavior": "<plain-English signal of success>",
      "rubric": [{"criterion": "<verbatim>", "weight": 1}, ...],
      "source_path": "<citation>",
      "source_chunk": <int>,
      "raw_quote": "<≤500-char excerpt>",
      "confidence": 0.95 | 0.85 | 0.6,
      "difficulty": 1 | 2 | 3 }

Split assignment: gen-data does NOT pre-partition. The loader inherits
`SplitDataLoader.split_mode="ratio"` so a single dataset.jsonl is split
deterministically by seed into train/val/test at adapter.setup() time.
Trainer reads `cfg["split_ratio"]` (default "7:1:2"; v1.1 Sprint 3.5
default per spec §19.4.5).

NOTE: The current gen-data schema does not write an explicit `held_out`
field. The loader treats the test split as the held-out partition (the
trainer's Phase D val-gate runs on test_items per spec §19.6 Phase D).
A future v1.2 may add an explicit `held_out` field on each row; the
loader will then prefer it over ratio partitioning. Until then, ratio
splitting is the contract.
"""
from __future__ import annotations

import json
import os
from typing import Any

from skillopt.datasets.base import SplitDataLoader


class RitsuSkillDataLoader(SplitDataLoader):
    """JSONL dataloader for the ritsu_skill env.

    Each dataset.jsonl row is a synth-data task produced by
    `eval-evo/skillopt-gen-data`. The loader normalizes per-row fields
    so the rollout function can consume them uniformly.
    """

    def load_raw_items(self, data_path: str) -> list[dict]:
        """Load raw items from a JSON or JSONL file.

        Supports both `*.jsonl` (one JSON object per line — the gen-data
        canonical output) and `*.json` (single JSON array fallback).
        """
        path = str(data_path or "").strip()
        if not path:
            raise ValueError("ritsu_skill loader requires data_path")
        if os.path.isdir(path):
            raise ValueError(
                f"ritsu_skill loader expects a JSON/JSONL file, got dir: {path}"
            )
        with open(path, encoding="utf-8") as f:
            content = f.read().strip()
        if not content:
            return []

        # Try as a JSON array first (legacy single-file format)
        try:
            data = json.loads(content)
            if isinstance(data, list):
                return [self._normalize_row(row) for row in data]
            if isinstance(data, dict):
                nested = data.get("data") or list(data.values())
                if isinstance(nested, list):
                    return [self._normalize_row(row) for row in nested]
        except json.JSONDecodeError:
            pass

        # Otherwise treat as JSONL (the canonical gen-data output)
        items: list[dict] = []
        for line_no, line in enumerate(content.splitlines(), start=1):
            stripped = line.strip()
            if not stripped:
                continue
            try:
                row = json.loads(stripped)
            except json.JSONDecodeError as exc:
                raise ValueError(
                    f"ritsu_skill loader: malformed JSONL at "
                    f"{path}:{line_no}: {exc}"
                ) from exc
            items.append(self._normalize_row(row))
        return items

    def load_split_items(self, split_path: str) -> list[dict]:
        """Load items from one materialized split subdirectory.

        Reuses the parent's default (looks for the first *.json file in
        `split_path/`). Items written by the parent's
        `write_split_items` are JSON arrays so this works directly.
        """
        items = super().load_split_items(split_path)
        return [self._normalize_row(row) for row in items]

    @staticmethod
    def _normalize_row(row: Any) -> dict:
        """Ensure required fields exist with sensible fallbacks.

        Validates the gen-data schema is honored. Any row missing the
        bare-minimum fields raises ValueError so we fail loudly rather
        than silently producing degenerate rollouts.
        """
        if not isinstance(row, dict):
            raise ValueError(
                f"ritsu_skill row must be a dict, got {type(row).__name__}"
            )

        # Required fields. Missing → fail loudly (gen-data contract violation).
        if "input" not in row:
            raise ValueError(
                f"ritsu_skill row missing required field 'input': "
                f"{json.dumps(row)[:200]}"
            )

        normalized = dict(row)
        normalized.setdefault("id", normalized.get("id") or "")
        normalized.setdefault("expected_behavior", "")
        normalized.setdefault("rubric", [])
        normalized.setdefault("pillar", None)
        normalized.setdefault("difficulty", 1)
        normalized.setdefault("confidence", None)
        normalized.setdefault("source_path", "")
        normalized.setdefault("source_chunk", 0)
        normalized.setdefault("raw_quote", "")

        # Rubric must be a list of dicts with `criterion` strings.
        rubric = normalized["rubric"]
        if not isinstance(rubric, list):
            raise ValueError(
                f"ritsu_skill row.rubric must be a list, got "
                f"{type(rubric).__name__} (row id={normalized.get('id')!r})"
            )
        for idx, crit in enumerate(rubric):
            if not isinstance(crit, dict) or "criterion" not in crit:
                raise ValueError(
                    f"ritsu_skill row.rubric[{idx}] must be "
                    f"{{criterion: <str>, weight: <int>}} "
                    f"(row id={normalized.get('id')!r})"
                )

        return normalized
