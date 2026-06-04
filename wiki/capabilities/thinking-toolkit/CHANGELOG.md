# Changelog — capability `thinking-toolkit`

> Versions v1.0–v1.6 are documented in detail in the registry notes
> (`knowledge/capability-registry.yaml`, `thinking-toolkit` entry) and `spec.md`.
> This file is the forward changelog from the point it was created (v1.7).

## v1.8.0 — 2026-06-04 — the `/think mckinsey` HITL hard-gate

**`/cla extend thinking-toolkit`** · Tier C · @cto review APPROVE-WITH-NITS (3 must-fix integrated) · founder approve gate.

**Why:** founder ran `/think mckinsey` on a real problem and reported it *"không dừng lại tương tác từng bước; output không thể hiện rõ quá trình chạy."* The engine *described* HITL (`hitl_triggers`) but nothing **forced** a real `AskUserQuestion`, and the only mechanical gate (`mckinsey-run.cjs check`) validated artifact STRUCTURE only — a `ask-user (founder)` provenance row passed identically to a real pulled datum. In the run, the load-bearing porpoise (*"25 accounts = founder's own test emails; power-user = the founder"*) was lifted from a degree-3 `"likely internal"` inference to an asserted fact with no confirmation checkpoint.

**What changed — `ask-user` becomes a verifiable RECEIPT, not an honor-system label.** Every `analysis-log` datum with `/ask-user/i` provenance MUST carry a `[H<n>]` tag resolving to a row in a NEW `hitl-log.md` artifact (the question asked + the founder's verbatim one-line answer). No receipt → the gate fails; the honest no-ask path is provenance `assumption` (degree ≥6 + sensitivity note). **Discipline, not proof:** the gate can't see the conversation, so it can't *prove* the ask fired — it makes *skipping* it a failure + leaves an auditable trail (a true runtime force needs a harness hook; deferred).

**Changed:** `mckinsey-workflow.yaml` (1.7.0 → 1.8.0; +`hitl-log` artifact + `state`/`solve` produces + `hitl_triggers` `gate:` notes) + schema (`produces` enum += `hitl-log`) + `validate-mckinsey-workflow.cjs` (`ARTIFACTS` += `hitl-log`, set-equal to run-helper) + `mckinsey-run.cjs` (`ARTIFACTS` + `TEMPLATES['hitl-log.md']` + a one-way reconciliation gate in `checkRun`; anchored `/^H\d+$/` on `isDataRow` rows so the pristine `<H1>` template can't sneak in; provenance read via decoy-proof `colIndex`) + mckinsey `SKILL.md` (HITL prose → hard contract + honest framing).
**Tests:** +12 `mckinsey-run` (the `HITL receipt gate (v1.8)` describe), +1 `mckinsey-workflow`. No DB table, no migration, no new `/think` verb. Decision: `ops.decisions` slug `thinking-toolkit-v1.8-hitl-hard-gate`. Reversibility 5/5 (backward-compatible — runs with no `ask-user` rows are unaffected).

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
