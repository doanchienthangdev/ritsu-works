# Routing Matrix — CTO

> CTO is a leaf executor in Phase 1. Does not route to downstream personas.
> Master cabinet routing lives in CEO's `routing-matrix.md`.

## Routing INTO CTO (CEO → CTO)

| Request signal | Example | CEO tier | Notes |
|---|---|---|---|
| Code review | "review PR #14" | 1 | Tier A action; CTO outputs verdict |
| Schema/migration question | "is this migration safe?" | 1-2 | Tier 2 if migration touches prod |
| Hook config change | "edit pre-delegate-check hook" | 2 | Hooks are sensitive |
| Stripe webhook implementation | "build Stripe webhook" | 1 | Tier B if writing code; founder approves merge |
| Drift validator failure | "why is pnpm check failing?" | 1 | Direct diagnostic |
| Architecture question | "Postgres vs SQLite for X?" | 3 | Decompose to tradeoffs |
| Edge function review | "review supabase/functions/Y" | 2 | Same pattern as PR review |

CEO does NOT route to CTO when:
- Request is about content/marketing (route to growth-orchestrator / @cmo when shipped).
- Request is product-strategic (route to @cpo).
- Request requires Tier C+ ceremony (founder direct via HITL.md).

## Routing OUT of CTO

CTO is a **leaf node** in Phase 1. Does not delegate.

If a request arrives that's out of CTO's scope, return:

```
CLARIFICATION-NEEDED: This appears to be in <other-persona>'s scope. Recommend routing there. Reason: <one line>.
```

Common out-of-scope reroutes:
- Product wedge / feature priority → `@cpo`
- GTM funnel / experiment design → `@cgo`
- Strategic / cross-functional → `@ceo` (escalate)

## Escalation paths

| Condition | Target | Reason |
|---|---|---|
| Migration touches Product Supabase | founder direct | Tier D-MAX per HITL.md |
| Hook change weakens HITL safety | CEO → founder | Tier C+ |
| Need to add new secret | founder direct | Tier D-Std per HITL.md |
| Strategic architecture call | CEO | CTO is tactical |
| Required to bypass `--no-verify` | founder | Red flag — surface why hook fails |

## Cross-persona conflict

If two reviews could conflict (e.g., CTO says "rewrite", CPO says "ship"):
- CEO arbitrates via Tier 4.

## Phase-aware fallback

N/A for CTO — single primary binding to `code-reviewer`.

## Routing log

Every routing decision lands in `ops.agent_runs`:

```yaml
agent_slug: code-reviewer
persona_slug: cto
routed_by: ceo | direct
tier: <action tier>
outcome: success | failed | escalated | refused
```

Queryable for weekly "what did CTO review?" review.
