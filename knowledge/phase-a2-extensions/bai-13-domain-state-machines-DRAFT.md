# Bài #13 — Domain State Machine Architecture (DRAFT)

**Status:** DRAFT — derived from G3 walkthrough, not yet brainstormed/decided
**Walkthrough:** `_build/notes/phase-a2/walkthroughs/G3-state-machines.md`
**Dependencies:** Bài #1, #2, #5, #9 DRAFT, #10 DRAFT, #11 DRAFT

## Why
~6 issues directly + many indirect (every domain entity với lifecycle).

Phase A defers domain state to per-pillar Phase B. Phase A.2 reveals this is wrong abstraction:
- State machines are cross-cutting architectural concern
- Without standard: drift, lost transitions, no audit, no SLA, no events
- Per-pillar reinvention = inconsistent, error-prone

Without Bài #13:
- `customers.status='active'` vs `content.state='approved'` vs `leads.lifecycle='warm'` — naming drift
- Direct SQL UPDATE bypasses business logic
- "When did customer X churn?" — unanswerable
- DMCA stuck in "Investigating" 5 days, nobody noticed

## Decisions (tentative)

### Axis 1 — Schema Convention
**Choice:** 4 standardized columns + sidecar audit table per domain
- `state` (canonical), `state_since`, `state_payload jsonb`, `state_version`
- `<table>_state_log` audit table
- CHECK constraint on state values
- Database trigger guard prevents bypass

