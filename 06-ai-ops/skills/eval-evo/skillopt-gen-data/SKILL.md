---
name: eval-evo/skillopt-gen-data
description: |
  Phase B of /evolve skillopt. Generates synthetic (task, expected_behavior, rubric)
  tuples from a target SKILL.md by blending up to 3 active grounding pillars
  in v1.1: P1 founder gold examples, P3 wiki RAG silver, P5 00-core anchor
  context (context-only, not task-emitting). Pillars 2 (ops.run_summaries)
  and 4 (gbrain) are DEFERRED to v1.2 — they require an enum extension to
  ops.evolve_extractions.ref_source_kind that isn't worth a Sprint 2
  migration. Writes every produced task as a citation-spine row in
  ops.evolve_extractions linked by agent_run_id FK. Surfaces 5 randomly-
  sampled tasks to the founder for accept/reject/regen decision before
  bulk generation proceeds. Output dataset cached under
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
`[1, 3, 5]` (the active pillars). Pillars 2 and 4 are deferred to v1.2
because `ops.evolve_extractions.ref_source_kind` does not yet have enum
values for `'run-summary'` (Pillar 2) or `'gbrain'` (Pillar 4). Adding
those values is a Sprint 2 follow-up migration tracked in a `TODO` at the
end of this file. Until then, explicit `--gen-sources=pillars=1,2,3,4`
or `pillars=1,3,4` raises a runtime error advising the operator.

## Outputs

1. `runtime/skillopt/<entity>/data/v<ts>/dataset.jsonl` — one task per
   line, schema below. The `latest/` symlink updates to this version.
2. `runtime/skillopt/<entity>/data/v<ts>/source-manifest.json` — manifest
   recording: pillar mix actual, skill_hash, gen_count_requested vs
   produced, founder gate decision.
