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
| #8 | Edge Function `scheduled-run-dispatcher` | ✅ DEPLOYED (auth + concurrency + insert verified) | — | bundler for schedules.yaml still TODO |
| #8 | GHA `regenerate-pg-cron` | ❌ TODO | Wave 2 | reads schedules.yaml, emits SQL |
| #8 | Skill worker (`ops.scheduled_runs` consumer) | ✅ DEPLOYED as `minion-worker` Edge Function (Bài #5 pattern) | — | LLM skills deferred until ANTHROPIC_API_KEY |
| #8 | pg_cron wiring (calls dispatcher + worker) | 🟨 docs ready (`notes/pg-cron-setup.md`) | founder runs SQL once | needs founder to paste secrets in SQL editor |
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

1. **Founder runs `notes/pg-cron-setup.md` Steps 1-7** to schedule both functions on real cron.
2. **Add ANTHROPIC_API_KEY** to `runtime/secrets/.env.local` AND `supabase secrets set` so LLM skills become callable in `minion-worker`.
3. **Write `scripts/wave2-bundle-schedules.cjs`** — reads `knowledge/schedules.yaml`, emits a TS file imported by `scheduled-run-dispatcher/index.ts` to populate the `SCHEDULES` const at build time. Until this lands, dispatcher returns `unknown_schedule` for any id.
4. **Register a real skill (e.g., `synthesize-morning-brief`)** in `minion-worker/index.ts` SKILL_REGISTRY with an Anthropic API call. End-to-end test: pg_cron → dispatcher → ops.scheduled_runs → minion-worker → Anthropic → output_payload.
5. **Begin Bài #11 `event-dispatcher`** — reuse the Edge Function pattern but listen on `ops.events` INSERT via `pg_notify` instead of pg_cron.
6. **Bài #9 SOP execution** — `sop-execute` skill that orchestrates multi-step SOPs by chaining Minion jobs. Land last in Wave 2.

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
