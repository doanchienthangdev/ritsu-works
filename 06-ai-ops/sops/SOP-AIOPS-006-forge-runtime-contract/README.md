# SOP-AIOPS-006 — /forge Runtime Contract

> The runtime contract for the `/forge` PROMOTE command (capability `book-to-capability` v0.1).
> Authoritative flow: [`flow.yaml`](flow.yaml). Front-ends: `.claude/commands/forge.md` (Sprint 2)
> + `06-ai-ops/skills/forge/orchestrator/SKILL.md`.
>
> Runtime-contract SOP (like SOP-AIOPS-004/005) — follows the 004/005 shape, not the
> ceremony `flow-schema.yaml` (which targets the SOP-AIOPS-001-* family).

## What this SOP governs

Every `/forge "<NEED>" --src=wiki:...` invocation runs once through the **gate-then-route loop**. `/forge` is the *activate* half of "accumulate everything, activate selectively": it decides whether a slice of latent wiki knowledge should become a runnable skill, and **delegates every build**.

1. **assemble** → `/wiki get` the dominant + supporting sources (missing → surfaced, not auto-synced).
2. **frame** → `thinking-toolkit/tosca-problem-framing` over the NEED.
3. **funnel** → the **5-gate selection funnel, default REJECT** (`forge/selection-funnel`): entity+confidence → founder-review → repeated-decision → DEEP-pillar+stage → so-what+gap+executable. **Most candidates end here — that is the point.**
4. **classify** → `forge/route-classifier`: `resolver_find` → the deterministic `scripts/forge/route-classify.cjs` → `extend` | `net-new` | `surface` (ambiguous never auto-picks).
5. **preview-or-route** → `--dry-run` prints sources + gate verdicts + route + cost/tier and **stops (zero build spend)**; else delegate — `extend` → `/update` (Tier B), `net-new` → a **pure call** into `/cla propose` (Tier C, never a fork).
6. **record** → stamp `ops.agent_runs.output_payload` (`forge_verdict`, `gates`, `route`, `spawned_run_id`) for `v_forge_lineage`.

## The 5 locked invariants (@cto-validated)

1. Net-new = **pure delegation** into `/cla propose` (never a fork).
2. Bound to **`gps`** (no new role).
3. **No new table** (reuse `evolve_extractions` + `entity_edit_locks` + `agent_runs.output_payload` + `v_forge_lineage`).
4. Funnel verdict sink = `agent_runs.output_payload` (gps can't write `ops.decisions`).
5. **`/forge` holds ZERO `entity_edit_locks`** (the delegate owns the lock; same-key double-acquire would self-deadlock).

## HITL

Tier **A** for the gate/classify/dry-run. EXTEND execution is **B** (a `/update` run); NET-NEW execution is **C** (a `/cla propose` run); a gate-2 founder review and a `surface` result are founder checkpoints. The funnel default is **REJECT** — the founder may override.

## Always-on guards
Default-REJECT funnel · wiki↔Tier1 boundary (read wiki, write Tier 1 only via the delegate PR) · pure delegation · zero locks · Product-Supabase firewall (internal-only) · subscription billing · resolver 20-find/4h breaker · `--dry-run` = no build spend.

## Tests
Deterministic core unit-tested: `tests/forge/route-classify.test.ts` (classifier — the 5x-cost mis-route surface) + `tests/forge/dry-run-preview.test.ts` (cost/tier estimate + preview). 43 cases.

## KPIs
`forge.citation_coverage` (target 100%) · `forge.gate_rejection_rate` (>0 — funnel is load-bearing) · `forge.new_vs_extend_ratio` · `forge.post_install_score_delta` (≥0, K4 via /update). Registered in `knowledge/kpi-registry.yaml` at Sprint 2.

## Status
Sprint 1 (this PR): funnel + classifier + dry-run skills + the 2 tested helpers + this SOP. Sprint 2: the `/forge` command shell + `v_forge_lineage` migration + gps `forge-*` task_kinds + the 4 KPIs + Phase-8 promotion.
