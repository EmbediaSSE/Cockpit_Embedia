-- ============================================================
-- Embedia CEO Cockpit — Schema Additions (Migration 002)
-- Matches: SPEC.md §6
-- ============================================================

-- ── milestones ────────────────────────────────────────────────

CREATE TABLE public.milestones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target_date DATE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('done', 'active', 'pending', 'at_risk', 'overdue')),
  unlocks TEXT,
  dependencies TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read milestones"
  ON public.milestones FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can modify milestones"
  ON public.milestones FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
  );

-- ── decisions ─────────────────────────────────────────────────

CREATE TABLE public.decisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL,
  text TEXT NOT NULL,
  owner TEXT,
  deadline DATE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'deferred')),
  note TEXT,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read decisions"
  ON public.decisions FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can modify decisions"
  ON public.decisions FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
  );

CREATE TRIGGER decisions_updated_at
  BEFORE UPDATE ON public.decisions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── content_assets (GTM) ──────────────────────────────────────

CREATE TABLE public.content_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  asset_type TEXT NOT NULL
    CHECK (asset_type IN ('whitepaper', 'article', 'post', 'deck', 'video')),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'review', 'approved', 'published')),
  progress_pct INT NOT NULL DEFAULT 0,
  audience TEXT,
  channel TEXT,
  target_date DATE,
  publish_date DATE,
  word_count INT,
  summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.content_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read content assets"
  ON public.content_assets FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can modify content assets"
  ON public.content_assets FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
  );

CREATE TRIGGER content_assets_updated_at
  BEFORE UPDATE ON public.content_assets
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── news_items (Intelligence) ─────────────────────────────────

CREATE TABLE public.news_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source TEXT NOT NULL,
  title TEXT NOT NULL,
  url TEXT UNIQUE NOT NULL,
  summary TEXT,
  category TEXT NOT NULL
    CHECK (category IN ('automotive', 'sdv', 'mbse', 'ai_llm', 'standards', 'market')),
  relevance_score INT NOT NULL DEFAULT 50,
  published_at TIMESTAMPTZ,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  saved_to_briefing BOOLEAN NOT NULL DEFAULT false
);

ALTER TABLE public.news_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read news items"
  ON public.news_items FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can modify news items"
  ON public.news_items FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
  );

-- ── standards_watch ───────────────────────────────────────────

CREATE TABLE public.standards_watch (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL,
  body TEXT NOT NULL,
  title TEXT NOT NULL,
  last_updated DATE,
  relevance TEXT,
  url TEXT,
  notes TEXT
);

ALTER TABLE public.standards_watch ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read standards"
  ON public.standards_watch FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can modify standards"
  ON public.standards_watch FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
  );

-- ── news_digests ──────────────────────────────────────────────

CREATE TABLE public.news_digests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  week_of DATE NOT NULL,
  content TEXT NOT NULL,
  topics TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.news_digests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read digests"
  ON public.news_digests FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can modify digests"
  ON public.news_digests FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
  );

-- ── widget_preferences ────────────────────────────────────────

CREATE TABLE public.widget_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  widget_id TEXT NOT NULL,
  visible BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  size_override TEXT,
  UNIQUE(user_id, widget_id)
);

ALTER TABLE public.widget_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own widget preferences"
  ON public.widget_preferences FOR ALL
  USING (auth.uid() = user_id);

-- ── Additions to existing tables ─────────────────────────────

-- wbs_tasks: epic and sprint grouping
ALTER TABLE public.wbs_tasks ADD COLUMN IF NOT EXISTS epic TEXT;
ALTER TABLE public.wbs_tasks ADD COLUMN IF NOT EXISTS sprint_name TEXT;

-- projects: function area, phase, risks summary, dependencies
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS function_area TEXT
  CHECK (function_area IN ('Product', 'ThoughtLeadership', 'BizDev', 'ProfDevel', 'Operations'));
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS risks_summary JSONB DEFAULT '[]';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS dependencies_text TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS phase TEXT;

-- pipeline_accounts: last touch, next action, revenue potential, priority
ALTER TABLE public.pipeline_accounts ADD COLUMN IF NOT EXISTS last_touch DATE;
ALTER TABLE public.pipeline_accounts ADD COLUMN IF NOT EXISTS next_action TEXT;
ALTER TABLE public.pipeline_accounts ADD COLUMN IF NOT EXISTS revenue_potential NUMERIC(12,2) DEFAULT 0;
ALTER TABLE public.pipeline_accounts ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'P2'
  CHECK (priority IN ('P0', 'P1', 'P2', 'P3'));

-- ── Indexes ───────────────────────────────────────────────────

CREATE INDEX idx_milestones_project ON public.milestones(project_id);
CREATE INDEX idx_milestones_date ON public.milestones(target_date) WHERE target_date IS NOT NULL;
CREATE INDEX idx_decisions_status ON public.decisions(status);
CREATE INDEX idx_decisions_deadline ON public.decisions(deadline) WHERE deadline IS NOT NULL;
CREATE INDEX idx_content_assets_status ON public.content_assets(status);
CREATE INDEX idx_news_items_category ON public.news_items(category);
CREATE INDEX idx_news_items_relevance ON public.news_items(relevance_score DESC);
CREATE INDEX idx_news_items_fetched ON public.news_items(fetched_at DESC);
CREATE INDEX idx_widget_prefs_user ON public.widget_preferences(user_id);
