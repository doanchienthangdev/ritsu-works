-- ============================================================================
-- Migration 00002: ops core tables
-- ============================================================================
-- Core operational tables used across all bài toán.
--
-- Tables:
-- - ops.audit_log: append-only audit trail (Bài #1, all bài toán)
-- - ops.events: event outbox + dispatch tracking (Bài #11)
-- - ops.tasks: generic task queue (Bài #5)
-- - ops.hitl_runs: human-in-loop tracking (Bài #2)
-- - ops.agent_runs: agent execution log (Bài #5)
-- - ops.minion_jobs: deterministic work queue (Bài #5 + GBrain pattern)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- ops.audit_log — append-only audit trail
-- ----------------------------------------------------------------------------
CREATE TABLE ops.audit_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  occurred_at     timestamptz NOT NULL DEFAULT now(),
  actor_kind      text NOT NULL,                -- 'human' | 'agent' | 'system'
  actor_id        text NOT NULL,                -- agent slug, founder id, system component
  action          text NOT NULL,                -- 'create' | 'update' | 'delete' | 'transition' | etc.
  target_kind     text NOT NULL,                -- 'customer' | 'decision' | 'state_machine' | etc.
  target_id       text,
  payload         jsonb,                        -- action-specific context
  ip_address      inet,
  user_agent      text
);

CREATE INDEX idx_audit_log_occurred ON ops.audit_log (occurred_at DESC);
CREATE INDEX idx_audit_log_actor ON ops.audit_log (actor_kind, actor_id, occurred_at DESC);
CREATE INDEX idx_audit_log_target ON ops.audit_log (target_kind, target_id, occurred_at DESC);

COMMENT ON TABLE ops.audit_log IS 'Append-only audit trail. NEVER UPDATE/DELETE rows. Required for compliance + debugging.';

-- ----------------------------------------------------------------------------
-- ops.events — event outbox + dispatch (Bài #11)
-- ----------------------------------------------------------------------------
CREATE TABLE ops.events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  occurred_at     timestamptz NOT NULL DEFAULT now(),
  
  -- Event identification
  event_type      text NOT NULL,                -- e.g., 'ritsu.customer.activated'
  source          text NOT NULL,                -- 'internal' | 'stripe' | 'github' | 'telegram' | 'twitter'
  source_event_id text,                         -- external ID for dedup
  
  -- Payload
  payload         jsonb NOT NULL DEFAULT '{}'::jsonb,
  
  -- Outbox dispatch tracking (Bài #11 outbox pattern)
  state           text NOT NULL DEFAULT 'pending',  -- 'pending' | 'dispatching' | 'dispatched' | 'failed' | 'dead_letter'
  state_since     timestamptz NOT NULL DEFAULT now(),
  dispatch_attempts integer NOT NULL DEFAULT 0,
  last_attempt_at timestamptz,
  last_error      text,
  
  CONSTRAINT events_state_valid CHECK (state IN ('pending', 'dispatching', 'dispatched', 'failed', 'dead_letter'))
);

CREATE INDEX idx_events_pending ON ops.events (state, occurred_at) WHERE state = 'pending';
CREATE INDEX idx_events_type ON ops.events (event_type, occurred_at DESC);
CREATE INDEX idx_events_source ON ops.events (source, source_event_id) WHERE source_event_id IS NOT NULL;

CREATE TRIGGER trg_events_state_since
  BEFORE UPDATE ON ops.events
  FOR EACH ROW
  EXECUTE FUNCTION ops.touch_state_since();

COMMENT ON TABLE ops.events IS 'Event outbox (Bài #11). Insert events here; event-dispatcher reads + fires SOPs per event-subscriptions.yaml.';

-- ----------------------------------------------------------------------------
-- ops.tasks — generic task queue (Bài #5)
-- ----------------------------------------------------------------------------
CREATE TABLE ops.tasks (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  
  task_type       text NOT NULL,                -- skill name or SOP id
  input_payload   jsonb NOT NULL DEFAULT '{}'::jsonb,
  
  -- Assignment
  assignee_kind   text,                         -- 'agent' | 'human' | 'minion'
  assignee_id     text,                         -- agent slug or founder id
  
  -- State machine (Bài #13 convention)
  state           text NOT NULL DEFAULT 'pending',
  state_since     timestamptz NOT NULL DEFAULT now(),
  state_payload   jsonb,
  state_version   text NOT NULL DEFAULT '1.0.0',
  
  -- Output
  output_payload  jsonb,
  error           text,
  
  -- Metadata
  priority        integer NOT NULL DEFAULT 5,    -- 1 (highest) - 10 (lowest)
  parent_task_id  uuid REFERENCES ops.tasks(id),
  context_id      text,                          -- correlation ID
  
  CONSTRAINT tasks_state_valid CHECK (state IN ('pending', 'assigned', 'running', 'completed', 'failed', 'cancelled'))
);

CREATE INDEX idx_tasks_pending ON ops.tasks (priority, created_at) WHERE state = 'pending';
CREATE INDEX idx_tasks_assignee ON ops.tasks (assignee_kind, assignee_id, state);
CREATE INDEX idx_tasks_parent ON ops.tasks (parent_task_id) WHERE parent_task_id IS NOT NULL;
CREATE INDEX idx_tasks_context ON ops.tasks (context_id) WHERE context_id IS NOT NULL;

CREATE TRIGGER trg_tasks_state_since
  BEFORE UPDATE ON ops.tasks
  FOR EACH ROW
  EXECUTE FUNCTION ops.touch_state_since();

COMMENT ON TABLE ops.tasks IS 'Generic task queue (Bài #5). Used cho both subagent + human work.';

-- ----------------------------------------------------------------------------
-- ops.hitl_runs — Human-in-the-loop tracking (Bài #2)
-- ----------------------------------------------------------------------------
CREATE TABLE ops.hitl_runs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  
  -- HITL classification (Bài #2)
  tier            text NOT NULL,                 -- 'A' | 'B' | 'C' | 'D' | 'E'
  reason          text NOT NULL,                  -- why HITL was needed
  
  -- Source
  triggered_by_kind text NOT NULL,                -- 'sop' | 'event' | 'manual'
  triggered_by_id text NOT NULL,                  -- SOP id, event id, etc.
  
  -- Content for review
  proposal        jsonb NOT NULL,                 -- what AI proposes
  context         jsonb,                          -- relevant context for human
  
  -- Outcome
  state           text NOT NULL DEFAULT 'pending',
  state_since     timestamptz NOT NULL DEFAULT now(),
  decided_by      text,                           -- founder id or operator
  decided_at      timestamptz,
  decision        text,                           -- 'approved' | 'rejected' | 'modified'
  decision_payload jsonb,                          -- modifications if applicable
  decision_reason text,
  
  -- Routing
  notification_sent_to text[],                   -- ['telegram', 'email', 'dashboard']
  
  CONSTRAINT hitl_tier_valid CHECK (tier IN ('A', 'B', 'C', 'D', 'E')),
  CONSTRAINT hitl_state_valid CHECK (state IN ('pending', 'decided', 'expired', 'cancelled'))
);

CREATE INDEX idx_hitl_pending ON ops.hitl_runs (tier, created_at) WHERE state = 'pending';
CREATE INDEX idx_hitl_decided_by ON ops.hitl_runs (decided_by, decided_at DESC) WHERE decided_at IS NOT NULL;

CREATE TRIGGER trg_hitl_state_since
  BEFORE UPDATE ON ops.hitl_runs
  FOR EACH ROW
  EXECUTE FUNCTION ops.touch_state_since();

COMMENT ON TABLE ops.hitl_runs IS 'Human-in-the-loop runs (Bài #2). Tier A=auto, B=batch, C=immediate, D=critical, E=halt.';

-- ----------------------------------------------------------------------------
-- ops.agent_runs — agent execution log (Bài #5)
-- ----------------------------------------------------------------------------
CREATE TABLE ops.agent_runs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at      timestamptz NOT NULL DEFAULT now(),
  ended_at        timestamptz,
  
  -- Agent identification
  agent_slug      text NOT NULL,                 -- e.g., 'support-triager'
  agent_version   text NOT NULL,
  
  -- Trigger context
  triggered_by_kind text NOT NULL,
  triggered_by_id text NOT NULL,
  task_id         uuid REFERENCES ops.tasks(id),
  parent_run_id   uuid REFERENCES ops.agent_runs(id),
  
  -- Execution details
  state           text NOT NULL DEFAULT 'running',
  state_since     timestamptz NOT NULL DEFAULT now(),
  input_payload   jsonb,
  output_payload  jsonb,
  
  -- Cost tracking (Bài #7)
  llm_provider    text,                          -- 'anthropic' | 'openai' | null
  llm_model       text,
  tokens_input    integer,
  tokens_output   integer,
  cost_usd        numeric(10, 4),
  cost_bucket     text,                          -- maps to Bài #7 cost-bucket
  
  -- Error tracking
  error           text,
  error_at_step   text,
  
  CONSTRAINT agent_runs_state_valid CHECK (state IN ('running', 'completed', 'failed', 'cancelled'))
);

CREATE INDEX idx_agent_runs_agent ON ops.agent_runs (agent_slug, started_at DESC);
CREATE INDEX idx_agent_runs_task ON ops.agent_runs (task_id) WHERE task_id IS NOT NULL;
CREATE INDEX idx_agent_runs_cost ON ops.agent_runs (cost_bucket, started_at DESC) WHERE cost_bucket IS NOT NULL;

CREATE TRIGGER trg_agent_runs_state_since
  BEFORE UPDATE ON ops.agent_runs
  FOR EACH ROW
  EXECUTE FUNCTION ops.touch_state_since();

COMMENT ON TABLE ops.agent_runs IS 'Agent execution log (Bài #5). Tracks subagent calls với cost.';

-- ----------------------------------------------------------------------------
-- ops.minion_jobs — deterministic work queue (Bài #5 + GBrain pattern)
-- ----------------------------------------------------------------------------
CREATE TABLE ops.minion_jobs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  
  -- Job identification
  job_type        text NOT NULL,                 -- 'auto-link-extract' | 'embed-chunk' | etc.
  input_payload   jsonb NOT NULL,
  
  -- State (Bài #13)
  state           text NOT NULL DEFAULT 'pending',
  state_since     timestamptz NOT NULL DEFAULT now(),
  
  -- Execution
  worker_id       text,                          -- which worker picked it up
  started_at      timestamptz,
  completed_at    timestamptz,
  output_payload  jsonb,
  error           text,
  
  -- Retry tracking
  retry_count     integer NOT NULL DEFAULT 0,
  max_retries     integer NOT NULL DEFAULT 3,
  next_retry_at   timestamptz,
  
  -- Metadata
  context_id      text,                          -- correlation
  parent_run_id   uuid,                          -- often agent_runs.id
  
  CONSTRAINT minion_state_valid CHECK (state IN ('pending', 'claimed', 'running', 'completed', 'failed', 'dead_letter'))
);

CREATE INDEX idx_minion_pending ON ops.minion_jobs (created_at) WHERE state = 'pending';
CREATE INDEX idx_minion_retry ON ops.minion_jobs (next_retry_at) WHERE state = 'failed' AND next_retry_at IS NOT NULL;
CREATE INDEX idx_minion_type ON ops.minion_jobs (job_type, state);

CREATE TRIGGER trg_minion_state_since
  BEFORE UPDATE ON ops.minion_jobs
  FOR EACH ROW
  EXECUTE FUNCTION ops.touch_state_since();

COMMENT ON TABLE ops.minion_jobs IS 'Deterministic work queue (Bài #5 GBrain Minions pattern). 100x cost vs subagent for deterministic tasks.';
