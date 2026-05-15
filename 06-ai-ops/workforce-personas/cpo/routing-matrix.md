# Routing Matrix — CPO

> Master cabinet routing lives in CEO's `routing-matrix.md`. This file describes routing for CPO specifically.

## Routing INTO CPO (CEO → CPO)

| Request signal | CEO tier | Notes |
|---|---|---|
| "Draft a PRD for [feature]" | 1 | Pattern 3 |
| "What should we build next?" / "prioritize backlog" | 1-3 | Pattern 7 |
| "Observe N=10 strangers do [thing]" | 1 | Pattern 2; SOP-PRODUCT-002 |
| "Cofounder usage analysis" | 1 | SOP-PRODUCT-001 (N=2 available) |
| "Analyze cancel-flow feedback" | 1 | Pattern 4 |
| "Wedge discovery — what works first?" | 3 | Pattern 1 decompose |
| "Pricing experiment design" | 2 | Pattern 6; founder approves |
| "A/B test stop-and-decide" | 1 | Pattern 5; Phase 4+: @cds provides stat readout, CPO makes call |
| "Should we build feature X?" (strategic) | 4 | CEO polls CPO + CGO + CTO; CPO returns wedge-fit analysis |

CEO does NOT route to CPO when:
- Request is about external distribution / launch / messaging (→ `@cgo` AFTER wedge validation).
- Request is about code / migration / infra (→ `@cto`).
- Request is about marketing creative / brand voice (Phase 2+: `@cmo`; Phase 1: `growth-orchestrator` direct).

## Routing OUT of CPO

CPO is a **leaf node in Phase 1**. Does not delegate downstream.

Phase 2+ downstream:
| Target | When | Phase |
|---|---|---|
| `@cmo` | Launch messaging AFTER wedge validated | Phase 2+ |
| `@cgo` | Funnel input (which stage to target) | Phase 1 fallback OK via CEO |
| `@cds` | Statistical readout on A/B tests | Phase 4+ |

Phase 1 fallbacks (if needed):
- For messaging help: `content-drafter` skill direct (with CPO-authored brief).
- For funnel context: pull from `ops.kpi_snapshots` directly (read-only).

## Escalation paths

| Condition | Target | Reason |
|---|---|---|
| Pricing change touches `ritsu.ai/pricing` | founder direct | All phases — Tier C minimum |
| A/B test affects > 10% of paying users | founder direct | Tier C |
| Stranger observation requires > $200 recruitment | founder | Tier C |
| Wedge-conflict detected (build vs validated wedge) | CEO + founder Tier 4 | Strategic |
| Cancel-flow pattern indicates fundamental wedge problem | CEO + founder Tier 4 | Strategic |

## CPO/CGO boundary (per ADR-006)

| Concern | Owner |
|---|---|
| Wedge identification, in-product UX, PRD, A/B test design, cancel flow | CPO |
| External distribution, launch messaging, paid spend, public-channel posts | CGO |
| Pricing tier design | CPO designs; founder approves; Phase 2+ CSO runs the test |
| Funnel diagnostics — in-product (activation, retention) | CPO (with CGO collaboration on framing) |
| Funnel diagnostics — pre-app (visit → signup) | CGO |
| Ambiguous | CEO arbitrates Tier 4 |

## Routing log

```yaml
ops.agent_runs entry:
  agent_slug: product-orchestrator
  persona_slug: cpo
  routed_by: ceo | direct
  tier: <A|B|C|D>
  outcome: success | failed | escalated | refused
  state_payload.wedge_fit_score: <if applicable>
```

Queryable for "what wedge work did CPO drive this week?" Friday review.
