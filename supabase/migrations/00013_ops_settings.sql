-- 00013_ops_settings.sql
--
-- Bài #8 dependency: ops.settings — global key/value flags read by the
-- scheduled-run-dispatcher pre-flight checks.
--
-- Examples of settings the dispatcher consults:
--   founder_vacation_mode  : skip non-critical schedules
--   maintenance_window     : skip everything for N hours
--   global_dispatch_paused : kill switch for all scheduling
--
-- Founder updates this table; agents may READ via SELECT but most agents
-- should not need to. Only the dispatcher reads it on every fire.
--
-- Schema follows Bài #13 4-column convention loosely:
--   key (PK) | value (jsonb) | updated_at | updated_by

CREATE TABLE ops.settings (
  key         text PRIMARY KEY,
  value       jsonb NOT NULL,
  description text,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  updated_by  text NOT NULL                    -- role slug or 'founder'
);

COMMENT ON TABLE ops.settings IS
  'Bài #8 global flags. Read by dispatcher on every schedule fire (skip conditions). Founder writes.';

-- Trigger to keep updated_at fresh on UPDATE
CREATE OR REPLACE FUNCTION ops.touch_settings_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ops_settings_touch
  BEFORE UPDATE ON ops.settings
  FOR EACH ROW
  EXECUTE FUNCTION ops.touch_settings_updated_at();

-- RLS: founder dashboard reads/writes; agents inherit service_role bypass.
ALTER TABLE ops.settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY founder_read_settings ON ops.settings
  FOR SELECT
  TO authenticated
  USING (true);  -- any authenticated session may read; tighten later if multi-operator

CREATE POLICY founder_write_settings ON ops.settings
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Seed a few canonical keys with safe defaults.
INSERT INTO ops.settings (key, value, description, updated_by) VALUES
  ('founder_vacation_mode', '{"enabled": false}'::jsonb,
   'When enabled, dispatcher skips schedules not tagged critical.', 'founder'),
  ('maintenance_window', '{"enabled": false, "until": null}'::jsonb,
   'When enabled with future timestamp, dispatcher skips all schedules until expiry.', 'founder'),
  ('global_dispatch_paused', '{"enabled": false}'::jsonb,
   'Kill switch: when true, dispatcher refuses to enqueue any run.', 'founder')
ON CONFLICT (key) DO NOTHING;
