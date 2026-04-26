-- ── Migration 008: Cowork Task Queue ─────────────────────────────────────────
-- Tasks dispatched from the cockpit chat to be processed by the Cowork
-- scheduled poller (runs every 1h when the desktop app is active).
-- Processing uses the Claude subscription — no API cost per task.

CREATE TYPE cowork_task_priority AS ENUM ('urgent', 'standard');
CREATE TYPE cowork_task_status   AS ENUM ('pending', 'processing', 'done', 'failed');

CREATE TABLE cowork_tasks (
  id             uuid                  DEFAULT gen_random_uuid() PRIMARY KEY,
  type           text                  NOT NULL,                        -- 'research' | 'document' | 'analysis' | 'email' | 'deck' | 'other'
  title          text                  NOT NULL,                        -- short human-readable description
  payload        jsonb                 NOT NULL DEFAULT '{}',           -- full task context (message, agent, history snapshot)
  priority       cowork_task_priority  NOT NULL DEFAULT 'standard',
  status         cowork_task_status    NOT NULL DEFAULT 'pending',
  result         text,                                                  -- markdown result written back by Cowork
  error          text,                                                  -- error message if failed
  requested_by   uuid                  REFERENCES users(id) ON DELETE SET NULL,
  created_at     timestamptz           NOT NULL DEFAULT now(),
  processing_at  timestamptz,                                          -- when Cowork picked it up
  processed_at   timestamptz                                           -- when Cowork finished
);

-- Index for the poller query: pending tasks ordered by priority then age
CREATE INDEX cowork_tasks_queue_idx ON cowork_tasks (status, priority DESC, created_at ASC)
  WHERE status = 'pending';

-- Index for the cockpit to fetch results by user
CREATE INDEX cowork_tasks_user_idx ON cowork_tasks (requested_by, created_at DESC);

-- RLS: users can only see their own tasks
ALTER TABLE cowork_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own tasks"
  ON cowork_tasks FOR SELECT
  USING (requested_by = auth.uid());

CREATE POLICY "Users can insert own tasks"
  ON cowork_tasks FOR INSERT
  WITH CHECK (requested_by = auth.uid());

-- Service role (used by API routes and Cowork poller) bypasses RLS automatically.
