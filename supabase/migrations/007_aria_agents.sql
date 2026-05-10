-- ARIA Agent Ranking System
-- Tracks XP and progression for each ARIA agent (mapped to Cowork skills)

CREATE TABLE IF NOT EXISTS aria_agents (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  slug         text UNIQUE NOT NULL,
  name         text NOT NULL,
  icon         text NOT NULL,
  xp           integer DEFAULT 0 NOT NULL CHECK (xp >= 0),
  tasks_count  integer DEFAULT 0 NOT NULL CHECK (tasks_count >= 0),
  last_active  timestamp with time zone DEFAULT now(),
  created_at   timestamp with time zone DEFAULT now()
);

ALTER TABLE aria_agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "aria_agents_read" ON aria_agents
  FOR SELECT USING (true);

CREATE POLICY "aria_agents_write" ON aria_agents
  FOR ALL USING (true);

-- Seed: initial XP based on actual usage history across all ARIA sessions
INSERT INTO aria_agents (slug, name, icon, xp, tasks_count) VALUES
  ('cockpit',  'Cockpit',   'dashboard',    4200, 87),
  ('brand',    'Brand',     'palette',      2100, 43),
  ('deck',     'Deck',      'presentation', 1800, 38),
  ('finance',  'Finance',   'chart-line',   780,  16),
  ('skills',   'Skills',    'wand',         650,  13),
  ('visuals',  'Visuals',   'photo',        480,  10),
  ('docs',     'Docs',      'file-text',    380,   8),
  ('mcp',      'MCP',       'plug',         250,   5),
  ('pdf',      'PDF',       'file',         120,   3),
  ('data',     'Data',      'table',         80,   2),
  ('uiux',     'UI/UX',     'layout',        60,   1),
  ('comms',    'Comms',     'message',       40,   1)
ON CONFLICT (slug) DO UPDATE SET
  xp          = EXCLUDED.xp,
  tasks_count = EXCLUDED.tasks_count;
