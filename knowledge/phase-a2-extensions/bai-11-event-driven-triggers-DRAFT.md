# Bài #11 — Event-Driven Triggers (DRAFT)

**Status:** DRAFT — derived from G2 walkthrough, not yet brainstormed/decided
**Walkthrough:** `_build/notes/phase-a2/walkthroughs/G2-events.md`
**Dependencies:** Bài #1, #2, #5, #7, #8 DRAFT, #9 DRAFT, #10 DRAFT

## Why
~13 issues directly assume event-driven triggers + many indirect business workflows.

Phase A is pull-based (cron). Phase A.2 reveals push-based events critical:
- Sentry critical errors
- Stripe webhook stale (anti-event)
- Customer behavioral signals (login, signup, upload)
- Compliance events (DMCA receipt)
- Internal state transitions (task blocked, SOP completed)

Bài #10 covered ingestion + alerting. Bài #11 covers **routing → SOP execution**.

Without Bài #11:
- Events lost (no central handler)
- Hardcoded webhook → SOP wiring
- No dedup, replay, aggregation
- Race conditions, lost events

## Decisions (tentative)

### Axis 1 — Event Taxonomy & Emission
**Choice:** 3 sources, unified ops.events table
- External: Stripe/Sentry/GA/Vercel/GitHub webhooks → ops.events (via Bài #10 receivers)
- Internal: ops.tasks/sop_runs/agent_runs state transitions → ops.events (via outbox pattern, same transaction)
- Synthetic: aggregations/correlations → ops.events (via event-aggregator skill)

### Axis 2 — Subscription Registry
**Choice:** knowledge/event-subscriptions.yaml Tier 1 declarative
- event_type matching
- condition expression (JSONPath + boolean)
- action: trigger_sop | trigger_skill | emit_event (chain)
- dedup_key + cooldown
- HITL tier (subscription-level override)

### Axis 3 — Event Router
**Choice:** event-dispatcher Edge Function, reuses Bài #8 mechanism
- pg_notify on ops.events INSERT
- Match subscriptions
- Dedup check via ops.event_dedup
- Pre-flight (HITL, budget per Bài #7)
- Spawn action (sop-execute / skill / chain emit)
- Update routing_status

### Axis 4 — Aggregation + Replay
**Choice:** event-aggregator skill (scheduled) + replay capability
- knowledge/event-aggregation.yaml Tier 1 rules
- Periodic SQL queries → synthetic events
- Idempotency via ops.aggregation_state
- ritsu-cli events replay --from <ts> --to <ts> for outage recovery
- Cross-event correlation deferred to v1.x

## Schema additions (Tier 2)

```sql
CREATE TABLE ops.events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type      text NOT NULL,
  source          text NOT NULL,
  external_id     text,
  occurred_at     timestamptz NOT NULL,
  ingested_at     timestamptz DEFAULT now(),
  payload         jsonb NOT NULL,
  routing_status  text DEFAULT 'pending',
  routed_to       text[],
  routing_error   text
);
CREATE UNIQUE INDEX ON ops.events (source, external_id) WHERE external_id IS NOT NULL;
CREATE INDEX ON ops.events (event_type, occurred_at DESC);
CREATE INDEX ON ops.events (routing_status, ingested_at) WHERE routing_status = 'pending';

CREATE TABLE ops.event_dedup (
  subscription_id text NOT NULL,
  dedup_key       text NOT NULL,
  triggered_at    timestamptz NOT NULL,
  expires_at      timestamptz NOT NULL,
  PRIMARY KEY (subscription_id, dedup_key)
);
CREATE INDEX ON ops.event_dedup (expires_at);

CREATE TABLE ops.aggregation_state (
  aggregation_id text NOT NULL,
  entity_id      text NOT NULL,        -- e.g., customer_id for "customer inactive" rule
  emitted_at     timestamptz NOT NULL,
  expires_at     timestamptz NOT NULL,
  PRIMARY KEY (aggregation_id, entity_id)
);
```

## YAML schemas

```yaml
# knowledge/event-subscriptions.yaml
subscriptions:
  - id: <slug>
    event_type: <canonical type>
    condition: <JSONPath + boolean expression>
    action:
      kind: trigger_sop | trigger_skill | emit_event
      sop_id: <id>           # if trigger_sop
      skill: <name>          # if trigger_skill
      emit:                  # if emit_event
        event_type: <type>
        payload: <template>
    hitl_tier: <override>
    dedup_key: <JSONPath>
    cooldown_days: <int>
    sla_minutes: <int>
    enabled: true | false
```

```yaml
# knowledge/event-aggregation.yaml  
aggregations:
  - id: <slug>
    output_event_type: <type>
    cadence: <interval>
    query: <SQL>
    payload_template: <Jinja>
    idempotency_window: <interval>
```

## Outbox pattern (internal events)

```sql
-- Helper function
CREATE OR REPLACE FUNCTION emit_event(
  event_type text, 
  payload jsonb,
  external_id text DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO ops.events (event_type, source, occurred_at, payload, external_id)
  VALUES (event_type, 'ritsu.internal', now(), payload, external_id)
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$ LANGUAGE plpgsql;

-- Usage in transaction
BEGIN;
  UPDATE ops.tasks SET status = 'blocked' WHERE id = ?;
  PERFORM emit_event('ritsu.task.blocked', 
    jsonb_build_object('task_id', ?, 'reason', ?));
COMMIT;
```

## New components (17)

| ID | Component | Type | Phase |
|---|---|---|---|
| CN11.1 | ops.events | Tier 2 | B |
| CN11.2 | ops.event_dedup | Tier 2 | B |
| CN11.3 | ops.aggregation_state | Tier 2 | B |
| CN11.4 | knowledge/event-subscriptions.yaml | Tier 1 | A.2 |
| CN11.5 | knowledge/event-aggregation.yaml | Tier 1 | A.2 |
| CN11.6 | event-dispatcher Edge Function | Runtime | D |
| CN11.7 | event-aggregator skill | Procedural | C |
| CN11.8 | emit_event() helper | Tier 2 | B |
| CN11.9 | Outbox trigger pattern docs | Meta | A.2 |
| CN11.10 | ritsu-cli events replay | CLI | C/D |
| CN11.11 | Recipe add-event-subscription.md | Meta | A.2 |
| CN11.12 | Recipe add-event-aggregation.md | Meta | A.2 |
| CN11.13 | Checklist event-subscription-pre-flight.md | Meta | A.2 |
| CN11.14 | Update Bài #5 — emit events on task transitions | Update | A.2 |
| CN11.15 | Update Bài #10 — receivers write ops.events | Update | A.2 |
| CN11.16 | Update Bài #9 — sop-execute triggered_by='event' | Update | A.2 |
| CN11.17 | Brainstorm problem-11 | Meta | A.2 |

## Open questions

- OQ11.1: Cross-event correlation language?
- OQ11.2: Event ordering guarantees?
- OQ11.3: Multi-tenancy events?
- OQ11.4: Event archival cadence?
- OQ11.5: Event HITL UX?
- OQ11.6: DLQ retry strategy?

## Anti-patterns

- ❌ Hardcoded event handlers in webhook receivers
- ❌ Skip outbox pattern for internal events
- ❌ Single event → N SOPs without dedup
- ❌ Synchronous event processing
- ❌ Skip cooldown
- ❌ Treat aggregation as subscription
- ❌ Skip replay capability
- ❌ Subagent for event matching (use Minions pattern)

## GBrain integration notes

**Minions pattern from GBrain:** event-dispatcher = deterministic (event → rule match → action) → ops.minion_jobs queue, not subagent. 60-80% cost reduction.

**Outbox pattern**: similar to GBrain's "every page write extracts entity refs (zero LLM)" — same transaction, deterministic, no agent thinking.

## Ritsu uses (platform primitives)

| Need | Platform |
|---|---|
| Event ingestion | Supabase Edge Functions + ops.events |
| Pub/sub | pg_notify |
| Dedup | Postgres UNIQUE indexes + ops.event_dedup |
| Outbox | Postgres transactions |
| Aggregation | Scheduled SQL queries (Bài #8) |

## Ritsu adds (Outer Harness)

1. ops.events unified table
2. event-subscriptions.yaml Tier 1 registry
3. event-aggregation.yaml Tier 1 rules
4. event-dispatcher Edge Function
5. event-aggregator skill
6. emit_event() helper for outbox pattern
7. Replay capability (ritsu-cli events replay)
8. Cross-bài-toán updates (Bài #5/#9/#10)

## Lessons captured

1. Events ≠ alerts. Different abstractions.
2. 3 sources unified through ops.events.
3. Outbox pattern essential.
4. Subscription registry > scattered handlers.
5. Dedup + cooldown prevents fatigue.
6. Aggregation > raw subscription for derived events.
7. Reuse Bài #8 dispatcher pattern.
8. Minions pattern applies (deterministic dispatch).
