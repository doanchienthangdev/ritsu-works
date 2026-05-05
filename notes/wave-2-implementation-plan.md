# Wave 2 — Triggers + Orchestration (rolling plan)

**Scope:** Bài #8 (scheduling), #9 (SOPs), #11 (events). Per the master prompt 8-wave roadmap, Wave 2 is weeks 3-4.

**Started:** 2026-05-05 (this commit) — only Bài #8 dispatcher scaffold landed.

## State machine

| Bài | Component | Status | Owner | Blocker |
|---|---|---|---|---|
| #8 | `knowledge/schedules.yaml` | ✅ Phase A.2 (Wave 1) | — | — |
| #8 | `ops.scheduled_runs` table | ✅ Wave 1 (migration 00003) | — | — |
| #8 | `ops.settings` table | ⏳ Wave 2 follow-up | next migration | design RLS + indexes |
| #8 | Edge Function `scheduled-run-dispatcher` | 🟨 SCAFFOLD (this commit) | Wave 2 | needs `ops.settings`, deploy, pg_cron config |
| #8 | GHA `regenerate-pg-cron` | ❌ TODO | Wave 2 | reads schedules.yaml, emits SQL |
| #8 | Skill worker (consumes `ops.scheduled_runs`) | ❌ TODO | Wave 2 (Bài #5 Minions) | needs ANTHROPIC_API_KEY for Hybrid skills |
| #9 | Per-pillar `sops/` folders | 🟨 only `05-ai-ops/sops/SOP-AIOPS-001-...` exists | Wave 2 | template + recipe |
| #9 | `ops.sop_runs` table | ✅ Wave 1 (migration 00003) | — | — |
| #9 | Skill `sop-execute` | ❌ TODO | Wave 2 | needs Bài #5 subagent pattern |
| #9 | Pre-sop-execute validation hook | ❌ TODO | Wave 2 | reads SOP yaml, validates HITL/budget |
| #11 | `knowledge/event-subscriptions.yaml` + `event-aggregation.yaml` | ✅ Phase A.2 (placeholders) | — | populate domain subs |
| #11 | `ops.events` outbox + `ops.event_dedup` | ✅ Wave 1 (migration 00002) | — | event_dedup may need separate migration |
| #11 | Edge Function `event-dispatcher` | ❌ TODO | Wave 2 | reuse Bài #8 pattern after dispatcher proven |
| #11 | Skill `event-aggregator` | ❌ TODO | Wave 2 | scheduled, reads aggregation yaml |
| #11 | `ritsu-cli events replay` | ❌ TODO | Wave 4 (CLI doesn't exist yet) | — |

## Recommended execution order (next session)

1. **Add `ops.settings`** in `supabase/migrations/00012_ops_settings.sql` (small table, RLS founder-only).
2. **Set `DISPATCHER_SECRET`** in Supabase Secrets, deploy `scheduled-run-dispatcher`, add ONE pg_cron schedule that hits a no-LLM skill (e.g. `heartbeat-ping` that just inserts an audit_log row).
3. **Write `bundle-schedules.cjs`** script — reads `knowledge/schedules.yaml`, emits TS module `_shared/schedules.ts` for the Edge Function. Wire as part of `pnpm wave2:bundle`.
4. **Confirm round-trip**: pg_cron fires → dispatcher inserts `ops.scheduled_runs` row → manually verify in dashboard.
5. **Implement Bài #5 Minions worker** that polls `ops.scheduled_runs` and runs the actual skill (this unblocks Bài #8 end-to-end and is the same primitive Bài #11 reuses).
6. **Begin Bài #11 `event-dispatcher`** — reuse the Edge Function pattern from #8 but listen on `ops.events` INSERT via `pg_notify` instead of pg_cron.

## Key insight

Bài #8, #9, #11 share the **same architectural shape**: Tier 1 yaml registry → declarative trigger → Edge Function dispatcher → ops table queue → Minions worker. Build #8 first as the reference implementation; #11 is then a copy with a different trigger source.

Bài #9 (SOP) is a higher-level composition — it CALLS skills (which #8 and #11 schedule/route). It depends on Bài #5 (subagent orchestration) being mature, so it lands LAST in Wave 2.

## Out of scope for Wave 2 (deferred)

- Multi-tenant scheduling
- Calendar integration
- Cross-event correlation engine
- `ritsu-cli events replay --from --to`
- HITL Telegram bot UX (lands in Wave 5)

## Critical reads before continuing

- `knowledge/phase-a2-extensions/bai-8-scheduling-architecture-DRAFT.md` (full)
- `knowledge/phase-a2-extensions/bai-9-sop-architecture-DRAFT.md` (full)
- `knowledge/phase-a2-extensions/bai-11-event-driven-triggers-DRAFT.md` (full)
- `supabase/migrations/00002_ops_core_tables.sql` (events, tasks, agent_runs, minion_jobs)
- `supabase/migrations/00003_schedules_sops.sql` (scheduled_runs, sop_runs)
