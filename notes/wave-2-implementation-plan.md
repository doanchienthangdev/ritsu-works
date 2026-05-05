# Wave 2 — Triggers + Orchestration (rolling plan)

**Scope:** Bài #8 (scheduling), #9 (SOPs), #11 (events). Per the master prompt 8-wave roadmap, Wave 2 is weeks 3-4.

**Started:** 2026-05-05 — Bài #8 dispatcher scaffold landed; `ops.*` REST access verified end-to-end.

## Wave 1 → Wave 2 transition findings (2026-05-05 verification)

End-to-end smoke test of `ops.*` schema via PostgREST surfaced two template gaps that are now fixed:

1. **Missing GRANTs.** No migration in 00001-00011 granted `USAGE ON SCHEMA ops` or table-level CRUD to `service_role` / `authenticated`. After exposing `ops` in Settings → API, every request returned `HTTP 403 "permission denied for schema ops"`. Fixed in `supabase/migrations/00012_grants_for_ops_schema.sql` (also sets `ALTER DEFAULT PRIVILEGES` so future tables inherit grants automatically).

2. **DRAFT vs migration drift on column names.** `bai-8-scheduling-architecture-DRAFT.md` schema sketch uses `triggered_at`, `status`, `retry_count`. The actual migration `00003_schedules_sops.sql` ships with `fired_at`, `state`, no `retry_count`. Same for `audit_log`: DRAFT-style column `actor` does not exist; real columns are `actor_kind` + `actor_id`. The Bài #20 DRAFT roll-forward note: when DRAFT and migration disagree, **migration is the source of truth** (it's executable; DRAFT is design intent).
   - Edge Function `scheduled-run-dispatcher/index.ts` aligned to actual columns.
   - Future `retry_count` semantics may live in `output_payload.retry_count` until a schema change adds the column.

End-to-end verification (after fix):
  - SELECT `ops.audit_log` → HTTP 200, `[]` (empty table)
  - INSERT `ops.audit_log` → HTTP 201, row returned with `occurred_at`/`actor_kind`/`actor_id`/`payload`
  - INSERT `ops.scheduled_runs` → HTTP 201, row returned with `state='pending'`, `fired_at`, `triggered_skill`

## State machine

| Bài | Component | Status | Owner | Blocker |
|---|---|---|---|---|
| #8 | `knowledge/schedules.yaml` | ✅ Phase A.2 (Wave 1) | — | — |
| #8 | `ops.scheduled_runs` table | ✅ Wave 1 (migration 00003) | — | — |
| #8 | `ops.settings` table | ✅ migration 00013 applied + 3 seed rows | — | — |
| #8 | Bundler `scripts/wave2-bundle-schedules.cjs` | ✅ Wave 2 Task #2 (commit e3f7a38) | — | — |
| #8 | Edge Function `scheduled-run-dispatcher` | ✅ DEPLOYED with bundled SCHEDULES (queued/skipped/404 verified) | — | — |
| #8 | GHA `regenerate-pg-cron` | ❌ TODO (locally `pnpm wave2:bundle-schedules` works) | Wave 2/3 | — |
| #8 | Skill worker (`ops.scheduled_runs` consumer) | ✅ DEPLOYED as `minion-worker` with `synthesize-morning-brief` (Anthropic Haiku 4.5) + `heartbeat-ping` skills | — | — |
| #8 | pg_cron wiring (worker tick) | ✅ FULLY LIVE — migration 00014 applied + `scripts/wave2-bootstrap-cron-secrets.sh` re-creates cron with inlined secret (GUC pattern fails on hosted Supabase: `postgres` role lacks SUPERUSER for `ALTER DATABASE … SET`). End-to-end heartbeat verified at 22:38:42 → 22:39:00 (auto-fire ≤60s). | — | — |
| #8 | pg_cron wiring (dispatcher schedules) | 🟨 INTENTIONALLY DEFERRED — no `cron.schedule()` for any LLM-firing schedule. Founder enables individual schedules per `notes/pg-cron-setup.md` Step 4 when cadence is desired | founder | — |
| #9 | Per-pillar `sops/` folders | 🟨 only `05-ai-ops/sops/SOP-AIOPS-001-...` exists | Wave 2 | template + recipe |
| #9 | `ops.sop_runs` table | ✅ Wave 1 (migration 00003) | — | — |
| #9 | Skill `sop-execute` | ❌ TODO | Wave 2 | needs Bài #5 subagent pattern |
| #9 | Pre-sop-execute validation hook | ❌ TODO | Wave 2 | reads SOP yaml, validates HITL/budget |
| #11 | `knowledge/event-subscriptions.yaml` + `event-aggregation.yaml` | ✅ Phase A.2 (placeholders) | — | populate domain subs |
| #11 | `ops.events` outbox + `ops.event_dedup` | ✅ Wave 1 (migration 00002) | — | event_dedup may need separate migration |
| #11 | Edge Function `event-dispatcher` | ❌ TODO | Wave 2 | reuse Bài #8 pattern after dispatcher proven |
| #11 | Skill `event-aggregator` | ❌ TODO | Wave 2 | scheduled, reads aggregation yaml |
| #11 | `ritsu-cli events replay` | ❌ TODO | Wave 4 (CLI doesn't exist yet) | — |

