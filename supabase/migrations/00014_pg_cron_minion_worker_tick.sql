-- 00014_pg_cron_minion_worker_tick.sql
-- =============================================================================
-- Wave 2 Task #1 — schedule minion-worker via pg_cron.
-- =============================================================================
--
-- Why only the worker tick (and NOT dispatcher schedules):
--   When ops.scheduled_runs has no pending rows the worker returns at zero
--   LLM cost (the queue check is a single SELECT). Scheduling worker-tick
--   is therefore safe to enable proactively without burning Anthropic tokens.
--
--   Dispatcher schedules (morning-brief-assembly etc., from knowledge/
--   schedules.yaml) are LEFT UNSCHEDULED here. They MUST NOT auto-fire until
--   the founder explicitly enables individual cron entries per
--   notes/pg-cron-setup.md Step 4 — that ceremony is intentionally manual to
--   avoid surprise spend.
--
-- IMPORTANT — hosted Supabase reality:
--   On hosted Supabase, the `postgres` role is NOT a true SUPERUSER, so
--   `ALTER DATABASE postgres SET app.worker_secret = '<value>'` fails with
--   `42501: permission denied to set parameter "app.worker_secret"` — both
--   from the SQL editor AND from the Management API SQL endpoint. The GUC
--   pattern below is therefore aspirational (correct for self-hosted) and
--   does not work on hosted Supabase.
--
-- Operational pattern that DOES work on hosted Supabase:
--   After applying this migration, run `scripts/wave2-bootstrap-cron-secrets.sh`
--   which uses `supabase db query --linked` to UNSCHEDULE + RESCHEDULE the
--   cron job with the worker secret inlined into `cron.job.command`. The
--   secret then lives in `cron.job` (DB-side, postgres-role-readable only)
--   instead of the migration file. Re-run the script on every rotation OR
--   after a `db reset` (the reset re-runs this migration which restores the
--   GUC-reading command, so the bootstrap must re-apply).
--
-- Behavior before bootstrap script runs:
--   Cron fires every minute. net.http_post sends a request with
--   X-Worker-Auth: <empty>. The Edge Function rejects with 401 (per
--   _shared/worker.ts verifyAuthHeader fail-closed semantics).
--   cron.job_run_details logs the 401s. No queue work, no LLM call, no cost.
--
-- Idempotency:
--   DO block first unschedules any existing job of the same name. Migration
--   can be re-applied safely (e.g. on `supabase db reset`).
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'minion-worker-tick') THEN
    PERFORM cron.unschedule('minion-worker-tick');
  END IF;

  PERFORM cron.schedule(
    'minion-worker-tick',
    '* * * * *',
    $cmd$
    SELECT net.http_post(
      url     := 'https://mntobbmieuoaxipnjaau.supabase.co/functions/v1/minion-worker',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'X-Worker-Auth', current_setting('app.worker_secret', true)
      ),
      body    := '{}'::jsonb
    );
    $cmd$
  );
END $$;

-- =============================================================================
-- Founder verification (run in Supabase SQL editor after this migration applies):
-- =============================================================================
--   -- 1. After bootstrap script runs, command should embed the secret literal
--   --    (length far above the GUC-reading command's ~250 chars). DO NOT
--   --    print `command` itself — it contains the secret.
--   SELECT jobid, jobname, schedule, active, length(command) AS cmd_len
--   FROM   cron.job
--   WHERE  jobname = 'minion-worker-tick';
--
--   -- 2. Confirm the cron job is registered and active:
--   SELECT jobid, jobname, schedule, active
--   FROM   cron.job
--   WHERE  jobname = 'minion-worker-tick';
--
--   -- 3. After waiting ~90 seconds, confirm at least one tick has run:
--   SELECT jobid, runid, status, return_message, start_time
--   FROM   cron.job_run_details
--   WHERE  jobid = (SELECT jobid FROM cron.job WHERE jobname = 'minion-worker-tick')
--   ORDER  BY start_time DESC
--   LIMIT  3;
--
-- Decommissioning (when no longer wanted):
--   SELECT cron.unschedule('minion-worker-tick');
-- =============================================================================
