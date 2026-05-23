---
name: resolver/explain
description: Implementation of `/resolver explain` verb — verbose match trace showing tokenization, per-route keyword hits, confidence scores, role filter outcome, decision reasoning. Debugging surface for "why did the resolver pick X for trigger Y?"
---

# resolver/explain SKILL

## When to use

Invoked by `resolver/orchestrator` when subcommand is `explain`. Folded
in `/resolver test` (architect simplification — same verb, more verbose).

## Process

1. Parse trigger string (required) + flags (--semantic optional)
2. Call `require('scripts/resolver/query.cjs').explain({...})`
3. Render verbose trace:
   - **NORMALIZED:** show normalized trigger
   - **KEYWORD HITS:** per route, which keywords fired + confidence
   - **SEMANTIC** (if --semantic): which embedding namespace queried,
     top-N hits with cosine scores
   - **RANKING:** sorted candidates (DESC by confidence)
   - **ROLE FILTER:** caller role + which routes filtered out
   - **DECISION:** silent/surface/no_match + threshold context
   - **PERFORMANCE:** load_ms, match_count, filtered_count, total latency

## Output template

```
NORMALIZED: "<normalized trigger>"

KEYWORD HITS (N):
  ✓ "<keyword>" matched in <route_id> (confidence X.X)
  ...

SEMANTIC: (skipped — flag not set | enabled with N top hits)

RANKING:
  1. <route_id>  conf=X.X
  ...

ROLE FILTER (caller=<role>):
  <route_id>  role_scope=[...] → retained | filtered
  ...

DECISION:
  top confidence X.X <vs/below> silent_dispatch threshold 0.85
  → <decision>

PERFORMANCE:
  load: Xms (cache hit / cold)
  match: Xms
  total: Xms
```

## See also

- Engine: `scripts/resolver/query.cjs` `explain()` function
- Spec: `wiki/capabilities/resolver/spec.md` §13.F (debug surface)
- Brainstorm: `.archives/brainstorming/resolver/13-observability.md` §F
