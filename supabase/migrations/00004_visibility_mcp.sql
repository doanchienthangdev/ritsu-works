-- ============================================================================
-- Migration 00004: Visibility + MCP
-- ============================================================================
-- Bài #10 Real-Time Visibility: ops.kpi_snapshots, ops.alerts
-- Bài #12 MCP Integration: ops.mcp_calls
-- ============================================================================

-- ----------------------------------------------------------------------------
-- ops.kpi_snapshots — KPI time-series (Bài #10)
-- ----------------------------------------------------------------------------
CREATE TABLE ops.kpi_snapshots (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  measured_at     timestamptz NOT NULL DEFAULT now(),
  
  -- KPI identification (matches kpi-registry.yaml)
  kpi_id          text NOT NULL,                  -- e.g., 'minion_queue_depth'
  
  -- Value
  value           numeric NOT NULL,
  unit            text,                            -- 'count' | 'usd' | 'percent' | 'minutes'
  
  -- Dimensions
  dimensions      jsonb,                          -- {customer_segment: 'enterprise', region: 'eu'}
  
  -- Source
  source          text NOT NULL                   -- 'computed' | 'external' | 'manual'
);

-- Time-series optimized index
CREATE INDEX idx_kpi_snapshots_lookup ON ops.kpi_snapshots (kpi_id, measured_at DESC);
CREATE INDEX idx_kpi_snapshots_time ON ops.kpi_snapshots (measured_at DESC);

COMMENT ON TABLE ops.kpi_snapshots IS 'KPI time-series (Bài #10). Append-only. Use materialized views for aggregations.';

-- ----------------------------------------------------------------------------
-- ops.alerts — alert lifecycle (Bài #10)
-- ----------------------------------------------------------------------------
CREATE TABLE ops.alerts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fired_at        timestamptz NOT NULL DEFAULT now(),
  
  -- Alert identification (matches alert-rules.yaml)
  rule_id         text NOT NULL,                  -- e.g., 'minion_queue_critical'
  severity        text NOT NULL,                  -- 'info' | 'warning' | 'critical'
  
  -- Context
  triggering_kpi  text,
  triggering_value numeric,
  payload         jsonb,
  
  -- State (Bài #13)
  state           text NOT NULL DEFAULT 'firing',
  state_since     timestamptz NOT NULL DEFAULT now(),
  
  acknowledged_at timestamptz,
  acknowledged_by text,
  resolved_at     timestamptz,
  resolved_by     text,
  resolution_note text,
  
  -- Routing
  notified_channels text[],                       -- ['telegram', 'email', 'dashboard']
  
  CONSTRAINT alerts_severity_valid CHECK (severity IN ('info', 'warning', 'critical')),
  CONSTRAINT alerts_state_valid CHECK (state IN ('firing', 'acknowledged', 'resolved', 'silenced'))
);

CREATE INDEX idx_alerts_active ON ops.alerts (severity, fired_at DESC) WHERE state IN ('firing', 'acknowledged');
CREATE INDEX idx_alerts_rule ON ops.alerts (rule_id, fired_at DESC);

CREATE TRIGGER trg_alerts_state_since
  BEFORE UPDATE ON ops.alerts
  FOR EACH ROW
  EXECUTE FUNCTION ops.touch_state_since();

COMMENT ON TABLE ops.alerts IS 'Alert lifecycle (Bài #10). Routes per alert-rules.yaml.';

-- ----------------------------------------------------------------------------
-- ops.mcp_calls — MCP tool execution log (Bài #12)
-- ----------------------------------------------------------------------------
CREATE TABLE ops.mcp_calls (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  called_at       timestamptz NOT NULL DEFAULT now(),
  completed_at    timestamptz,
  
  -- Tool identification (matches mcp-tools.yaml)
  tool_id         text NOT NULL,                  -- e.g., 'ritsu.kpi.snapshot'
  
  -- Caller
  caller_kind     text NOT NULL,                  -- 'claude_code' | 'codex' | 'agent'
  caller_id       text NOT NULL,                  -- session/agent identifier
  caller_role     text NOT NULL,                  -- 'founder' | 'operator' | 'customer'
  
  -- Input/output
  input_payload   jsonb,
  output_payload  jsonb,
  
  -- Authorization (Bài #12)
  role_check_passed boolean NOT NULL,
  hitl_required   boolean NOT NULL DEFAULT false,
  hitl_run_id     uuid REFERENCES ops.hitl_runs(id),
  
  -- Result
  state           text NOT NULL DEFAULT 'pending',
  state_since     timestamptz NOT NULL DEFAULT now(),
  error           text,
  
  CONSTRAINT mcp_state_valid CHECK (state IN ('pending', 'authorizing', 'running', 'completed', 'failed', 'denied'))
);

CREATE INDEX idx_mcp_calls_caller ON ops.mcp_calls (caller_kind, caller_id, called_at DESC);
CREATE INDEX idx_mcp_calls_tool ON ops.mcp_calls (tool_id, called_at DESC);
CREATE INDEX idx_mcp_calls_active ON ops.mcp_calls (state, called_at DESC) WHERE state IN ('pending', 'authorizing', 'running');

CREATE TRIGGER trg_mcp_calls_state_since
  BEFORE UPDATE ON ops.mcp_calls
  FOR EACH ROW
  EXECUTE FUNCTION ops.touch_state_since();

COMMENT ON TABLE ops.mcp_calls IS 'MCP tool execution log (Bài #12). Audit trail of every tool call.';
