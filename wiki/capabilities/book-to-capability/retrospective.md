# Retrospective: book-to-capability (`/forge`) v0.1.0

**Phase 8 promotion** | **2026-06-01** | **State:** operating

> An unusually honest arc: this capability was *deferred on data*, then *built on founder conviction* — twice overriding its own anti-over-build verdict. Documented plainly so a future operator (or a colder-month founder) can read the real story.

## The arc (one CLA run, one day)
1. `/cla propose` → Phases 0–5. @cto overturned 2 of the proposer's leans (bind to `gps` not a new role; no new table). Option **B-lean** selected.
2. **Phase 5:** @cto found 3 schema landmines (gps can't write `ops.decisions`; `evolve_extractions` links via `agent_run_id`; validator fails closed) — all designed out. Then a Muse panel (**1/5 GO**) + a live `ops.knowledge_pages` reserve-walk showed the 6–12/mo volume was aspirational → **decision: DEFER** (`ops.decisions f4724da4`).
3. Founder asked "why not build?", then **OVERRODE to build** on forward-cadence conviction → `ops.decisions 721170f0` (supersedes the defer).
4. **Sprint 1** (funnel-as-code) built + tested (43 cases) + **merged** (#173).
5. On `/cla resume`, founder chose **hold Sprint 2 + gather data**. A full funnel pass over all 64 `idea` pages confirmed only **~3–6 recurring-skill candidates** (~90% correctly rejected) — gate NOT met as a monthly rate.
6. Founder chose "forge the ~3–6 by hand" — then **overrode again** ("xong luôn") → **Sprint 2 built** (this PR), Phase-8 promoted to operating.

## What went well
- **CLA worked as a truth-finder, not a build-stamp.** It twice produced "build less" (defer; then the reserve-walk) — the discipline functioning exactly as designed, even against the proposer's and (initially) the founder's lean.
- **Outside voices were load-bearing.** @cto's reviews removed a Sprint-1 runtime landmine (gps→`ops.decisions` role-deny) and a self-deadlock (double lock-acquire). The Muse panel + reserve-walk produced the demand evidence.
- **Lean architecture held.** Zero new tables, no new role, ~75% reuse. The only novel code is the funnel + the classifier (the risk surface), which got a dedicated test suite.
- **The 5-phase test discipline caught a real bug** (exact-tie auto-pick at margin 0) — fixed the implementation, not the test.

## What was uncomfortable (and worth recording)
- **Demand was never proven.** Built on conviction, against the data. The `reassess_gate_outcome` in the registry says so plainly. If `/forge` sits idle, this retro is why — and `forge.gate_rejection_rate` / usage will tell.
- **`/forge` failed its own funnel** (gate-3 recurring, gate-5 executable) at pre-PMF. Shipping it anyway is a deliberate bet on the *forward* corpus, not the current one.

## Reusable patterns (boilerplate-candidates)
- **0-LOC reserve-walk before building meta-tooling:** query the store the tool harvests, count real candidates against the tool's own gates. Cheapest demand test. → CLA Phase-3 candidate step.
- **Apply a gating capability's own gate to itself** as a Phase-5 sanity check.
- **No-new-table provenance:** verdict → `agent_runs.output_payload`; lineage = a view mirroring `v_entity_update_lineage`. Reusable for future thin orchestrators.

## Lessons for the next CLA run
1. **Pull the volume/demand probe to Phase 3**, not Phase 5 — treat a founder volume estimate as a hypothesis to test with live Tier-2 data before the Phase-4 economics.
2. **Subagents are worktree-sandboxed** — pass design content inline; they can't read root `.archives/`.
3. **Pre-PMF, bias meta-tooling to `entry_condition` stubs**; if overriding to build, record the override + a re-tune trigger (done here: v1.1 re-tunes on real usage).

## Next
v1.1 re-tune on real `/forge` usage (KPIs + entry economics); add SOP/Tier-1-doc output types, pillar-orchestrator invocation, `/forge history`. Apply migration 00046 to ritsu-ops post-merge.
