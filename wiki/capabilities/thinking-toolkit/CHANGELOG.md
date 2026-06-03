# Changelog — capability `thinking-toolkit`

> Versions v1.0–v1.6 are documented in detail in the registry notes
> (`knowledge/capability-registry.yaml`, `thinking-toolkit` entry) and `spec.md`.
> This file is the forward changelog from the point it was created (v1.7).

## v1.7.0 — 2026-06-04 — `/think mckinsey` ↔ `/deepask` composition contract

**`/cla extend thinking-toolkit`** · Tier C · autonomous overnight ship (founder pre-auth).

Hardens the (already-present since v1.4) `/deepask` ↔ McKinsey-engine integration into a
first-class, validated **`composition_guards`** engine section in
`knowledge/mckinsey-workflow.yaml` — 3 disciplines:

1. **Anti-recursion (one-way layering)** — `mckinsey → deepask → /think micro-frameworks`;
   deepask never re-enters the engine. Enforced deterministically by
   `scripts/deepask/capability-gate.cjs` `RECURSION_DENYLIST` (refuses
   `thinking-toolkit/mckinsey-workflow` even at Tier-A; optional `recipient_id` →
   backward-compatible).
2. **Cost-valve** — full `/deepask` only on a knock-out-surviving, multi-source workplan
   row (`--dry-run` first; budget the resolver breaker). Heuristics before big guns.
3. **Evidence-not-decider** — deepask returns cited evidence + COMPLETE/PARTIAL; the
   synthesize→recommend judgment stays with Sell + the founder; a PARTIAL is a
   data-blocked branch (→ `ask-user`, never fabricate).

**Changed:** `mckinsey-workflow.yaml` (1.6.0 → 1.7.0) + schema + validator
(`ENGINE_SECTIONS += composition_guards`) + `capability-gate.cjs` (+`RECURSION_DENYLIST`)
+ mckinsey `SKILL.md` + `deepask.md` Boundary + `deepask/execute` `SKILL.md`.
**Tests:** +5 `mckinsey-workflow`, +6 `deepask/capability-gate`. No DB table, no migration,
no new `/think` verb. Decision: `ops.decisions` slug
`thinking-toolkit-v1.7-deepask-composition-contract`. Reversibility 5/5.
