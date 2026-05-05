-- ============================================================================
-- Migration 00010: Row-Level Security (RLS) policies
-- ============================================================================
-- Generic RLS for ops.* tables + customer entity.
-- 
-- Roles assumed (created at app layer):
-- - service_role: full access (bypasses RLS) — used by Edge Functions
-- - authenticated: logged-in users via Supabase Auth
-- - anon: public, read-only certain entities
-- 
-- For project-specific RLS (e.g., customer can only see own data), add
-- migrations in 1xxxx_ range.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Enable RLS on ops.* tables
-- ----------------------------------------------------------------------------
ALTER TABLE ops.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.hitl_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.agent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.minion_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.scheduled_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.sop_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.kpi_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.mcp_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.knowledge_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.knowledge_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.knowledge_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.ingestion_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.attention_log ENABLE ROW LEVEL SECURITY;

-- Customer entity tables
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE persons ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_persons ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- Default policy: deny-all for non-service_role
-- ----------------------------------------------------------------------------
-- Service role (Edge Functions, background workers) bypasses RLS by default.
-- All other access must be explicitly granted via policies below.

-- ----------------------------------------------------------------------------
-- Founder dashboard read access (operational tables)
-- ----------------------------------------------------------------------------
-- Assumes: app sets `auth.jwt() ->> 'role'` to 'founder' for founder's session.

CREATE POLICY founder_read_audit_log ON ops.audit_log
  FOR SELECT
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'founder');

CREATE POLICY founder_read_events ON ops.events
  FOR SELECT
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'founder');

CREATE POLICY founder_read_tasks ON ops.tasks
  FOR SELECT
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'founder');

CREATE POLICY founder_read_hitl ON ops.hitl_runs
  FOR SELECT
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'founder');

CREATE POLICY founder_decide_hitl ON ops.hitl_runs
  FOR UPDATE
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'founder')
  WITH CHECK (auth.jwt() ->> 'role' = 'founder');

CREATE POLICY founder_read_agent_runs ON ops.agent_runs
  FOR SELECT
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'founder');

CREATE POLICY founder_read_minion_jobs ON ops.minion_jobs
  FOR SELECT
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'founder');

CREATE POLICY founder_read_scheduled ON ops.scheduled_runs
  FOR SELECT
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'founder');

CREATE POLICY founder_read_sop_runs ON ops.sop_runs
  FOR SELECT
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'founder');

CREATE POLICY founder_read_kpi ON ops.kpi_snapshots
  FOR SELECT
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'founder');

CREATE POLICY founder_read_alerts ON ops.alerts
  FOR SELECT
  TO authenticated
  USING (auth.jwt() ->> 'role' IN ('founder', 'operator'));

CREATE POLICY founder_acknowledge_alerts ON ops.alerts
  FOR UPDATE
  TO authenticated
  USING (auth.jwt() ->> 'role' IN ('founder', 'operator'));

CREATE POLICY founder_read_mcp_calls ON ops.mcp_calls
  FOR SELECT
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'founder');

CREATE POLICY founder_read_pages ON ops.knowledge_pages
  FOR SELECT
  TO authenticated
  USING (auth.jwt() ->> 'role' IN ('founder', 'operator'));

CREATE POLICY founder_read_links ON ops.knowledge_links
  FOR SELECT
  TO authenticated
  USING (auth.jwt() ->> 'role' IN ('founder', 'operator'));

CREATE POLICY founder_read_embeddings ON ops.knowledge_embeddings
  FOR SELECT
  TO authenticated
  USING (auth.jwt() ->> 'role' IN ('founder', 'operator'));

CREATE POLICY founder_read_decisions ON ops.decisions
  FOR SELECT
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'founder');

CREATE POLICY founder_decide ON ops.decisions
  FOR UPDATE
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'founder');

CREATE POLICY founder_read_ingestion ON ops.ingestion_jobs
  FOR SELECT
  TO authenticated
  USING (auth.jwt() ->> 'role' IN ('founder', 'operator'));

CREATE POLICY founder_read_attention ON ops.attention_log
  FOR SELECT
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'founder');

CREATE POLICY founder_log_attention ON ops.attention_log
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.jwt() ->> 'role' = 'founder');

-- ----------------------------------------------------------------------------
-- Customer self-access policies
-- ----------------------------------------------------------------------------
-- Customers can read own data via `auth.uid() = customer.id` mapping.
-- This requires app layer to set customer_id in JWT claims.

CREATE POLICY customer_read_self ON customers
  FOR SELECT
  TO authenticated
  USING (
    auth.jwt() ->> 'role' = 'customer'
    AND (auth.jwt() ->> 'customer_id')::uuid = id
  );

CREATE POLICY customer_read_self_person ON persons
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM customers c
      WHERE
        c.primary_person_id = persons.id
        AND auth.jwt() ->> 'role' = 'customer'
        AND (auth.jwt() ->> 'customer_id')::uuid = c.id
    )
  );

-- Founder + operator full access to customer data
CREATE POLICY founder_full_customers ON customers
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' IN ('founder', 'operator'))
  WITH CHECK (auth.jwt() ->> 'role' IN ('founder', 'operator'));

CREATE POLICY founder_full_persons ON persons
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' IN ('founder', 'operator'))
  WITH CHECK (auth.jwt() ->> 'role' IN ('founder', 'operator'));

CREATE POLICY founder_full_companies ON companies
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' IN ('founder', 'operator'))
  WITH CHECK (auth.jwt() ->> 'role' IN ('founder', 'operator'));

CREATE POLICY founder_full_company_persons ON company_persons
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' IN ('founder', 'operator'))
  WITH CHECK (auth.jwt() ->> 'role' IN ('founder', 'operator'));

-- ----------------------------------------------------------------------------
-- Project-specific RLS extensions
-- ----------------------------------------------------------------------------
-- Add additional RLS policies in migrations 1xxxx_ range for:
-- - Multi-tenant isolation (if applicable)
-- - Customer-segment-based access
-- - Operator scoping to specific pillars
-- - Time-bound access (e.g., trial users)
