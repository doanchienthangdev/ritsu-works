-- 00023_pillar_rename_campaigns_default.sql
-- Pillar architecture v1.0.1 housekeeping.
--
-- Context: pillar architecture v1.0.1 deprecated '01-growth' and replaced it with
--   - '01-marketing' (evergreen function pillar)
--   - '02-sales' (evergreen function pillar)
--   - '03-gtm' (stage composition pillar — drives campaigns toward "100 paying who love")
--
-- 00018_orchestration_storage_growth.sql defined ops.campaigns with:
--   pillar text NOT NULL DEFAULT '01-growth'
--
-- After the rename, '01-growth' is a deprecated pillar slug. Any new campaign inserted
-- without an explicit pillar value would default to a now-invalid slug.
--
-- Decision: change default to '03-gtm' because at this stage (pre-PMF) ALL campaigns are
-- stage-pillar work (GTM owns the funnel). Post-PMF, when GTM dissolves, the column
-- can be migrated to default '01-marketing' (the evergreen home for campaigns).
--
-- Backfill: UPDATE existing rows. There should be zero production rows (0 paying users
-- as of 2026-05-15), but any dev/test rows with '01-growth' get rewritten for cleanliness.
--
-- Surfaced from /plan-eng-review 2026-05-15 (retroactive Eng finding E6).
-- HITL tier C (per HITL.md — schema migration on ops.* with default-value change).

BEGIN;

-- Backfill any existing rows (expected: 0 in production; non-zero in dev/test environments)
UPDATE ops.campaigns
   SET pillar = '03-gtm'
 WHERE pillar = '01-growth';

-- Change the column default for future inserts
ALTER TABLE ops.campaigns
  ALTER COLUMN pillar SET DEFAULT '03-gtm';

-- Document the change in column comment for future readers
COMMENT ON COLUMN ops.campaigns.pillar IS
  'Pillar that owns this campaign. Pillar slugs match knowledge/manifest.yaml tier1_canonical.pillars. '
  'Pre-v1.0.1 default was ''01-growth''; v1.0.1 deprecated that slug. '
  'Current default ''03-gtm'' reflects stage-pillar ownership during PMF push. '
  'Post-PMF (when GTM dissolves), default may be migrated to ''01-marketing''.';

COMMIT;
