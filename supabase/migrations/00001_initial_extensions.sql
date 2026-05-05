-- ============================================================================
-- Migration 00001: Initial extensions + ops schema
-- ============================================================================
-- Sets up Postgres extensions and ops.* schema for operational tables.
-- 
-- Bài toán reference:
-- - Bài #1 (4-Tier Truth Model): ops.* = TIER2 operational state
-- - Bài #4 (Memory): pgvector cho embeddings
-- - Bài #8 (Scheduling): pg_cron cho scheduled tasks
-- - Bài #11 (Events): outbox pattern requires ops.events
-- ============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";       -- Bài #4 + Bài #14 embeddings
CREATE EXTENSION IF NOT EXISTS "pg_cron";       -- Bài #8 scheduling
CREATE EXTENSION IF NOT EXISTS "pgcrypto";     -- digest() for hashing

-- Schemas
CREATE SCHEMA IF NOT EXISTS ops;
COMMENT ON SCHEMA ops IS 'Operational state (Tier 2). Read/written by AI workforce per RACI.';

-- Helper functions for state machine convention (Bài #13)
CREATE OR REPLACE FUNCTION ops.touch_state_since()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.state IS DISTINCT FROM OLD.state THEN
    NEW.state_since = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION ops.touch_state_since IS 'Trigger function to auto-update state_since when state changes. Bài #13 convention.';
