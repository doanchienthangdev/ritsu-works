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
-- Prerequisite (founder, one-time, in Supabase SQL editor):
--   The cron job reads the worker secret via current_setting() at fire time
--   so the secret never lives in source control. Founder must run ONCE:
--     ALTER DATABASE postgres SET app.worker_secret = '<WORKER_SECRET>';
--   The literal value comes from runtime/secrets/.env.local.
--   See notes/pg-cron-setup.md Step 3 for the full procedure including verify
--   query and rotation steps.
--
-- Behavior before founder runs the GUC step:
--   The cron job still fires every minute. net.http_post sends a request with
--   X-Worker-Auth: <empty>. The Edge Function rejects with 401 (per
--   _shared/worker.ts verifyAuthHeader fail-closed semantics). cron.job_run_
--   details logs the 401 reply. No queue work happens, no LLM call, no cost.
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
--   -- 1. Confirm GUC is set (must return TRUE, TRUE):
--   SELECT current_setting('app.worker_secret', true) IS NOT NULL AS worker_set,
--          length(current_setting('app.worker_secret', true)) >= 32  AS worker_long_enough;
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
