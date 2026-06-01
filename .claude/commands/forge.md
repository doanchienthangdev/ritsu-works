---
name: forge
description: Promote a slice of latent wiki knowledge into a runnable skill — need-driven + citation-disciplined. GATES (5-gate anti-over-build funnel, default REJECT) then ROUTES (extend → /update | net-new → pure delegation into /cla propose), delegating every build. Thin orchestrator ABOVE /cla + /update (deepask precedent, zero own routing); bound to gps; holds zero entity_edit_locks. --dry-run shows route + gate verdicts + cost before any spend. Founder-only. Capability book-to-capability v0.1.
argument-hint: "\"<NEED>\" --src=wiki:<slug>[#part] [--also=wiki:...] [--target=auto|new|extend:<entity>] [--pillar=<id>] [--type=skill] [--sync-missing] [--dry-run]"
---

# /forge

> Thin orchestrator over the `forge/*` skill suite (`06-ai-ops/skills/forge/`). Owns flag
> parsing; **delegates every build** — EXTEND → `/update`, NET-NEW → `/cla propose` (a pure
> call, never a fork). The "accumulate everything, activate selectively" principle's *activate*
> half: it decides whether a slice of latent wiki knowledge should become a skill at all, and
> if so routes it. Capability spec: `wiki/capabilities/book-to-capability/spec.md`. Tier C build
> decision `ops.decisions[721170f0-1e49-4bed-8d00-ab512be9b95c]` (founder override of the
> data-based hold f4724da4 on forward-sync-cadence conviction).

## Implementation status (built per sprint-plan.md)

| Sprint | Status | Surface |
|---|---|---|
| S1 | merged (#173) | `forge/{orchestrator,selection-funnel,route-classifier}` skills + `scripts/forge/{route-classify,dry-run-preview}.cjs` (43 tests) + `SOP-AIOPS-006-forge-runtime-contract` |
| **S2** | **this PR (final)** | `/forge` command (this file) + `v_forge_lineage` view (migration 00046) + gps `forge-*` task_kinds + 4 `forge.*` KPIs + Phase-8 promotion → `operating` |

> **Demand note (honest):** the Phase-5 reserve-walk + a full 2026-06-01 funnel pass over 64 ideas found only ~3–6 recurring-skill candidates (a one-time backlog, not ≥4/month). S2 was built on **founder conviction** about forward sync cadence, overriding that data. The funnel's job is to keep `/forge` from over-building — including, ironically, itself.

## Argv

| Arg | Required | Notes |
|---|---|---|
| `"<NEED>"` | yes | the need/capability you want — the funnel + classifier frame around it |
| `--src=wiki:<slug>[#part]` | yes | the **dominant** grounding source (repeatable); `#part` scopes to a chapter/concept |
| `--also=wiki:<slug>[#part]` | no | supporting sources |
| `--target=auto\|new\|extend:<entity>` | no | force a route (default `auto` → the classifier decides) |
| `--pillar=<id>` | no | target pillar hint for gate-4 (DEEP-pillar check) |
| `--type=skill` | no | v1 = **skill only** (`sop`/`tier1-doc` rejected with a pointer to v1.1) |
| `--sync-missing` | no | opt-in: `/wiki sync` a source that isn't in wiki yet (default = surface it, don't auto-sync) |
| `--dry-run` | no | print sources + gate verdicts + route + est cost/tier; **zero build spend** |

## Dispatch (the gate-then-route loop — `06-ai-ops/sops/SOP-AIOPS-006-forge-runtime-contract`)

1. **assemble** (`forge/orchestrator`) — `/wiki get` each `--src`/`--also`; a missing source is **surfaced** (not auto-synced unless `--sync-missing`).
2. **frame** — `thinking-toolkit/tosca-problem-framing` over the NEED.
3. **funnel** (`forge/selection-funnel`, **default REJECT**) — the 5 gates: entity+confidence (distill → `ops.evolve_extractions`) · founder-review of the 0.6–0.85 bucket · repeated-decision (recurring not one-off) · DEEP-pillar+stage · so-what + real gap + EXECUTABLE-not-philosophy. **REJECT** → report disposition (`latent` stays in wiki / `tier1-doc` → `/update tier1-file`). *Most candidates end here — that is the point.*
4. **classify** (`forge/route-classifier`) — `resolver_find` (kind=skill) → the deterministic `scripts/forge/route-classify.cjs` → `extend:<entity>` | `net-new` | `surface` (ambiguous → founder picks, **never auto-picked**).
5. **preview-or-route** — `--dry-run` → `scripts/forge/dry-run-preview.cjs` then STOP. Else delegate: `extend` → `/update <skill> <name> --refs=wiki:…` (Tier B); `net-new` → **pure** `/cla propose "<need>" --refs=wiki:…` (Tier C, ceremony unchanged); `surface` → wait on the founder.
6. **record** — stamp `ops.agent_runs.output_payload` (`forge_verdict`, `gates`, `route`, `entity_target`, `spawned_run_id`) → surfaced via `ops.v_forge_lineage`.

## Guards (always-on)
- **Default REJECT** funnel; founder may override a rejection.
- **wiki↔Tier1 boundary:** read the knowledge plane (wiki); write the capability plane (Tier 1) **only** via the delegate's PR.
- **Pure delegation** (net-new = a call into `/cla propose`, never a fork) + **zero locks** (`/forge` acquires no `ops.entity_edit_locks`; the delegate owns the lock — invariants #1, #5).
- **Verdict sink** = `agent_runs.output_payload` (gps can't write `ops.decisions` — invariant #4).
- **Firewall:** internal-only; never `product.*`; no customer surface.
- **Billing:** subscription in-session; cost-bucket `ai-ops-meta`, gps task-kinds `forge-orchestration`/`forge-funnel-gate`/`forge-route-classify`.

## Boundary
`/forge` sits **above** `/cla` and `/update` and routes **to** them; it does NOT re-implement creation (`/cla`) or refresh (`/update`), and it does NOT route content (that's `resolver-plan`). It is **founder-only** (bound to `gps`, the router-not-worker role). HITL: dry-run/funnel/classify = Tier A; EXTEND execution = B (a `/update` run); NET-NEW execution = C (a `/cla` run).

## KPIs
`forge.citation_coverage` (target 100%) · `forge.gate_rejection_rate` (>0 — funnel load-bearing) · `forge.new_vs_extend_ratio` · `forge.post_install_score_delta` (≥0, K4 via the `/update` delegate). See `knowledge/kpi-registry.yaml`.
