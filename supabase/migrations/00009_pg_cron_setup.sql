-- ============================================================================
-- Migration 00009: pg_cron setup
-- ============================================================================
-- Bài #8 Scheduling Architecture: pg_cron-based dispatcher.
-- Reads schedules.yaml at app layer, fires pg_cron jobs that INSERT INTO
-- ops.scheduled_runs and trigger Edge Functions.
-- 
-- Note: Actual cron schedules are populated by app layer reading
-- knowledge/schedules.yaml. This migration only sets up infrastructure.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Schedule dispatcher trigger function
-- ----------------------------------------------------------------------------
-- Called by pg_cron at scheduled times. Creates ops.scheduled_runs row,
-- which triggers Edge Function via Supabase Realtime (or webhook).
CREATE OR REPLACE FUNCTION ops.schedule_dispatch(
  p_schedule_id text,
  p_cron_expression text
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_run_id uuid;
BEGIN
  INSERT INTO ops.scheduled_runs (
    scheduled_at,
    schedule_id,
    cron_expression,
    state
  )
  VALUES (
    now(),
    p_schedule_id,
    p_cron_expression,
    'pending'
  )
  RETURNING id INTO v_run_id;
  
  -- Notify event-dispatcher via NOTIFY (real-time pickup)
  PERFORM pg_notify(
    'schedule_fired',
    json_build_object(
      'run_id', v_run_id,
      'schedule_id', p_schedule_id,
      'fired_at', now()
    )::text
  );
  
  RETURN v_run_id;
END;
$$;

COMMENT ON FUNCTION ops.schedule_dispatch IS
  'Called by pg_cron at scheduled times. Creates run row + notifies dispatcher.';

-- ----------------------------------------------------------------------------
-- Event dispatcher trigger function (Bài #11)
-- ----------------------------------------------------------------------------
-- Called when ops.events row is inserted. Notifies external dispatcher
-- to read events table and route to SOPs per event-subscriptions.yaml.
CREATE OR REPLACE FUNCTION ops.notify_event_dispatcher()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM pg_notify(
    'event_inserted',
    json_build_object(
      'event_id', NEW.id,
      'event_type', NEW.event_type,
      'source', NEW.source,
      'occurred_at', NEW.occurred_at
    )::text
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_events_notify_dispatcher
  AFTER INSERT ON ops.events
  FOR EACH ROW
  EXECUTE FUNCTION ops.notify_event_dispatcher();

COMMENT ON FUNCTION ops.notify_event_dispatcher IS
  'Bài #11 outbox dispatcher: notify external worker when event inserted.';

-- ----------------------------------------------------------------------------
-- HITL notification trigger (Bài #2)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION ops.notify_hitl_router()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM pg_notify(
    'hitl_pending',
    json_build_object(
      'hitl_id', NEW.id,
      'tier', NEW.tier,
      'reason', NEW.reason,
      'created_at', NEW.created_at
    )::text
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_hitl_notify_router
  AFTER INSERT ON ops.hitl_runs
  FOR EACH ROW
  WHEN (NEW.state = 'pending')
  EXECUTE FUNCTION ops.notify_hitl_router();

COMMENT ON FUNCTION ops.notify_hitl_router IS
  'Bài #2: notify HITL router (Telegram bot) when new pending HITL run.';

-- ----------------------------------------------------------------------------
-- Default scheduled jobs (managed by app layer reading schedules.yaml)
-- ----------------------------------------------------------------------------
-- Example: register a cron job (app layer does this for each entry in schedules.yaml)
--
-- SELECT cron.schedule(
--   'morning-brief-assembly',
--   '45 5 * * *',
--   $$SELECT ops.schedule_dispatch('morning-brief-assembly', '45 5 * * *');$$
-- );

-- Cleanup: stale ops.events that failed to dispatch (dead letter queue)
SELECT cron.schedule(
  'events-dead-letter-cleanup',
  '0 4 * * *',
  $$
  UPDATE ops.events
  SET state = 'dead_letter'
  WHERE state = 'failed'
    AND dispatch_attempts >= 5
    AND last_attempt_at < now() - interval '1 hour';
  $$
);

-- Cleanup: completed minion jobs > 30 days
SELECT cron.schedule(
  'minion-jobs-cleanup',
  '0 4 * * *',
  $$
  DELETE FROM ops.minion_jobs
  WHERE state = 'completed'
    AND completed_at < now() - interval '30 days';
  $$
);
