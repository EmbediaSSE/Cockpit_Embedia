-- Migration 012: VibeSE MVP Budget Baseline tracking
-- Tracks planned vs actual sprints, weeks, and costs per track, per baseline version.

-- ── Baselines table (one row per snapshot) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS vibese_budget_baselines (
  id                    uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  version               text NOT NULL,           -- 'B0', 'B1', ...
  baseline_date         date NOT NULL,
  sprints_total_min     int,
  sprints_total_max     int,
  weeks_total_min       int,
  weeks_total_max       int,
  cost_total_min_eur    numeric(10,2),
  cost_total_max_eur    numeric(10,2),
  notes                 text,
  created_at            timestamptz DEFAULT now()
);

-- ── Tracks table (one row per track per baseline) ────────────────────────────
CREATE TABLE IF NOT EXISTS vibese_budget_tracks (
  id                    uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  baseline_id           uuid REFERENCES vibese_budget_baselines(id) ON DELETE CASCADE,
  track_key             text NOT NULL,           -- 'ai_model', 'reqif', 'sysml_v2', 'capella', 'backend', 'frontend'
  track_name            text NOT NULL,
  category              text,                    -- 'ai', 'integration', 'infra', 'frontend'
  sort_order            int DEFAULT 0,

  -- Planned (from baseline)
  sprints_planned_min   int,
  sprints_planned_max   int,
  cost_planned_min_eur  numeric(10,2),
  cost_planned_max_eur  numeric(10,2),

  -- Actuals (updated as work progresses)
  sprints_actual        int,
  cost_actual_eur       numeric(10,2),
  progress_pct          int DEFAULT 0,           -- 0-100

  -- Status
  status                text DEFAULT 'not_started',  -- 'not_started' | 'in_progress' | 'done'
  risk_level            text DEFAULT 'low',           -- 'low' | 'medium' | 'high'
  notes                 text,

  updated_at            timestamptz DEFAULT now(),
  created_at            timestamptz DEFAULT now()
);

-- ── Indexes ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_vibese_budget_tracks_baseline
  ON vibese_budget_tracks(baseline_id);

-- ── RLS (same pattern as other tables — service role bypasses) ─────────────
ALTER TABLE vibese_budget_baselines ENABLE ROW LEVEL SECURITY;
ALTER TABLE vibese_budget_tracks ENABLE ROW LEVEL SECURITY;

-- Policies scoped to authenticated role only (anon has no access;
-- Cowork writes use the service role, which bypasses RLS).
-- Applied live on 2026-07-08 after Supabase advisor flagged rls_disabled_in_public.
CREATE POLICY "authenticated_read_budget_baselines" ON vibese_budget_baselines
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read_budget_tracks" ON vibese_budget_tracks
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_update_budget_tracks" ON vibese_budget_tracks
  FOR UPDATE TO authenticated USING (true);
