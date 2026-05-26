---
name: eval-evo/distill-from-refs
description: |
  Per-entity-type LLM extraction of structured proposed changes from raw refs
  (founder-supplied files, wiki bundles, web URLs). Emits 3-bucket confidence
  signals and INSERTs to ops.evolve_extractions as the citation spine. Invoked
  by /update orchestrator immediately after refs resolution. Bridges raw
  knowledge to entity-actionable diffs without bypassing the verify gate.
trigger: invoked-by-orchestrator-only
budget_cap_task_kind: entity-update-distill-skill   # $0.20 default (per-type cap in ROLES.md)
spec: wiki/capabilities/update/spec.md (post-Phase-8); draft .archives/cla/update/spec.md
---

# Skill: eval-evo/distill-from-refs

Reads resolved refs + the target entity content, dispatches per-type prompts
to an LLM (Haiku for `command`, Sonnet for `skill | agent | sop`), parses
structured JSON output, applies 3-bucket confidence rounding, INSERTs every
extraction to `ops.evolve_extractions`.

The citation spine is the contract: every downstream `proposed_change` must
trace back to a `raw_quote` + `ref_path:ref_chunk_index`. Nothing the LLM
produces is consumed by `propose-improvement` unless it has a row here.

## Contract

### Input (from orchestrator)
```json
{
  "run_id": "<uuid>",
  "entity_type": "skill | command | agent | sop",
  "entity_path": "<resolved-file-or-dir>",
  "entity_content": "<current file body>",
  "refs": [
    { "kind": "file" | "wiki-src" | "wiki-query" | "raw",
      "path": "<resolved-path>",
      "content": "<ref body>",
      "chunk_index": <int>   // 0 if single-chunk; > 0 for multi-chunk refs
    }
  ],
  "cost_estimate_usd": <float>,    // from size-estimator
  "per_task_kind_cap_usd": <float> // from ROLES.md cost-bucket caps
}
```

### Output (JSON return to orchestrator)
```json
{
  "extractions_inserted": <int>,
  "buckets": {
    "auto_accepted": <int>,
    "pending_review": <int>,
    "rejected_low_confidence": <int>
  },
  "total_cost_usd": <float>,
  "model_used": "claude-haiku-4-5" | "claude-sonnet-4-6",
  "aborted_reason": null | "estimate_exceeds_2x_cap" | "ref_unreadable" | "<other>"
}
```

## Process

### Step 1 — Cost pre-check (R7 acceptance — Big-ref ABORT)

Before any LLM call, compare `cost_estimate_usd` (from `size-estimator.cjs`)
to `per_task_kind_cap_usd × 2`. If estimate exceeds the 2× threshold:

```
RETURN {
  extractions_inserted: 0,
  buckets: { auto_accepted: 0, pending_review: 0, rejected_low_confidence: 0 },
  total_cost_usd: 0,
  model_used: null,
  aborted_reason: 'estimate_exceeds_2x_cap'
}
```

Orchestrator surfaces this back to founder with the size estimate + the cap.
Founder may rerun with `--refs` reduced or `--force-distill` (Tier C audit
override).

### Step 2 — Pick model + prompt template per `entity_type`

| entity_type | model | prompt template | reason |
|---|---|---|---|
| `skill` | `claude-sonnet-4-6` | `prompt/skill.md` | SKILL.md structure (frontmatter + body + cases) is rich; Sonnet's JSON discipline beats Haiku at this scale |
| `command` | `claude-haiku-4-5` | `prompt/command.md` | Command markdown is simpler argv + subcommands table; Haiku is 4x cheaper |
| `agent` | `claude-sonnet-4-6` | `prompt/agent.md` | Agent prose has voice consistency dimension that needs Sonnet |
| `sop` | `claude-sonnet-4-6` | `prompt/sop.md` | flow.yaml structural change semantics require precise extraction |

Prompts live alongside this SKILL.md under `prompt/<type>.md` (created in
follow-up Sprint 2 commit or Sprint 3; v1.0 may inline if prompts < 30 lines).

### Step 3 — Construct + dispatch the distill prompt

Template (per-type variants share this skeleton):

```
prompt:
"""
You are eval-evo distill-from-refs. Your job: extract a list of
PROPOSED_CHANGES to the target entity, each grounded in a RAW_QUOTE
from one of the refs.

Target entity (current content):
---
<entity_content>
---

Refs (with chunk_index for citation):
<for each ref: ## ref[{kind} {path} chunk {chunk_index}]\n{content}>

OUTPUT FORMAT — JSON array. Each element:
{
  "raw_quote": "<verbatim text from the ref, max 2000 chars>",
  "ref_path": "<the path field of the source ref>",
  "ref_chunk_index": <int>,
  "ref_source_kind": "file" | "wiki-src" | "wiki-query" | "raw",
  "proposed_change": "<what to change in the entity — concrete + actionable>",
  "section_target": "<frontmatter | body | step-<N> | <other>>",
  "confidence": <0.0..1.0>
}

CONFIDENCE GUIDANCE:
  >= 0.85  — high-quality extraction; direct quote + obvious actionable change
  0.60-0.85 — useful but needs founder review (ambiguous mapping)
  < 0.60   — low-quality; will be auto-rejected as noise

RULES:
1. EVERY proposed_change MUST cite a raw_quote present verbatim in the named ref chunk.
2. NEVER fabricate quotes; if no relevant ref content, return an empty array [].
3. proposed_change must be IMPLEMENTABLE — say WHICH section, WHICH lines (where possible).
4. confidence reflects YOUR certainty the change is correct; not a popularity score.
5. Prefer fewer high-quality extractions over many low-quality ones.

Output JSON array only — no preface, no explanation.
"""

settings: temp=0.2, max_tokens=4000
```

