# Capability Spec: book-to-capability (`/forge`)

**State:** operating (v0.1.0, 2026-06-01) | **Pillar:** 06-ai-ops | **Role:** gps | **HITL:** routed (A/B/C)
**Build decision:** `ops.decisions[721170f0-1e49-4bed-8d00-ab512be9b95c]` (founder override of defer `f4724da4`)
**ops.capability_runs:** 487d0d1c | **Promoted from** `.archives/cla/book-to-capability/spec.md` at Phase 8.

> This is the PROMOTE step in "accumulate everything, activate selectively": `/wiki sync` accumulates
> whole books into latent wiki; `/forge` ACTIVATES the right slice into a runnable skill — need-driven,
> citation-disciplined, and **biased to say no**. A thin orchestrator that GATES then ROUTES,
> delegating every build (deepask precedent: zero own routing).

## 1. Problem

ritsu-works can **accumulate** knowledge (`/wiki sync`) and **build/refresh** capabilities (`/cla`, `/update` — both speak `--refs=wiki:`), but lacked the **decision-and-routing layer** between: *should* a slice of latent knowledge become a runnable capability, and if so *which* builder? Absent that, two failure modes: knowledge dies latent, or every framework becomes a skill (sprawl). `/forge`'s center of gravity is the **anti-over-build funnel + the route decision**; the building itself is delegated.

## 2. Architecture — Option B-lean (@cto-validated)

Standalone `/forge` sits **above** `/cla` and `/update` (mirroring deepask-over-resolver-plan) and routes **to** them. Founder-only. v1 output = **skills only**.

**Locked invariants:**
1. **Net-new = pure delegation** into `/cla propose --refs=wiki:` — `/forge` adds only the funnel + route *in front*; `/cla` owns the ceremony unchanged. **Never a fork.**
2. **Role = `gps`** (no new role; the router-not-worker role).
3. **No new table** — reuse `ops.evolve_extractions` (citations) + `ops.entity_edit_locks` (lock) + `ops.agent_runs.output_payload` (funnel verdict sink) + `ops.v_forge_lineage` (view).
4. **Funnel verdict sink = `agent_runs.output_payload`, NOT `ops.decisions`** (gps cannot write `ops.decisions`; a per-run verdict is telemetry). Only the one-time Tier-C build decision lives in `ops.decisions`.
5. **`/forge` acquires ZERO `ops.entity_edit_locks`** — the spawned `/update`//`/cla` owns the lock (same-key double-acquire would self-deadlock).

## 3. The 5-gate selection funnel (default REJECT)

| # | Gate | PASS condition | Reuses |
|---|---|---|---|
| 1 | Entity + confidence | distill yields ≥1 citation-backed change, conf ≥0.6 → `ops.evolve_extractions` | `eval-evo/distill-from-refs` |
| 2 | Founder review | the 0.6–0.85 confidence bucket reviewed | `eval-evo/review-extractions` |
| 3 | Repeated-decision | the need is **recurring**, not one-off (one-off → REJECT, use `wiki_ask`) | `thinking-toolkit/so-what-test` |
| 4 | DEEP-pillar + stage | target pillar is `deep`/`lite`, not `skeleton`/placeholder | manifest `stage_status` |
| 5 | So-what + gap + executable | real gap (`resolver_find`) AND **executable** skill, not **philosophy** (a "should" → Tier-1 doc PR via `/update tier1-file`, not a skill) | so-what + mece + resolver_find |

Borderline → REJECT. Most candidates correctly end here (the 2026-06-01 reserve-walk: ~90% of 64 ideas → non-skill dispositions).

## 4. The route classifier (the 5×-cost risk surface)

After a funnel PASS, `forge/route-classifier` calls `resolver_find` (kind=skill) → the deterministic `scripts/forge/route-classify.cjs` → `extend:<entity>` | `net-new` | `surface`. A mis-route sends a cheap Tier-B `/update` down the Tier-C `/cla` path (silent 5× cost), so the decision is deterministic, unit-tested, and **never auto-picks an ambiguous target** (a true score-tie surfaces). Mandatory `--dry-run` (`scripts/forge/dry-run-preview.cjs`) prints sources + gate verdicts + route + est cost/tier before any spend.

## 5. Components (shipped)

| Component | Path | Sprint |
|---|---|---|
| orchestrator / selection-funnel / route-classifier skills | `06-ai-ops/skills/forge/*` | S1 (#173) |
| route classifier + dry-run preview (43 tests) | `scripts/forge/{route-classify,dry-run-preview}.cjs`, `tests/forge/*` | S1 (#173) |
| runtime contract | `06-ai-ops/sops/SOP-AIOPS-006-forge-runtime-contract/` | S1 (#173) |
| `/forge` command | `.claude/commands/forge.md` | S2 |
| provenance view | `supabase/migrations/00046_v_forge_lineage.sql` (`ops.v_forge_lineage`) | S2 |
| gps `forge-*` task_kinds + validator row | `governance/ROLES.md`, `scripts/cross-tier/validate-roles-task-kind-caps-units.cjs` | S2 |
| 4 KPIs | `knowledge/kpi-registry.yaml` + `kpi-ownership.yaml` | S2 |

## 6. KPIs (acceptance)
- `forge.citation_coverage` — target 100% (every promotion traces to a wiki chunk).
- `forge.gate_rejection_rate` — > 0, target ~0.5 (the funnel is load-bearing; low = rubber-stamp).
- `forge.new_vs_extend_ratio` — lower = healthier (reuse over sprawl).
- `forge.post_install_score_delta` — ≥ 0 (K4 ratchet via the `/update` delegate).

## 7. HITL
dry-run / funnel / classify = **A**. EXTEND execution = **B** (a `/update` run). NET-NEW execution = **C** (a `/cla` run). Gate-2 review + a `surface` result are founder checkpoints. Funnel default = REJECT (founder may override).

## 8. Honest demand note
The Phase-5 reserve-walk + a full 2026-06-01 funnel pass over 64 ideas found only **~3–6 recurring-skill candidates** (a one-time backlog, not ≥4/month). Sprint 2 was built on **founder conviction** about forward sync cadence, **overriding** the data-based hold (`f4724da4`). v1.1 should re-tune the KPIs + the entry economics on real `/forge` usage. The funnel exists precisely to prevent over-building — and it flagged `/forge` itself.

## 9. v1.1 deferrals
SOP / Tier-1-doc as a first-class output type · pillar-orchestrator invocation (currently founder-only) · hook output · `/forge history` subcommand over `v_forge_lineage`.
