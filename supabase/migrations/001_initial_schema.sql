-- ============================================================
-- Embedia CEO Cockpit — Initial Schema
-- Matches: docs/04-data-architecture.md
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Users ─────────────────────────────────────────────────────

CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins can read all users"
  ON public.users FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
  );

-- ── Projects ──────────────────────────────────────────────────

CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  client TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL CHECK (category IN ('Consultancy', 'Product', 'Publishing', 'BD', 'ProfDevel', 'Operations')),
  stage TEXT NOT NULL CHECK (stage IN ('Won', 'Active', 'Planned', 'Concept', 'Backlog', 'Delivered', 'Published', 'Closed', 'On Hold')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'on_hold', 'completed', 'cancelled')),
  priority TEXT NOT NULL DEFAULT 'P2' CHECK (priority IN ('P0', 'P1', 'P2', 'P3')),
  summary TEXT,
  selling_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  margin_pct NUMERIC(5, 2) NOT NULL DEFAULT 0,
  target_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read projects"
  ON public.projects FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can modify projects"
  ON public.projects FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
  );

-- ── WBS Stages ────────────────────────────────────────────────

CREATE TABLE public.wbs_stages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0
);

ALTER TABLE public.wbs_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read WBS stages"
  ON public.wbs_stages FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- ── WBS Tasks ─────────────────────────────────────────────────

CREATE TABLE public.wbs_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stage_id UUID NOT NULL REFERENCES public.wbs_stages(id) ON DELETE CASCADE,
  task_code TEXT NOT NULL,
  name TEXT NOT NULL,
  effort_days NUMERIC(6, 1) NOT NULL DEFAULT 0,
  rate NUMERIC(10, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done', 'blocked')),
  assignee TEXT,
  due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.wbs_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read tasks"
  ON public.wbs_tasks FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can modify tasks"
  ON public.wbs_tasks FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
  );

-- ── Project Documents ─────────────────────────────────────────

CREATE TABLE public.project_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  doc_status TEXT NOT NULL DEFAULT 'Draft' CHECK (doc_status IN ('Draft', 'Review', 'Final')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.project_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read documents"
  ON public.project_documents FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- ── Project Risks ─────────────────────────────────────────────

CREATE TABLE public.project_risks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  level TEXT NOT NULL DEFAULT 'low' CHECK (level IN ('low', 'medium', 'high', 'critical')),
  description TEXT NOT NULL,
  mitigation TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'mitigated', 'accepted', 'closed'))
);

ALTER TABLE public.project_risks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read risks"
  ON public.project_risks FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- ── KPI Snapshots ─────────────────────────────────────────────

CREATE TABLE public.kpi_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  metric_name TEXT NOT NULL,
  value NUMERIC(12, 2) NOT NULL,
  metadata JSONB DEFAULT '{}',
  UNIQUE(project_id, date, metric_name)
);

ALTER TABLE public.kpi_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read KPIs"
  ON public.kpi_snapshots FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- ── Agent Conversations ───────────────────────────────────────

CREATE TABLE public.agent_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL CHECK (agent_type IN ('chief_of_staff', 'bizdev', 'mbse', 'fusa', 'cybersec', 'content', 'whitepaper')),
  title TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own conversations"
  ON public.agent_conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own conversations"
  ON public.agent_conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ── Conversation Messages ─────────────────────────────────────

CREATE TABLE public.conversation_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES public.agent_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
  content TEXT NOT NULL,
  tool_calls JSONB,
  tool_results JSONB,
  input_method TEXT NOT NULL DEFAULT 'text' CHECK (input_method IN ('text', 'voice')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.conversation_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own messages"
  ON public.conversation_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.agent_conversations c
      WHERE c.id = conversation_messages.conversation_id
        AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own messages"
  ON public.conversation_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.agent_conversations c
      WHERE c.id = conversation_messages.conversation_id
        AND c.user_id = auth.uid()
    )
  );

-- ── Pipeline Accounts ─────────────────────────────────────────

CREATE TABLE public.pipeline_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT '',
  country TEXT NOT NULL DEFAULT '',
  region TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  website TEXT NOT NULL DEFAULT '',
  icp_segment TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'identified' CHECK (status IN ('identified', 'contacted', 'qualified', 'proposal', 'won', 'lost')),
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pipeline_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read accounts"
  ON public.pipeline_accounts FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can modify accounts"
  ON public.pipeline_accounts FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
  );

-- ── Account Contacts ──────────────────────────────────────────

CREATE TABLE public.account_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES public.pipeline_accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  linkedin_url TEXT NOT NULL DEFAULT '',
  is_decision_maker BOOLEAN NOT NULL DEFAULT false
);

ALTER TABLE public.account_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read contacts"
  ON public.account_contacts FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- ── Audit Log ─────────────────────────────────────────────────

CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read audit log"
  ON public.audit_log FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
  );

-- ── Updated_at Trigger ────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER wbs_tasks_updated_at
  BEFORE UPDATE ON public.wbs_tasks
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER agent_conversations_updated_at
  BEFORE UPDATE ON public.agent_conversations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER pipeline_accounts_updated_at
  BEFORE UPDATE ON public.pipeline_accounts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── Indexes ───────────────────────────────────────────────────

CREATE INDEX idx_projects_status ON public.projects(status);
CREATE INDEX idx_projects_priority ON public.projects(priority);
CREATE INDEX idx_wbs_tasks_status ON public.wbs_tasks(status);
CREATE INDEX idx_wbs_tasks_due ON public.wbs_tasks(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX idx_kpi_snapshots_date ON public.kpi_snapshots(date);
CREATE INDEX idx_agent_conversations_user ON public.agent_conversations(user_id);
CREATE INDEX idx_conversation_messages_conv ON public.conversation_messages(conversation_id);
CREATE INDEX idx_pipeline_accounts_status ON public.pipeline_accounts(status);
CREATE INDEX idx_audit_log_created ON public.audit_log(created_at);
