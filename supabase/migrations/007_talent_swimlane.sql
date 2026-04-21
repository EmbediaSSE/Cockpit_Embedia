-- 007_talent_swimlane.sql
-- Adds 'talent' as a swimlane for recruitment / headhunting prospects
-- Run: paste into Supabase dashboard → SQL Editor

-- ── 1. Drop old swimlane check, add talent ────────────────────────────────────
ALTER TABLE pipeline_accounts
  DROP CONSTRAINT IF EXISTS pipeline_accounts_swimlane_check;

ALTER TABLE pipeline_accounts
  ADD CONSTRAINT pipeline_accounts_swimlane_check
    CHECK (swimlane IN ('customer', 'investor', 'ecosystem', 'talent'));

-- ── 2. Update IMEC to talent swimlane ─────────────────────────────────────────
UPDATE pipeline_accounts
  SET swimlane = 'talent'
  WHERE name = 'IMEC';
