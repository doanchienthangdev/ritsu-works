# SOP-AIOPS-012 — Consequential problem-solving

> **The mandate that makes `/think mckinsey` the AI workforce's primary problem-solver.** Runtime contract: [`flow.yaml`](flow.yaml). Capability: `thinking-toolkit` v3.2.

## Why this exists

A world-class problem-solving engine on the shelf is not a "primary solver." It becomes one only when the company's operating reflexes route the right problems to it. This SOP is that reflex, written down.

## The rule in one line

**Every consequential or strategic problem is TRIAGED first; the hardest ones (consequential + ambiguous + multi-source) run the full McKinsey 4S engine, whose study becomes the decision record — so the recommendation is data-grounded and disconfirmed before it is acted on.**

## The flow (see `flow.yaml`)

1. **Triage** (`/think triage`) — route the problem to its weight: ① direct · ② `/deepask` · ③ a single `/think` atom · ④ `/think mckinsey`. *Mandatory; never silent.*
2. **Study** (route ④ only) — run `/think mckinsey`; the engine's own `decision_gates` pick the 4S path; pull real data; the `--before-sell` gate (auto-run by `pre-write-mckinsey-gate`) must clear.
3. **Decision record** — the `.archives/mckinsey/<slug>/` run-folder IS the auditable reasoning; linked to `ops.decisions`.
4. **Gate before act** — act only after the gate is clear AND the decision's own HITL tier (C/D) ceremony per `governance/HITL.md`.

## The two guardrails (so "primary" ≠ "always heavyweight")

- **Anti-over-application** — the full engine is reserved for the 3-condition gate. Triage is mandatory; mckinsey is not. Most problems route to ①/②/③. (Running the big gun on a 10-minute question is the *anxious-parade-of-knowledge* anti-pattern.)
- **Thinking, not deciding** — the study informs; the engine + founder decide. A beautifully-run study does not make a wrong call right.

## Who runs it

The invoking persona / orchestrator — **@ceo** (the founder's routing interface) on Tier-3/4 strategic requests; **@cgo / @cpo** on strategic wedge / funnel / build-no-build decisions. They carry the triage reflex in their output contracts (`.claude/agents/{ceo,cgo,cpo}.md`).

## Triggers

Tier-C/D decision framing · weekly product/GTM/customer review questions · founder strategic questions · `/cla` problem-framing on consequential capabilities · pillar-orchestrator strategic decisions. (Full list in `flow.yaml` `triggers`.)
