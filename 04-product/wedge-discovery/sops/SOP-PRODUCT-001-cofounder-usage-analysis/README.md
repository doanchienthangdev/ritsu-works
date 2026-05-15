# SOP-PRODUCT-001 — Cofounder Usage Analysis

> **Status:** v1.0.0 (filled in 2026-05-15 as part of workforce Phase 1.5 hardening — `flow.yaml` was previously a skeleton)
> **Pillar:** product · `wedge-discovery` sub-pillar
> **Owner role:** product-orchestrator (CPO persona façade)
> **HITL tier:** A (analysis only; ACTING on the recommendation may bump tier)

## Purpose

Extract wedge-validation signal from the N=2 cofounders' (founder + cofounder per `governance/ROLES.md`) actual usage of Ritsu. Cofounders are the smallest-possible user study — **N=2 before the strangers N=10 gate (`SOP-PRODUCT-002`).**

CPO uses this SOP to surface hypotheses, then escalates to `SOP-PRODUCT-002` for stranger observation if signal is strong.

## Critical caveat (encoded in `wedge_signal_strength` output)

**N=2 cofounders ≠ validation.** Cofounders are biased operators — they love features that don't survive contact with real users. This SOP outputs HYPOTHESES, not conclusions. If cofounders love feature X but no stranger touches it, the wedge is wrong.

CPO is responsible for restating this caveat every time the founder reads the output. Per CPO voice profile (user-observed-evidence-first): name the cofounder, name the metric, never speculate.

## Trigger

Manual. Invoked by:
- `/cpo` weekly product session (per CPO playbook Pattern 1 — wedge discovery sprint).
- `@cpo "cofounder usage analysis for [date range]"` (bounded subagent).
- Future: cron-driven weekly snapshot (Phase 2+ when 03-gtm needs cadenced wedge readout).

## Inputs

| Field | Required | Type | Description |
|---|---|---|---|
| `cohort_start_date` | ✓ | ISO date | Start of usage window |
| `cohort_end_date` | ✓ | ISO date | End of usage window. Recommended: 14d windows |
| `hypothesis` | optional | string | Pre-registered hypothesis. If provided, SOP grades evidence. If not, open-ended observation |

## Outputs

| Field | Type | Description |
|---|---|---|
| `named_observations` | array | Each item cites cofounder_id + activity_kind + count + session_ref. Never aggregate-only |
| `hypothesis_grade` | string | When `hypothesis` provided: `supported` / `contradicted` / `inconclusive-need-more-data`. Else `n/a` |
| `wedge_signal_strength` | string | `strong` / `weak` / `noise`. Drives CPO's escalation decision |
| `next_action_recommendation` | string | `escalate-to-SOP-PRODUCT-002` / `iterate-on-feature` / `drop-feature` / `observe-larger-window` |

## Steps (high-level)

1. **`fetch_cofounder_events`** — read `ops.events` for cofounder user IDs in cohort window. Group by activity_kind.
2. **`fetch_session_excerpts`** — for top-3 activities, pull 2 latest transcripts from `ops-transcripts` storage bucket (Tier 3).
3. **`synthesize_observations`** — claude-haiku-4-5 produces `named_observations` array with citations. System prompt enforces no speculation.
4. **`grade_hypothesis_if_provided`** — claude-haiku-4-5 grades evidence against `inputs.hypothesis` if present.
5. **`write_analysis_row`** — insert into `ops.tasks` with task_type=`sop-PRODUCT-001-output` + run_id reference.
6. **`surface_to_cpo`** — append one-liner to `06-ai-ops/workforce-personas/cpo/dossier.md`.

Full step spec in `flow.yaml`. Cost ceiling per run: $0.25.

## How CPO uses the output

| Output signal | CPO next action |
|---|---|
| `wedge_signal_strength: strong` + `next_action: escalate-to-SOP-PRODUCT-002` | Plan stranger recruitment per SOP-PRODUCT-002. Budget ~$50-200 in participant recruitment. Tier C founder approval required. |
| `wedge_signal_strength: weak` + `next_action: observe-larger-window` | Re-run this SOP with `cohort_*_date` extended by 14d. Tier A. |
| `wedge_signal_strength: weak` + `next_action: iterate-on-feature` | Draft PRD (Pattern 3) for the smallest iteration. Surface to founder for build approval (Tier C). |
| `wedge_signal_strength: noise` + `next_action: drop-feature` | Move feature to TODOS.md drop list with the evidence. Surface to founder for confirmation. |
| `hypothesis_grade: contradicted` | Wedge-conflict signal. Per CPO playbook Pattern 8, escalate to CEO Tier 4. |

## How to run (Phase 1 manual mode)

Until the SOP engine runtime is implemented (per `_build/ROADMAP.md` Phase C), this SOP runs manually:

1. Founder invokes `@cpo "run cofounder-usage-analysis for cohort 2026-05-01 to 2026-05-15 with hypothesis: 'cofounders prefer flashcard activity over quiz'"`
2. CPO subagent executes steps 1-4 inline (read events, fetch excerpts, synthesize, grade).
3. CPO surfaces named_observations + grade + signal_strength + recommendation in single message.
4. Founder reviews + approves the recommended next action.
5. If approved, CPO writes to `ops.tasks` (step 5) and dossier (step 6).

Once the SOP runtime engine ships, the same steps run automatically when triggered via slash/mention.

## Validation

The `flow.yaml` validates against `06-ai-ops/sop-engine/SOP-AIOPS-003-sop-runtime-contract/flow-schema.yaml`. To re-validate after edits, run the SOP-AIOPS-004 smoke test (when wired into `pnpm check`).

## References

- CPO persona spec: `06-ai-ops/workforce-personas/cpo/{PERSONA,playbook,routing-matrix}.md`
- Downstream SOP: `04-product/wedge-discovery/sops/SOP-PRODUCT-002-stranger-recruit-and-watch/`
- SOP runtime contract: `06-ai-ops/sop-engine/SOP-AIOPS-003-sop-runtime-contract/README.md`
- HITL policy: `governance/HITL.md`
- Architecture context: `.archives/workforces/01-workforce-roster.md` (CPO persona summary), `.archives/workforces/00-architecture-decisions/ADR-006-cpo-not-pm-and-coo-rescope.md`