3. `ops.evolve_extractions` rows — one per produced task. The table does
   NOT have `entity_type` or `entity_slug` columns; entity identity is
   recovered via the FK `agent_run_id` → `ops.agent_runs.id` →
   `agent_runs.input_payload->>'entity_type'` / `'entity_slug'`. Required
   columns the writer must populate (per `supabase/migrations/00040_evolve_extractions.sql`):
   - `agent_run_id`: this gen-data invocation's `ops.agent_runs.id`
   - `ref_path`: per-pillar source path (see §Step 2 per-pillar mapping)
   - `ref_chunk_index`: 0-indexed chunk within the source
   - `ref_source_kind`: enum `'file' | 'wiki-src' | 'wiki-query' | 'raw'`
     (per-pillar mapping below). Pillars 2 & 4 NOT supported until v1.2
     migration adds `'run-summary'` and `'gbrain'` values.
   - `raw_quote`: ≤2000-char verbatim excerpt the task was derived from
   - `proposed_change`: serialized `task.input + expected_behavior + rubric`
   - `confidence`: per-pillar (0.95 P1, 0.6 P3)
   - `llm_model`: actual model used for extraction (e.g. `claude-haiku-4-5-20251001`)
   - `review_state`: per founder-gate outcome (P1 → `'auto_accepted'`
     terminal-on-insert; P3 → `'pending_review'` then `'founder_accepted'`
     after gate)
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
- Default mix: pillars `[1, 3, 5]` (the active v1.1 set).
- Per spec §19.5 (with v1.2-deferrals noted):
  - Pillar 1: 60-80% of dataset (raised from spec's 30-40% to compensate for deferred pillars)
  - Pillar 3: 20-40% (always for skills attached to a wiki capability)
  - Pillar 5: context-only (anchor in prompts, never emits tasks)
- If `entity_content` has no `<example>` blocks (Pillar 1 unavailable),
  behavior depends on `gen_sources`:
  - `gen_sources == "auto"` OR includes `1` → abort with: "skill needs ≥1
    `<example>` block to bootstrap synth data. Auto-generate via
    `/evolve skillopt <skill>` (Phase A.1a invokes `eval-evo/gen-skill-examples`).
    Or manually add to SKILL.md."
  - `gen_sources == "pillars=3,5"` or similar (Pillar 1 explicitly excluded)
    → v1.1.2 graceful-degrade path: proceed with Pillar 3 only. Synth
    signal weaker (all rows pending_review, confidence 0.6) but founder
    explicitly opted in. Rebalance: P3 fills 80-100% of dataset; P5
    context only.

If `gen_sources == { "pillars": [...] }` includes 2 or 4, raise a runtime
error: "Pillars 2 (ops.run_summaries) and 4 (gbrain) are deferred to v1.2;
they require an enum extension to ops.evolve_extractions.ref_source_kind.
Use --gen-sources=auto for the active subset [1, 3, 5]." The check happens
before any LLM call so cost is zero.

### Step 2 — Pillar extraction

Per-pillar extraction logic (run in parallel via `Promise.all`):

**Pillar 1 (gold) — SKILL.md `<example>` blocks**
- Scan `entity_content` for `<example>...</example>` blocks (case-insensitive).
- Each example becomes 1-2 candidate tasks: input from example user-side,
  expected_behavior from example assistant-side, rubric inferred from
  what the example demonstrates as success.
- Extraction prompt to **Haiku 4.5** (cheap, structured-extraction-friendly).
- `confidence = 0.95` (founder-authored canonical examples).
- `review_state = 'auto_accepted'` (terminal-on-insert per migration trigger).
- `ref_source_kind = 'file'`; `ref_path = <SKILL.md path>`;
  `ref_chunk_index = <0-indexed example-block ordinal>`.
- `llm_model = 'claude-haiku-4-5-20251001'`.

**Pillar 3 (silver) — Wiki RAG**
- Query `mcp__supabase-ops__wiki_ask({ question: "edge cases and
  scenarios for: <skill title from SKILL.md>", source: null, limit: 20 })`.
- For each chunk returned, LLM-distill (Sonnet 4.6) into a task framing
  the chunk's content as a use-case the skill should handle.
- `confidence = 0.6` (broad domain knowledge, possibly tangential).
- `review_state = 'pending_review'` → flips to `'founder_accepted'`
  on Step 4 founder gate Accept (otherwise rolled back on Reject).
- `ref_source_kind = 'wiki-query'`; `ref_path =
  wiki:query=<truncated-question>`; `ref_chunk_index = <chunk index from wiki_ask result>`.
- `llm_model = 'claude-sonnet-4-6'`.

**Pillar 5 (anchor) — 00-core context (NO task extraction, NO DB writes)**
- Read `00-core/{brand_voice,product,principles}.md` + the skill's
  parent pillar's SOPs (e.g., `06-ai-ops/sops/SOP-AIOPS-001-*.md`).
- Concatenate ~3K-token anchor prepended to every rollout prompt as
  background context — the skill knows the voice, product, principles.
- **Pillar 5 produces ZERO task rows and ZERO ops.evolve_extractions
  inserts.** It's context-only per @cto NIT 3 (Phase 5 review).
  The anchor goes into the skillopt-runner's rollout dispatch.
- Anchor content IS included in the `skill_hash` cache key (cache
  invalidates when 00-core changes, per @cto NIT 3 from sub-PR C review).

**Pillars 2 & 4 — DEFERRED to v1.2**

Pillar 2 (`ops.run_summaries`) and Pillar 4 (gbrain READ) require enum
values `'run-summary'` and `'gbrain'` on `ops.evolve_extractions.ref_source_kind`.
Adding those is a separate Sprint 2-followup migration tracked at the end of
this file; until that ships, both pillars are runtime-rejected as documented
in Step 1. The skill body retains the explanation but defers the implementation
to v1.2 where the migration + per-pillar PII redaction (Pillar 2) + cost
attribution to gbrain bucket (Pillar 4) all land together.

### Step 3 — Mix + balance

Take per-pillar candidates produced in Step 2. Truncate each pillar to
its target % of `gen_count`. If a pillar produced more candidates than
its share, randomly sample down (with seed for reproducibility). If
Pillar 3 produced fewer than its share, redistribute the shortfall to
Pillar 1 (cap 80%). v1.2 will widen this rebalance logic when Pillars 2/4
land.

Estimate difficulty per task on a 1-3 scale: 1 if task input is
< 200 chars and behavior is single-shot; 2 if multi-step or has edge
case; 3 if requires nuanced judgment. Used by skillopt-judge for
weighting.

### Step 4 — Founder review gate

Sample 5 tasks uniformly at random across all pillars. Show via
`AskUserQuestion`:

> "Synth-data preview for `<entity>`. 5 of <N> generated tasks below.
> Pillar mix: P1=<n1>, P3=<n3>. Difficulty: easy=<e> medium=<m>
> hard=<h>. Accept and proceed to Phase C? [Yes / Show 5 more /
> Reject and regenerate / Abort]"
>
> (Pillars 2 & 4 deferred to v1.2; preview always shows P1+P3 only.)

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
- INSERT `ops.evolve_extractions` rows during Step 2:
  - Pillar 1 rows: `review_state = 'auto_accepted'` (terminal-on-insert per
    the table's review-state-machine trigger).
  - Pillar 3 rows: `review_state = 'pending_review'`.
- After founder gate at Step 4 Accept: UPDATE all `pending_review` rows
  inserted in this run (filtered by `agent_run_id = <this run's id>`) to
  `review_state = 'founder_accepted'`, set `founder_decision_at = now()`.
  On Reject: DELETE the same set (the trigger allows DELETE on any state,
  only blocks invalid UPDATE transitions).
- Emit STDOUT JSON for skillopt-runner:

```json
{
  "dataset_path":       "runtime/skillopt/<entity>/data/v<ts>/dataset.jsonl",
  "manifest_path":      "runtime/skillopt/<entity>/data/v<ts>/source-manifest.json",
  "task_count":         <int>,
  "pillar_mix":         { "1": <n1>, "3": <n3> },
  "difficulty_mix":     { "1": <e>,  "2": <m>,  "3": <h> },
  "founder_gate":       "accepted" | "skipped_dry_run" | "regenerated_<n>_times",
  "agent_run_id":       "<uuid of this gen-data run, used for citation FK>",
  "extraction_count":   <int>
}
```

## Cache hit logic

If `regen_data == false` (default) and a `latest/source-manifest.json`
exists for this entity:
- Read its `skill_hash` field. The `skill_hash` is SHA-256 of
  `entity_content || anchor_content` (Pillar 5 included; per @cto
  sub-PR C NIT — anchor updates must invalidate cache).
- Compute SHA-256 of current `(entity_content || anchor_content)`.
- If equal → reuse the cached dataset, skip Steps 1-5, emit STDOUT with
  `cached: true` flag.
- If different → SKILL or anchor has changed; force regen.

If `regen_data == true`, always run Steps 1-5 and bump version timestamp.

## Compose with

- `eval-evo/skillopt-runner` (Sprint 3 — the orchestrator that invokes
  this skill at Phase B)
- `eval-evo/skillopt-judge` (Sprint 2 — grades rollouts produced from
  the dataset)
- `eval-evo/review-extractions` (existing — founder review queue for
  pending_review rows if they pile up across runs)

## Cost model

Per-run cost budget ~$0.07-0.10 in v1.1 (Pillars 1, 3, 5 only):
- Pillar 1 extraction: ~$0.02 (Haiku 4.5, small examples, structured-extract)
- Pillar 3 wiki RAG + distillation: ~$0.05 (Sonnet 4.6, 20 chunks)
- Pillar 5: $0 (deterministic file read)
- Founder gate: $0 (AskUserQuestion, no LLM)
- Citation spine writes: $0 (DB insert)

v1.2 will add:
- Pillar 2 distillation: ~$0.05 (Haiku 4.5, ~50 row summaries + PII redaction)
- Pillar 4 (opt-in): +$0.005 (gbrain query) + ~$0.05 (Sonnet 4.6 distillation)
  Cost-bucket `gbrain.eval-evo-orchestrator.search` for the gbrain query.

Logged to `ops.cost_attributions` under `eval-evo-orchestrator` role.

## TODO — Sprint 2 follow-up: Pillars 2 & 4 enum extension

Pillars 2 (ops.run_summaries) and 4 (gbrain READ) are deferred because they
require a migration extending the `ops.evolve_extractions.ref_source_kind`
CHECK constraint enum from `{'file', 'wiki-src', 'wiki-query', 'raw'}` to
include `'run-summary'` and `'gbrain'`. The follow-up tracked here:

- Add migration `00045_evolve_extractions_extend_ref_source_kind.sql`:
  `ALTER TABLE ops.evolve_extractions DROP CONSTRAINT evolve_extractions_ref_source_kind_check;`
  `ALTER TABLE ops.evolve_extractions ADD CONSTRAINT evolve_extractions_ref_source_kind_check CHECK (ref_source_kind IN ('file', 'wiki-src', 'wiki-query', 'raw', 'run-summary', 'gbrain'));`
- Re-enable Pillars 2 + 4 logic in this skill (already documented above,
  body retained for future activation).
- Update PII redaction discipline for Pillar 2 (reuse `pre-tool-secrets.md`
  regex set — single source of truth per R-S2-1 in sprint-plan).
- Wire gbrain cost-bucket for Pillar 4 to enforce per-role `$3/mo gbrain` cap.

Owner: founder (Tier C migration ceremony per HITL.md) OR `/cla extend evolve`
follow-up after Sprint 5 Phase 8 promotion.

## Reference

- Spec: `wiki/capabilities/evolve/spec.md` §19.5 (after Phase 8 promotion;
  current draft `.archives/cla/evolve-extend-skillopt/spec.md`)
- Schema: `supabase/migrations/00040_evolve_extractions.sql` (citation spine)
- Brainstorm: `.archives/brainstorming/skillopt-integration-2026-05-27/04-synthetic-data-grounding.md`
- Companion skills: `skillopt-judge`, `skillopt-runner`, `review-extractions`
