# Bài #8 — Scheduling & Triggers (DRAFT)

**Status:** DRAFT — derived from walkthrough C8.1, not yet brainstormed/decided
**Walkthrough:** `_build/notes/walkthrough-C8.1-scheduling.md`
**Dependencies:** Bài #1 (Tier 1 storage), Bài #2 (HITL governance), Bài #7 (cost budget)

## Why
60+ activities trong kho vấn đề có cadence rõ (daily/weekly/monthly).
Phase A ASSUMES scheduling but DEFERS to v1.x.
Without scheduling layer, every recurring activity = manual founder invocation.
Founder cognitive load unsustainable.

## Decisions (tentative)

### Axis 1 — Schedule Registry
**Choice:** Tier 1 declarative `knowledge/schedules.yaml`
- Single canonical inventory
- PR-edited (Tier B/C per impact)
- Cron syntax standard
- Per-schedule HITL tier + economic_attribution + retry_policy + skip_conditions

### Axis 2 — Trigger Mechanism
**Choice:** Supabase pg_cron + Edge Function dispatcher
- pg_cron entries auto-generated từ schedules.yaml on PR merge
- Edge Function listens cho pg_notify, runs pre-flight checks, spawns agent run
- No new infra (already have Supabase ops project)

### Axis 3 — Failure Handling
**Choice:** Exponential backoff + dead letter + Telegram escalation
- Per-schedule retry_policy (max_retries, backoff, dead_letter_after)
- After max_retries → dead_letter status + founder alert
- Skip conditions (founder_vacation_mode, etc.) — skipped ≠ failed

### Axis 4 — HITL + Budget Integration
**Choice:** Pre-flight checks in dispatcher
- Tier C+ scheduled runs queue for founder approval
- Budget check (Bài #7's pre-llm-call-budget logic)
- Concurrency lock (skip if previous run still active)
- Skip conditions evaluated

## Schema additions (Tier 2)

```sql
CREATE TABLE ops.scheduled_runs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id     text NOT NULL,
  scheduled_at    timestamptz NOT NULL,
  triggered_at    timestamptz,
  agent_run_id    uuid REFERENCES ops.agent_runs(id),
  status          text NOT NULL,
  retry_count     int DEFAULT 0,
  next_retry_at   timestamptz,
  failure_reason  text,
  skipped_reason  text,
  created_at      timestamptz DEFAULT now()
);

CREATE TABLE ops.settings (
  key             text PRIMARY KEY,
  value           jsonb NOT NULL,
  updated_at      timestamptz DEFAULT now(),
  updated_by      text  -- role that updated
);
-- Examples: founder_vacation_mode, maintenance_window, etc.
```

## New components

| ID | Component | Type | Owner |
|---|---|---|---|
| CN1.1 | knowledge/schedules.yaml | Tier 1 | Phase A.2 founding |
| CN1.2 | ops.scheduled_runs | Tier 2 | Phase B provision |
| CN1.3 | ops.settings | Tier 2 | Phase B provision |
| CN1.4 | scheduled-run-dispatcher edge function | Runtime | Phase D implement |
| CN1.5 | regenerate-pg-cron GHA | CI | Phase B implement |
| CN1.6 | _build/recipes/add-scheduled-activity.md | Meta | Phase A.2 founding |
| CN1.7 | _build/checklists/schedule-activation.md | Meta | Phase A.2 founding |
| CN1.8 | governance/HITL.md "Scheduled HITL flow" section | Governance | Phase A.2 founding |
| CN1.9 | skill: daily-morning-digest | Procedural | Phase C implement |

## Open questions

- OQ1.1: pg_cron concurrent jobs limit? Test in Phase B
- OQ1.2: Edge function timeout cho complex skills? Benchmark in Phase B
- OQ1.3: Hot-reload vs restart for schedules.yaml change?
- OQ1.4: Multi-tenant scheduling (defer to v1.x)
- OQ1.5: Calendar integration (defer to v1.x)

## Anti-patterns

- ❌ External cron (GitHub Actions, Cloudflare): scattered schedules, no audit trail in ops, no HITL integration
- ❌ Auto-execute Tier C scheduled runs: bypasses HITL discipline
- ❌ Fail-open on retry exhaustion: silent failures
- ❌ No concurrency lock: duplicate runs

## Ritsu uses (platform primitives)

| Need | Platform |
|---|---|
| Cron triggers | Supabase pg_cron extension |
| Notification dispatch | Postgres NOTIFY/LISTEN |
| Edge compute | Supabase Edge Functions |
| Audit trail | ops.agent_runs (Phase A) |
| HITL | governance/HITL.md (Phase A Bài #2) |
| Budget | pre-llm-call-budget hook (Phase A Bài #7) |

## Ritsu adds (Outer Harness)

1. schedules.yaml registry format
2. ops.scheduled_runs schema
3. Dispatcher edge function with pre-flight checks
4. HITL queue UX cho Tier C scheduled runs
5. Recipe + checklist for schedule lifecycle
6. Skip condition primitive (vacation mode, etc.)

## Lessons captured

1. **Scheduling = layer, not skill.** Skill executes; scheduler triggers. Different abstractions.
2. **pg_cron > external scheduler.** Same-database = same audit trail.
3. **Pre-flight in dispatcher, not skill.** Skill doesn't know it was scheduled vs ad-hoc invoked. Dispatcher does the gating.
4. **Tier C scheduled = HITL queue.** Don't auto-execute Tier C just because it was scheduled.
5. **Skip ≠ failure.** Distinct status preserves analytics.
