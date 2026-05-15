# KPIs — CEO

## Primary KPI

**`persona.ceo.routing_accuracy_first_try`**

- **What it measures:** % of founder requests where CEO routes to the correct target on first attempt (no founder correction).
- **Source query:**
  ```sql
  SELECT
    1 - (COUNT(*) FILTER (WHERE c.correction_kind IN ('redirect', 'reject'))::float
         / NULLIF(COUNT(*), 0)) AS routing_accuracy
  FROM ops.agent_runs r
  LEFT JOIN ops.corrections c ON c.run_id = r.id
  WHERE r.agent_slug = 'gps'
    AND r.state_payload->>'persona_slug' = 'ceo'
    AND r.started_at > NOW() - INTERVAL '7 days';
  ```
- **Refresh cadence:** weekly (Friday review)
- **Target:** > 85% after 4 weeks of operation; > 90% after 12 weeks
- **Phase 1 baseline:** unknown — track for first 4 weeks before setting

## Secondary KPIs

1. **`persona.ceo.founder_correction_rate`** — # of corrections per # of invocations.
   - Target: < 15%
   - Signal if > 20%: routing matrix drift or voice profile mismatch

2. **`persona.ceo.escalations_per_week`** — # of Tier 4 escalations (CEO surfacing strategic Qs to founder).
   - Target: 3-8 per week (too few = CEO might be overstepping; too many = CEO might be too cautious)
   - Signal if < 2: CEO making strategic calls it shouldn't
   - Signal if > 12: routing matrix too rigid

3. **`persona.ceo.tokens_per_invocation_avg`** — cost discipline.
   - Target: < 8000 tokens average (well under `gps` working_tokens of 80000)
   - Signal if > 15000 average: CEO doing too much per call, not delegating enough

4. **`persona.ceo.fanout_avg`** — # of parallel subagent calls CEO makes per request.
   - Target: 1.5-3.0 average (reflects healthy delegation)
   - Signal if > 4.0: CEO might be over-polling
   - Signal if < 1.2: CEO might be doing work that specialists should

5. **`persona.ceo.dossier_freshness`** — last `dossier.md` update.
   - Target: updated every non-trivial session
   - Signal if > 48h stale during active week: CEO not logging properly

6. **`persona.ceo.morning_brief_invocation_rate`** — % of weekdays CEO ran morning brief (E3 expansion).
   - Target: > 60% (5+ days per business week implies founder is starting sessions)
   - Signal if < 30%: morning brief skill isn't valuable or founder bypassing

## Cost metrics

- `cost.role.gps.daily_usd` (inherited)
- `cost.role.gps.tokens_used` (inherited)
- `cost.persona.ceo.daily_usd` — slice attributed to invocations through CEO. Per ROLES.md `gps.economic_budget.monthly_cap_usd = $200`.

Persona-specific cost cap: same $200 as `gps`. CEO does not have a separate budget — it IS the gps role with a different voice.

## Quality signals

- **Founder satisfaction proxy:** founder uses `/ceo` 5+ times per week → positive. Founder talks to "Claude" without `/ceo` invocation repeatedly → either CEO is being implicitly auto-resolved (good if right persona; bad if it isn't), or CEO is being avoided (bad).
- **Time to first useful response in /ceo session:** < 30 seconds (after data fetch latency).
- **% of /ceo sessions ending with a written dossier entry:** target > 95%.

## Weekly readout

Friday review aggregates:

```
CEO | invocations: N | corrections: M | escalations: P | fanout: F | cost: $X
   | routing accuracy: A% | dossier age: D days
```

CEO surfaces in self-introspection when its KPIs drift outside target ranges.

## Promotion / retirement criteria

- **Promotion** (allow CEO higher HITL max, e.g. C → D-Std): NEVER. CEO must not be able to authorize D actions. Founder is the only D-MAX authority. This is a hard architectural commitment.
- **Retirement:** CEO is the primary interface. Cannot be retired without restructuring the whole workforce architecture.