### Step 4 — Parse + 3-bucket rounding

1. Parse the JSON array. On parse failure: log + return aborted_reason
   `'parse_error'`; do NOT retry (Anthropic JSON discipline is usually
   first-try-clean; retries 2x cost without improving quality).
2. For each extraction:
   - Round `confidence` to 2 decimal places.
   - Assign `review_state`:
     - `>= 0.85` → `auto_accepted`
     - `0.6-0.85` (inclusive of 0.6, exclusive of 0.85) → `pending_review`
     - `< 0.6` → `rejected_low_confidence`
3. Truncate `raw_quote` to 2000 chars if longer (matches DB CHECK constraint).

### Step 5 — INSERT to ops.evolve_extractions

Batch INSERT via `mcp__supabase-ops__insert` table `ops.evolve_extractions`:

```json
{
  "table": "ops.evolve_extractions",
  "rows": [
    {
      "agent_run_id": "<run_id>",
      "ref_path": "...",
      "ref_chunk_index": 0,
      "ref_source_kind": "...",
      "raw_quote": "...",
      "proposed_change": "...",
      "section_target": "...",
      "confidence": 0.92,
      "llm_model": "claude-sonnet-4-6",
      "extraction_cost_usd": 0.014,
      "review_state": "auto_accepted"
    },
    ...
  ]
}
```

The DB enforces:
- review_state ∈ allowed enum (CHECK constraint)
- confidence ∈ [0, 1] (CHECK constraint)
- length(raw_quote) ≤ 2000 (CHECK constraint)
- agent_run_id FK to ops.agent_runs (ON DELETE CASCADE)

Trigger `trg_evolve_extractions_review_transition` enforces the state machine
on future UPDATEs (founder review flow). At INSERT, all 3 buckets are valid.

### Step 6 — Emit run_summary + return

Write the post-hoc run_summary to `ops.run_summaries` (~150 tokens):

> "distill-from-refs: extracted N entries from <ref_count> refs over <kb> KB
> using <model>; <auto>/<pending>/<rejected> buckets; cost $X"

Return the JSON output (Step 1 contract).

## Anti-Goodhart instructions baked in

- "EVERY proposed_change MUST cite a raw_quote" — prevents fabrication
- "NEVER fabricate quotes; if no relevant ref content, return []" — explicit refuse
- "Prefer fewer high-quality extractions over many low-quality" — counters volume-as-quality
- temp=0.2 — deterministic; same ref pair should yield same extraction set

## Cost

- Haiku per invocation: ~$0.005-0.02 (command type, 1-3 KB refs)
- Sonnet per invocation: ~$0.025-0.10 (skill/agent/sop type, 3-15 KB refs)
- Hard cap via per-task-kind cap in `governance/ROLES.md` cost-bucket
  `ai-ops-entity-update`: `entity-update-distill-{type}` budgets.

## Failure modes + recovery

| Failure | Detection | Recovery |
|---|---|---|
| Cost estimate > 2× cap | size-estimator + Step 1 | ABORT before LLM call; founder re-runs reduced |
| LLM returns non-JSON | JSON.parse in Step 4 | log + return aborted_reason='parse_error'; no retry |
| All extractions confidence < 0.6 | Step 4 bucket counts | INSERT them anyway as `rejected_low_confidence` (audit trail); return with `extractions_inserted = N, buckets.auto_accepted = 0, pending_review = 0` |
| INSERT fails (FK / RLS / CHECK) | mcp__supabase-ops__insert error | log + return aborted_reason='db_insert_error'; founder investigates RLS allowlist |
| Ref file unreadable | Step 3 ref-loading | log + return aborted_reason='ref_unreadable' with path |

## v1.0 → v1.1 evolution targets

- Per-type prompt templates as separate files (`prompt/<type>.md`) — v1.0 may
  inline if prompts stay < 30 lines per type.
- Heuristic refinement of 3-bucket thresholds based on first 30 days of
  founder-review queue data (re-calibrate if `rejected_low_confidence` >
  25% rate OR `founder_rejected` of `pending_review` > 50%).
- v1.1: gbrain WRITE per-run for cross-/update learning (currently READ-only).
