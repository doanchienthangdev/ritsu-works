-- ============================================================================
-- Migration 00017: Economic architecture tables
-- ============================================================================
-- Implements knowledge/economic-architecture.md three axes:
--   Axis 1 — Per-LLM-call cost attribution: ops.cost_attributions
--   Axis 2 — Monthly budget enforcement: ops.budget_alerts
--   Axis 3 — Weekly optimization review: ops.optimization_recommendations
--
-- Populated by:
--   - .claude/hooks/pre-llm-call-budget.md → cost_attributions on every call
--   - hook breach detection → budget_alerts
--   - 05-ai-ops/skills/cost-optimization-review → optimization_recommendations
-- ============================================================================

-- ----------------------------------------------------------------------------
-- ops.cost_attributions — Axis 1
-- ----------------------------------------------------------------------------
CREATE TABLE ops.cost_attributions (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id                   uuid REFERENCES ops.agent_runs(id) ON DELETE SET NULL,
  task_id                  uuid REFERENCES ops.tasks(id) ON DELETE SET NULL,
  agent_role               text NOT NULL,
  task_kind                text,
  model                    text NOT NULL,
  service_tier             text,                         -- 'standard'|'batch'|'priority'
  input_tokens             integer NOT NULL DEFAULT 0,
  cache_creation_tokens    integer NOT NULL DEFAULT 0,
  cache_read_tokens        integer NOT NULL DEFAULT 0,
  output_tokens            integer NOT NULL DEFAULT 0,
  cost_usd                 numeric(10, 6) NOT NULL,
  ts                       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_cost_attr_role_ts ON ops.cost_attributions (agent_role, ts DESC);
CREATE INDEX idx_cost_attr_kind ON ops.cost_attributions (agent_role, task_kind, ts DESC)
  WHERE task_kind IS NOT NULL;
CREATE INDEX idx_cost_attr_task ON ops.cost_attributions (task_id)
  WHERE task_id IS NOT NULL;
CREATE INDEX idx_cost_attr_ts ON ops.cost_attributions (ts DESC);

COMMENT ON TABLE ops.cost_attributions IS 'Per-LLM-call cost ledger (economic-architecture.md Axis 1). Populated by pre-llm-call-budget hook. Reconciled daily vs Anthropic Usage Admin API.';

-- ----------------------------------------------------------------------------
-- ops.budget_alerts — Axis 2 enforcement + Axis 3 health-score history
-- ----------------------------------------------------------------------------
CREATE TABLE ops.budget_alerts (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_kind          text NOT NULL,
  agent_role          text NOT NULL,
  period_month        date NOT NULL,                  -- YYYY-MM-01
  current_cost_usd    numeric(10, 4),
  budget_usd          numeric(10, 4),
  ratio               numeric(6, 4),                  -- current/budget (e.g., 0.8123)
  health_score        integer,
  score_breakdown     jsonb,
  ts                  timestamptz NOT NULL DEFAULT now(),
  resolved_ts         timestamptz,
  founder_action      text,

  CONSTRAINT budget_alerts_kind_valid CHECK (
    alert_kind IN ('warning_80', 'escalate_100', 'hard_block_150', 'health_score_low')
  )
);

CREATE INDEX idx_budget_alerts_role_period ON ops.budget_alerts (agent_role, period_month, alert_kind);
CREATE INDEX idx_budget_alerts_open ON ops.budget_alerts (alert_kind, ts DESC)
  WHERE resolved_ts IS NULL;

COMMENT ON TABLE ops.budget_alerts IS 'Per-role per-month budget breach events + weekly Economic Health Score history (economic-architecture.md Axes 2-3).';

-- ----------------------------------------------------------------------------
-- ops.optimization_recommendations — Axis 3 output
-- ----------------------------------------------------------------------------
CREATE TABLE ops.optimization_recommendations (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  generated_at             timestamptz NOT NULL DEFAULT now(),
  period_start             date NOT NULL,
  period_end               date NOT NULL,
  recommendation_kind      text NOT NULL,
  target_role              text,
  target_task_kind         text,
  current_cost_usd         numeric(10, 4),
  estimated_savings_usd    numeric(10, 4),
  risk_level               text NOT NULL,
  description              text NOT NULL,
  suggested_diff_path      text,
  status                   text NOT NULL DEFAULT 'proposed',
  pr_url                   text,
  founder_decision_ts      timestamptz,

  CONSTRAINT opt_rec_kind_valid CHECK (
    recommendation_kind IN (
      'model_downgrade', 'prompt_caching', 'batch_tier',
      'context_trim', 'task_kind_split', 'budget_adjust'
    )
  ),
  CONSTRAINT opt_rec_risk_valid CHECK (risk_level IN ('low', 'medium', 'high')),
  CONSTRAINT opt_rec_status_valid CHECK (
    status IN ('proposed', 'approved', 'rejected', 'implemented')
  )
);

CREATE INDEX idx_opt_rec_status ON ops.optimization_recommendations (status, generated_at DESC);
CREATE INDEX idx_opt_rec_role ON ops.optimization_recommendations (target_role, generated_at DESC)
  WHERE target_role IS NOT NULL;

COMMENT ON TABLE ops.optimization_recommendations IS 'Weekly cost-optimization-review skill output (economic-architecture.md Axis 3). Founder approves/rejects via Telegram→PR.';
