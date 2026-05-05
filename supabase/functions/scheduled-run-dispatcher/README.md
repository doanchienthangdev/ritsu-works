# scheduled-run-dispatcher (Bài #8 Scheduling Dispatcher)

Wave 2 Edge Function. Invoked by `pg_cron` at the cadence of each schedule in `knowledge/schedules.yaml`.

## Status

**SCAFFOLD** — MVP path (auth + concurrency lock + insert) wired. Pre-flight stubs `[WAVE 2 EXT]` are placeholders pending:
- `ops.settings` table (skip conditions: `founder_vacation_mode`, `maintenance_window`, ...)
- HITL queue handoff (Tier C+ schedules → `ops.hitl_runs.pending_approval`)
- Budget hook (Bài #7 `pre-llm-call-budget`)

## Wiring (when ready to deploy)

```bash
# 1. Set the dispatcher secret (used to verify pg_cron is the caller)
supabase secrets set DISPATCHER_SECRET="$(openssl rand -hex 32)"

# 2. Deploy
supabase functions deploy scheduled-run-dispatcher --no-verify-jwt

# 3. Schedule via pg_cron (run in Supabase SQL editor; one row per schedule)
SELECT cron.schedule(
  'morning-brief-assembly',
  '45 5 * * *',
  $$
  SELECT net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/scheduled-run-dispatcher',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Dispatcher-Auth', current_setting('app.dispatcher_secret', true)
    ),
    body := jsonb_build_object('schedule_id', 'morning-brief-assembly')
  );
  $$
);
```

(`net.http_post` is the `pg_net` extension. Bài #8 prefers Postgres LISTEN/NOTIFY over HTTP for tighter audit, but pg_net is simpler for the MVP. Migration to NOTIFY can come in Wave 4 when MCP server is deployed.)

## Worker (downstream of this dispatcher)

This function only **enqueues** to `ops.scheduled_runs`. A separate worker (Wave 2 follow-up) polls the queue and:
1. Picks oldest `status='pending'` row, FOR UPDATE SKIP LOCKED.
2. Sets `status='running'`, `triggered_at=now()`.
3. Resolves the skill name → invokes via Anthropic API (Hybrid mode) or queues for founder review (Sub mode).
4. On completion: `status='completed'` + populates `agent_run_id`. On failure: applies `retry_policy`, eventually `status='dead_letter'`.

The worker is implemented in **Wave 2 Step 4h** as `ops.minion_jobs` worker (Bài #5 Minions queue).

## File map

```
supabase/functions/scheduled-run-dispatcher/
├── index.ts          # entry point; serves POST requests
├── README.md         # this file
└── _shared/          # (future) shared helpers
    └── schedules.ts  # generated bundle of schedules.yaml
```