### Axis 2 — Declarative Registry
**Choice:** knowledge/state-machines.yaml Tier 1
- Domains, states (với SLA + retention), transitions (với guard, triggered_by, emits, sop_triggers)
- Versioned (state_version column tracks)
- Cross-references events (Bài #11) and SOPs (Bài #9)

### Axis 3 — Runtime Engine
**Choice:** state-transition skill + database triggers + state guards
- Validates from_state, evaluates guard, transactional update + audit + event emission
- Trigger guard prevents direct SQL bypass
- Skill marked as deterministic → ops.minion_jobs queue (GBrain Minions pattern)

### Axis 4 — Observability + Migration
**Choice:** Dashboard pages per domain + Mermaid diagrams + migration framework
- Per-domain dashboard pages (`/business/<domain>/state`)
- SLA breach auto-alerts (alert-rules.yaml integration)
- `ritsu-cli state-machine diagram` outputs Mermaid → wiki/
- `ritsu-cli state-machine migrate <domain> <version>` với HITL gate

## Schema convention (Tier 2)

```sql
-- Standard pattern for any domain entity
CREATE TABLE <domain>s (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- domain-specific fields...
  
  -- Bài #13 standardized state columns
  state           text NOT NULL,
  state_since     timestamptz NOT NULL DEFAULT now(),
  state_payload   jsonb,
  state_version   text NOT NULL,
  
  CONSTRAINT <domain>s_state_valid CHECK (
    state IN (<enumerated states from state-machines.yaml>)
  )
);

CREATE INDEX ON <domain>s (state, state_since);

-- Sidecar audit
CREATE TABLE <domain>s_state_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  <domain>_id     uuid NOT NULL REFERENCES <domain>s(id),
  from_state      text,
  to_state        text NOT NULL,
  transition_id   text NOT NULL,
  triggered_by    text NOT NULL,
  triggered_by_id text,
  reason          text,
  changed_at      timestamptz NOT NULL DEFAULT now(),
  changed_payload_diff jsonb
);

CREATE INDEX ON <domain>s_state_log (<domain>_id, changed_at DESC);

-- Trigger guard
CREATE TRIGGER <domain>s_state_transition_guard
  BEFORE UPDATE ON <domain>s
  FOR EACH ROW
  EXECUTE FUNCTION enforce_<domain>_state_transition();
```

## YAML schema

```yaml
# knowledge/state-machines.yaml
version: "1.0.0"
domains:
  <domain>:
    table: <table-name>
    initial_state: <state>
    states:
      - name: <state-slug>
        description: <markdown>
        sla:
          to_state: <target-state or [list]>
          deadline: <duration>
          alert_on_breach: <alert-id>
        retention:
          archive_after: <duration>
    transitions:
      - id: <transition-slug>
        from: <state or [list]>
        to: <state>
        guard: <SQL or skill expression>
        triggered_by:
          - event: <event_type>
          - skill_call: <skill-name>
        emits:
          - event: <event_type>
        sop_triggers:
          - <SOP_ID>
```

## Initial domains (Phase B+)

1. **customer** — signed_up, active, at_risk, recovered, churned
2. **content_piece** — idea, draft, in_review, approved, rejected, scheduled, published, archived
3. **lead** — cold, warm, engaged, qualified, customer, lost
4. **compliance_review** — submitted, triage, investigating, decision_pending, resolved, escalated
5. **subscription** — trialing, active, past_due, cancelled, reactivated

Each has SLAs, transitions, event emissions, SOP triggers defined.

## New components (20)

| ID | Component | Type | Phase |
|---|---|---|---|
| CN13.1 | knowledge/state-machines.yaml | Tier 1 | A.2 |
| CN13.2 | 4-column schema convention | Schema | B |
| CN13.3 | <table>_state_log audit tables | Tier 2 | B |
| CN13.4 | state-transition skill | Procedural | C |
| CN13.5 | DB trigger guards | Tier 2 | B |
| CN13.6 | ritsu-cli state-machine diagram | CLI | C |
| CN13.7 | ritsu-cli state-machine migrate | CLI | D |
| CN13.8 | state-machine-migrations/ directory | Tier 1 | A.2 |
| CN13.9 | Dashboard /business/<domain>/state pages | Frontend | C/D |
| CN13.10 | SLA breach auto-alerts | Generated | A.2 |
| CN13.11 | State event emission (Bài #11 integration) | Update | A.2 |
| CN13.12 | State-triggered SOPs (Bài #9 integration) | Update | A.2 |
| CN13.13 | wiki/state-machines/ Mermaid diagrams | Docs | A.2 |
| CN13.14 | Recipe add-domain-state-machine.md | Meta | A.2 |
| CN13.15 | Recipe add-state-machine-migration.md | Meta | A.2 |
| CN13.16 | Checklist state-machine-pre-launch.md | Meta | A.2 |
| CN13.17 | Update Bài #11 emission convention | Update | A.2 |
| CN13.18 | Update Bài #9 sop_triggers | Update | A.2 |
| CN13.19 | Update Bài #10 dashboard pages | Update | A.2 |
| CN13.20 | Brainstorm problem-13 | Meta | A.2 |

## Open questions

- OQ13.1: Hierarchical/parallel states?
- OQ13.2: Cross-domain atomic transitions?
- OQ13.3: ML-detected state inference?
- OQ13.4: State-based RLS?
- OQ13.5: Legacy data evolution?
- OQ13.6: Per-customer state variants (B2B vs B2C)?

## Anti-patterns

- ❌ Per-pillar custom state column without convention
- ❌ Direct SQL UPDATE bypassing state-transition
- ❌ State machine in code, not declarative
- ❌ No state versioning
- ❌ State transition without audit log
- ❌ State change without event emission
- ❌ No SLA per state
- ❌ State machine as god object (one per domain, not shared)
- ❌ Skip state diagram visualization
- ❌ Mutate state_payload outside state machine

## GBrain integration notes

**Minions pattern:** state-transition is deterministic (rules → action) → ops.minion_jobs queue, NOT subagent. Bulk migrations as parallel minion jobs.

**Knowledge graph (future G15):** state transitions become typed edges. "Customer X transitioned to churned at 2026-05-03." Graph queries enable cohort analysis.

**Compiled-truth + timeline:** Bài #13 audit log = timeline below ---. Current state = compiled truth above.

## Ritsu uses (platform primitives)

| Need | Platform |
|---|---|
| State storage | Postgres columns + JSONB |
| Audit | Postgres sidecar tables |
| Trigger guards | Postgres triggers + plpgsql |
| Atomic transitions | Postgres transactions |
| Event emission | Outbox pattern (Bài #11) |
| Visualization | Mermaid (CLI generates) |

## Ritsu adds (Outer Harness)

1. state-machines.yaml registry (Tier 1)
2. 4-column schema convention
3. Sidecar audit table convention
4. state-transition skill
5. Trigger guard pattern
6. Migration framework
7. Per-domain dashboard pages
8. Mermaid diagram generation
9. SLA breach auto-alert integration

## Lessons captured

1. State machine = cross-cutting concern, not per-pillar.
2. 4 standardized columns + sidecar audit = no drift.
3. Trigger guard = defense in depth.
4. Versioning from day 1.
5. Transitions emit events naturally (Bài #11).
6. Transitions trigger SOPs naturally (Bài #9).
7. SLA per state = breach alerts free.
8. Mermaid as living docs.
9. Cross-domain atomic transitions = v1.x defer.
10. state_payload jsonb = sub-state, controlled by machine.
