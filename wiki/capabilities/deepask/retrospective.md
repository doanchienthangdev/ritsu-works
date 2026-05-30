# Retrospective: deepask v1.0

**Phase:** 8 · **State transition:** `implementing → deployed → operating`
**Capability ID:** deepask · **Pillar:** 06-ai-ops · **Generated:** 2026-05-30
**CLA run:** `46bec9c9-a094-4979-a62f-614943e64c6a`
**Tier C decision:** `ops.decisions[861f8eb4-6572-4df5-b1cc-44aac0a7b014]` (slug `deepask-architecture-option-b`)
**Dependency:** `resolver-plan` (operating) — consumed as the sole router.

---

## What deepask is

`/deepask "<q>" [--format][--sources][--depth][--dry-run]` — a **zero-routing** federated
synthesizer: decompose → resolve (via `resolver-plan`) → execute (read content + run Tier-A
capabilities, surface Tier-B+, delegate the web leg to `deep-research`) → synthesize (Pyramid,
100% cited, authority-ranked, conflict-aware, freshness-tagged) → completeness-critic
(COMPLETE | PARTIAL-with-honest-gaps) → Format Engine (12 formats + smartauto) → observability.

## Sprints (Option B — risk-first)

| Sprint | PR | What landed |
|---|---|---|
| S1 | #165 | command + orchestrator (**resolver-budget accountant**) + decompose + execute(read-only) + **migration 00045** (`ops.deepask_runs`/`coverage`) |
| S2 | #166 | synthesize + completeness-critic + **citation-audit** guardrail (zero uncited) |
| S3 | #167 | execute capability-RUN leg + **capability-gate** (auto/surface/refuse) + deep-research delegation → full loop |
| S4 | #168 | Format Engine umbrella + dispatch table (doc family) + **format-select** smartauto |
| S5 | #169 | visual adapters (all 12 formats) + **artifact-path** helper |
| S6 | (this) | 3 KPIs + SOP-AIOPS-005 + cost-bucket + Phase-8 promotion → `operating` |

## Estimated vs actual

| Metric | Estimated | Actual | Delta |
|---|---|---|---|
| Migrations | 1 | 1 (00045, applied) | on plan |
| Net-new tested helpers | ~3-5 | 5 (.cjs) + 116 tests | on plan |
| Skills + command | 5 core + 12 adapters + cmd | 6 skills (umbrella format) + cmd | fewer files (umbrella) |
| Sprints | 6 | 6 | on plan |
| New external dep/secret/role/HITL tier | 0 | **0** | on plan |
| Reversibility | 4/5 | 4/5 | on plan |

## What went well

- **Risk-first sequencing earned its keep.** @cto's Phase-2 finding (resolver `SESSION_HARD_CAP=20` is shared session-wide) reshaped the build: the breaker-budget accountant was gated in S1 and the full breaker-safe loop was proven by S3 — before any format-engine labor.
- **The three hardest correctness guarantees are deterministic + tested**, not prompt-hope: breaker budgeting (S1), citation discipline / zero-uncited (S2), read-vs-run governance (S3). Each is a pure function with an exhaustive suite.
- **0 new full-suite failures** across all 6 sprints (21 pre-existing, verified vs parent each time).

## What was harder / surprises

- The resolver INDEX token budget (~14k/15k hard cap) made 12 per-format adapter recipients infeasible → drove the umbrella decision (below). A real architectural constraint that only surfaced at S4.
- The full vitest suite's git-checkout-restore behaviour makes its total-count fluctuate; the **failed-count vs baseline** (always 21) is the reliable signal, not the total.

## Deviations (reconciled at Phase 8)

- **Format Engine structure (DEVIATION from spec §4.1):** approved spec drafted **12 per-format adapter folders**; implemented as **one `deepask/format` umbrella skill + dispatch table** to stay under the INDEX hard-cap and for maintainability. **Outcome identical** (all 12 formats, reuse, IR, smartauto; extensible: new format = new dispatch row + `format-select` availability entry). **Accepted as the operating structure.**

## Boilerplate-extractable patterns

- **"Risk-first CLA sprint sequence"** — gate the @cto-identified highest risk in Sprint 1; prove the core loop before breadth. Reusable sequencing heuristic.
- **"Deterministic-helper-per-sprint"** — each sprint ships one pure `.cjs` encoding the sprint's critical decision (budget/citation/gate/format-select/slug) + an All-Edge-Cases suite. Keeps a markdown-skill capability genuinely testable.

## Trigger interfaces deployed

| Trigger | Type | Path |
|---|---|---|
| `/deepask "<q>"` | slash command | `.claude/commands/deepask.md` |
| (runtime contract) | SOP | `06-ai-ops/sops/SOP-AIOPS-005-deepask-runtime-contract/flow.yaml` |

## KPI baselines (first 7 days operating)

To be populated by `metrics-curator`: `deepask.complete_verdict_rate` · `deepask.uncited_claim_rate` (target **0**) · `deepask.breaker_trip_rate`. Substrate `ops.deepask_runs`/`coverage` is live (migration 00045).

## Promotion confirmed

- [x] `spec.md` promoted → `wiki/capabilities/deepask/spec.md`
- [x] `retrospective.md` promoted → `wiki/capabilities/deepask/retrospective.md`
- [x] `capability-registry.yaml` updated (state → operating, actuals)
- [x] `wiki/capabilities/CATALOG.md` index updated
- [x] Final `pnpm check` clean
- [x] State advanced to `operating`

## Future work / open questions

- First live `/deepask` run on a hard cross-pillar question (e.g. "100-paying-who-love, what's blocking it across product/GTM/customer") — validate end-to-end + seed `ops.deepask_runs`.
- Skill-level integration tests for the orchestration prose (deterministic helpers already tested).
- Future `/evolve` target: mine `(question → ResolverPlan → coverage → correction)` to improve decomposition + plans.
- If the INDEX token budget is raised, splitting `deepask/format` into per-format recipients remains a clean refinement.
