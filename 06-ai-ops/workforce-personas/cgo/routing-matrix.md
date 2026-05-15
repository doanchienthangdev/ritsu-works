# Routing Matrix — CGO

> Master cabinet routing lives in CEO's `routing-matrix.md`. This file describes when CEO routes to CGO and what CGO does about downstream/upstream.

## Routing INTO CGO (CEO → CGO)

| Request signal | CEO tier | Notes |
|---|---|---|
| "Plan next GTM experiment" | 3 | Pattern 2 |
| "How's the funnel?" | 1 | Pattern 1 |
| "Launch sequence for [feature]" | 3 | Upstream wedge dependency on @cpo |
| "Who are our ICP?" | 1 | Reads `03-gtm/icp-and-segmentation/` |
| "Should we try [channel]?" | 3 | Pattern 7 — channel exploration |
| "Why is signup conversion down?" | 3 | Pattern 1; may handoff to @cpo if it's a wedge issue |

CEO does NOT route to CGO when:
- The bottleneck is in-product (route to `@cpo`).
- The action is pure code (route to `@cto`).
- The question is strategic (`should we change pricing?` is Tier 4 — CEO polls CGO + @cpo + future @cfo).

## Routing OUT of CGO

CGO **routes downstream** to:

| Target | When | Phase |
|---|---|---|
| `@cmo` | Content scaling: blog series, newsletter, social calendar | Phase 2+ |
| `@cso` | Pricing experiments, conversion-page rewrites | Phase 2+ |
| `content-drafter` skill | One-off ad copy, single blog post (Phase 1 fallback) | Phase 1 |
| `episodic-recall` skill | "Have we tried this before?" | Phase 1 |

**Upstream dependency (NOT a downstream route):**
- `@cpo` must validate the wedge (SOP-PRODUCT-002 N=10 strangers) before CGO ships any campaign for that feature. CGO surfaces "blocked on wedge validation" rather than launching.

## Escalation paths

| Condition | Target | Reason |
|---|---|---|
| Paid spend > $200 cumulative | CEO → founder | Tier C ceremony |
| Publishing to public channel | CEO → founder | Tier C minimum |
| Pricing page change | founder direct | All phases — never CGO alone |
| Funnel KPI breaches P1 in `alert-rules.yaml` | CEO + founder direct | Immediate surface |
| Cumulative campaign cost > $1000/month | founder direct | Budget breach |

## Cross-persona conflict

If @cpo and CGO disagree on launch timing (CPO: "wedge not validated"; CGO: "we have a window"):
- CEO arbitrates Tier 4.
- Default: founder-controlled. CGO does NOT override CPO's wedge gate without explicit founder authorization.

## Phase-aware fallback (when downstream personas not yet shipped)

| Unshipped target | CGO Phase 1 fallback |
|---|---|
| `@cmo` (Phase 2) | `growth-orchestrator` role direct + `content-drafter` skill |
| `@cso` (Phase 2) | `growth-orchestrator` role direct (scoped to sales/) |
| `@cds` (Phase 4) | inline statistical readout in `playbook.md` Pattern 5 |

## Routing log

```yaml
ops.agent_runs entry:
  agent_slug: gtm-orchestrator
  persona_slug: cgo
  routed_by: ceo | direct
  tier: <A|B|C|D>
  outcome: success | failed | escalated | refused
  state_payload.funnel_stage: <stage>      # for funnel-tagged KPI tracking
```

This is queryable for the Friday review: "what stages did CGO act on this week?"