## Wave 2 testing infrastructure (2026-05-05)

Vitest set up. 146 tests across 3 files.

| File | Tests | Coverage | Notes |
|---|---|---|---|
| `tests/dispatcher.test.ts` | ~75 | 94% stmt / 83% branch / 100% fn | `_shared/dispatcher.ts` |
| `tests/worker.test.ts` | ~55 | 96% stmt / 95% branch / 88% fn | `_shared/worker.ts` |
| `tests/validate-tier1.test.ts` | ~16 | subprocess-based; tests real repo + tmp fixture | `scripts/validate-tier1.cjs` |

**Test caught a real prototype-pollution bug** in `executeRun`: dictionary access
`registry[skillName]` resolves through `Object.prototype`, so a triggered_skill of
`"toString"` would invoke `Object.prototype.toString` as if it were a registered
skill. Fixed by guarding with `Object.prototype.hasOwnProperty.call(registry, skillName)`.

**Refactor:** pure logic moved to `supabase/functions/_shared/{dispatcher,worker}.ts`.
Edge Function `index.ts` files are now thin Deno-only shims that import from `_shared/`.
Both redeployed; smoke tests pass post-refactor. `_shared/` modules are environment-
agnostic — Deno (deploy) and Node/Vitest (tests) both consume them.

**Run tests:** `pnpm test` (single run) | `pnpm test:watch` (dev) | `pnpm test:coverage`.

## End-to-end verification (2026-05-05)

The Bài #5 Minions pattern is proven end-to-end via curl, no pg_cron yet:

1. INSERT row into `ops.scheduled_runs` with `triggered_skill='heartbeat-ping'`, `state='pending'`.
2. POST `/functions/v1/minion-worker` with `X-Worker-Auth`.
3. Response: `{"status":"ok","processed_count":1,"processed":[{"id":...,"status":"completed"}]}`.
4. SELECT confirms row state transitioned `pending → running → completed`, `output_payload` populated.
5. SELECT on `ops.audit_log` shows the heartbeat entry written by `minion-worker` itself.

This validates: atomic claim, skill registry dispatch, write-from-edge-fn, error/finalize paths.

## Recommended execution order (next session)

Tasks 1, 2, 3 from the original plan are all DONE as of 2026-05-05 (commits
e3f7a38, 685b16f, and 00014 migration applied). End-to-end Anthropic call
verified at 152 in / 270 out tokens via Haiku 4.5 (~$0.0015 dev cost).

Remaining work, in priority order:

1. **Begin Bài #11 `event-dispatcher`** — reuse the dispatcher Edge Function
   pattern but listen on `ops.events` INSERT via `pg_notify` instead of pg_cron.
   Tier 1 yaml: `event-subscriptions.yaml`.

2. **Bài #9 SOP execution** — `sop-execute` skill that orchestrates multi-step
   SOPs by chaining Minion jobs. Land last in Wave 2.

3. **GHA `regenerate-pg-cron`** — when more dispatcher schedules are enabled,
   automate cron entry generation from `knowledge/schedules.yaml` (today this
   is documented in `notes/pg-cron-setup.md` Step 4 for manual runs).

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
