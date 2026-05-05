# pg_cron setup — wiring dispatcher + minion-worker (Wave 2)

The two Edge Functions are deployed and tested end-to-end via curl. To make
them run automatically, pg_cron in Supabase must call them on a schedule.
Secrets used by `cron.schedule()` cannot live in source control, so this
file documents the SQL needed plus the operational reality on hosted
Supabase.

## Hosted Supabase reality (read first)

The `postgres` role on hosted Supabase is NOT a true PostgreSQL SUPERUSER.
It cannot `ALTER DATABASE postgres SET app.<custom_param>` — the request
fails with `42501: permission denied to set parameter`. This is true both
from the SQL editor and from the Management API SQL endpoint
(`supabase db query --linked`). The GUC pattern (Steps 2-3 below) is
therefore aspirational; it works on self-hosted Postgres but not on
hosted Supabase.

**Operational pattern that works on hosted Supabase:**

1. Apply migration `00014_pg_cron_minion_worker_tick.sql` via
   `supabase db push --linked --yes`. This registers the cron job with the
   GUC-reading command (which will return NULL on hosted, leading to 401s).
2. Run `scripts/wave2-bootstrap-cron-secrets.sh`. The script unschedules
   and re-schedules the job with the worker secret INLINED into
   `cron.job.command`. The secret then lives in the `cron.job` row
   (postgres-role-readable only) instead of in source control.
3. Re-run the bootstrap script on every WORKER_SECRET rotation OR after
   any `supabase db reset` against the linked project (the reset re-runs
   migration 00014 which restores the GUC-version command).

The remainder of this document describes the GUC-based variant for
reference, plus the dispatcher-side schedules that are intentionally NOT
auto-cadenced today (founder enables individually when ready — Step 4).

## Step 1 — Pull the secrets from your local .env.local

```bash
# In your terminal:
grep -E "^(DISPATCHER_SECRET|WORKER_SECRET)=" /Users/doanchienthang/ritsu-works/runtime/secrets/.env.local
```

Copy both values; you'll paste them into Step 2 below. Treat them like
production credentials — paste only into the Supabase SQL editor for this
project, never share elsewhere.

## Step 2 — Open the Supabase SQL editor

https://supabase.com/dashboard/project/mntobbmieuoaxipnjaau/sql/new

## Step 3 — Set the secrets as database-level GUC parameters (one-time)

This stores the secrets as Postgres settings so cron jobs can read them
without inlining the value in every cron entry. Replace `<...>` placeholders
with the values you copied in Step 1, then run:

```sql
-- Replace the placeholder values:
ALTER DATABASE postgres SET app.dispatcher_secret = '<DISPATCHER_SECRET_VALUE>';
ALTER DATABASE postgres SET app.worker_secret     = '<WORKER_SECRET_VALUE>';
```

After running, **disconnect and reconnect** any open SQL session so the new
GUC values are visible (or just open a new SQL editor tab).

Verify:

```sql
-- Should return non-empty strings (don't print the values; just non-null).
SELECT current_setting('app.dispatcher_secret', true) IS NOT NULL AS dispatcher_set,
       current_setting('app.worker_secret', true)     IS NOT NULL AS worker_set;
```

## Step 4 — Schedule the dispatcher (sample)

This wires `morning-brief-assembly` (from `knowledge/schedules.yaml`) to fire at 05:45 every day. Repeat the pattern for each schedule.

```sql
SELECT cron.schedule(
  'morning-brief-assembly',
  '45 5 * * *',
  $$
  SELECT net.http_post(
    url     := 'https://mntobbmieuoaxipnjaau.supabase.co/functions/v1/scheduled-run-dispatcher',
    headers := jsonb_build_object(
      'Content-Type',     'application/json',
      'X-Dispatcher-Auth', current_setting('app.dispatcher_secret', true)
    ),
    body    := jsonb_build_object('schedule_id', 'morning-brief-assembly')::text::jsonb
  );
  $$
);
```

> Until the schedules.yaml bundler lands, the dispatcher returns `404 unknown_schedule`
> for any id not hardcoded in `SCHEDULES`. The cron job still fires and net.http_post
> is logged in `cron.job_run_details`, so the wiring itself is verifiable.

## Step 5 — Schedule the minion-worker (every minute)

```sql
SELECT cron.schedule(
  'minion-worker-tick',
  '* * * * *',
  $$
  SELECT net.http_post(
    url     := 'https://mntobbmieuoaxipnjaau.supabase.co/functions/v1/minion-worker',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'X-Worker-Auth', current_setting('app.worker_secret', true)
    ),
    body    := '{}'::jsonb
  );
  $$
);
```

## Step 6 — Verify cron jobs are registered

```sql
SELECT jobid, jobname, schedule, active
FROM cron.job
ORDER BY jobname;

-- After waiting 1-2 minutes, check execution history:
SELECT jobid, runid, status, start_time, end_time, return_message
FROM cron.job_run_details
ORDER BY start_time DESC
LIMIT 10;
```

`return_message` should contain HTTP response from the Edge Function. The
minion-worker should return `{"status":"ok","processed_count":0,"processed":[]}`
when the queue is empty (every minute).

## Step 7 — Smoke test the full chain

Insert a pending row, wait ≤ 1 minute, see it transition to completed:

```sql
INSERT INTO ops.scheduled_runs (schedule_id, scheduled_at, cron_expression, triggered_skill, state)
VALUES ('e2e-cron-smoke', now(), '* * * * *', 'heartbeat-ping', 'pending')
RETURNING id;

-- Wait 60-90 seconds, then:
SELECT id, schedule_id, state, output_payload, error, state_since
FROM ops.scheduled_runs
WHERE schedule_id = 'e2e-cron-smoke';
-- Expected: state = 'completed', output_payload = {"kind": "heartbeat", ...}
```

Cleanup when done:

```sql
DELETE FROM ops.scheduled_runs WHERE schedule_id = 'e2e-cron-smoke';
DELETE FROM ops.audit_log     WHERE action = 'heartbeat';
```

## Common issues

- **`net.http_post` not available.** The `pg_net` extension must be enabled.
  Run `CREATE EXTENSION IF NOT EXISTS pg_net;` once. Some Supabase plans
  enable it by default; ours did via migration 00001.
- **`current_setting('app.x', true)` returns NULL.** Step 3 wasn't run, OR
  the SQL session is older than the ALTER DATABASE call. Reconnect.
- **Cron job runs but Edge Function returns 401.** Secret was set with a
  trailing newline or pasted wrong. Re-run Step 3 with `pg_typeof()` check.
- **`cron.job_run_details` is empty.** pg_cron's `cron.job_run_details_retention`
  may be aggressive on Free tier. Check `cron.job` instead for the schedule
  itself.

## Rotation

When DISPATCHER_SECRET or WORKER_SECRET rotates:

1. Generate new value: `openssl rand -hex 32`
2. Update `runtime/secrets/.env.local`
3. `supabase secrets set DISPATCHER_SECRET="..."` (or WORKER_SECRET)
4. Re-run Step 3 above with the new value
5. No need to re-`cron.schedule` — jobs read `current_setting()` at fire time

## Decommissioning

To stop a cron job:

```sql
SELECT cron.unschedule('morning-brief-assembly');
SELECT cron.unschedule('minion-worker-tick');
```
