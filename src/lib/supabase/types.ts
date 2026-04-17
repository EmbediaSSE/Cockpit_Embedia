// Database types — matches 04-data-architecture.md schema
// Will be auto-generated from Supabase once connected

export type UserRole = "admin" | "member";

export type ProjectCategory = "Consultancy" | "Product" | "Publishing" | "BD" | "ProfDevel" | "Operations";
export type ProjectStage = "Won" | "Active" | "Planned" | "Concept" | "Backlog";
export type ProjectStatus = "active" | "pending" | "on_hold" | "completed";
export type Priority = "P0" | "P1" | "P2" | "P3";
export type TaskStatus = "todo" | "in_progress" | "done" | "blocked";
export type AccountStatus = "identified" | "contacted" | "qualified" | "proposal" | "won" | "lost";
export type AgentType = "chief_of_staff" | "bizdev" | "mbse" | "fusa" | "cybersec" | "content" | "whitepaper";
export type RiskLevel = "low" | "medium" | "high" | "critical";

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
}

export type FunctionArea = "Product" | "ThoughtLeadership" | "BizDev" | "ProfDevel" | "Operations";

export interface Project {
  id: string;
  code: string;
  name: string;
  client: string;
  category: ProjectCategory;
  stage: ProjectStage;
  status: ProjectStatus;
  priority: Priority;
  summary: string | null;
  selling_price: number;
  margin_pct: number;
  target_date: string | null;
  // Migration 002 additions
  function_area: FunctionArea | null;
  phase: string | null;
  risks_summary: unknown[];
  dependencies_text: string | null;
  created_at: string;
  updated_at: string;
}

export interface WbsStage {
  id: string;
  project_id: string;
  name: string;
  sort_order: number;
  tasks?: WbsTask[];
}

export interface WbsTask {
  id: string;
  stage_id: string;
  task_code: string;
  name: string;
  effort_days: number;
  rate: number;
  status: TaskStatus;
  assignee: string | null;
  due_date: string | null;
  // Migration 002 additions
  epic: string | null;
  sprint_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectDocument {
  id: string;
  project_id: string;
  name: string;
  file_path: string;
  doc_status: "Draft" | "Review" | "Final";
  created_at: string;
}

export interface ProjectRisk {
  id: string;
  project_id: string;
  level: RiskLevel;
  description: string;
  mitigation: string | null;
  status: "open" | "mitigated" | "accepted" | "closed";
}

export interface KpiSnapshot {
  id: string;
  project_id: string | null;
  date: string;
  metric_name: string;
  value: number;
  metadata: Record<string, unknown>;
}

export interface PipelineAccount {
  id: string;
  name: string;
  category: string;
  country: string;
  region: string;
  city: string;
  website: string;
  icp_segment: string;
  status: AccountStatus;
  notes: string;
  contacts?: AccountContact[];
  // Migration 002 additions
  last_touch: string | null;
  next_action: string | null;
  revenue_potential: number;
  priority: Priority;
  created_at: string;
  updated_at: string;
}

export interface AccountContact {
  id: string;
  account_id: string;
  name: string;
  title: string;
  email: string;
  linkedin_url: string;
  is_decision_maker: boolean;
}

export interface Milestone {
  id: string;
  project_id: string | null;
  name: string;
  target_date: string | null;
  status: "done" | "active" | "pending" | "at_risk" | "overdue";
  unlocks: string | null;
  dependencies: string | null;
  sort_order: number;
  created_at: string;
}

export interface Decision {
  id: string;
  code: string;
  text: string;
  owner: string | null;
  deadline: string | null;
  status: "pending" | "approved" | "rejected" | "deferred";
  note: string | null;
  project_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContentAsset {
  id: string;
  project_id: string | null;
  title: string;
  asset_type: "whitepaper" | "article" | "post" | "deck" | "video";
  status: "draft" | "review" | "approved" | "published";
  progress_pct: number;
  audience: string | null;
  channel: string | null;
  target_date: string | null;
  publish_date: string | null;
  word_count: number | null;
  summary: string | null;
  created_at: string;
  updated_at: string;
}

export type NewsCategory = "automotive" | "sdv" | "mbse" | "ai_llm" | "standards" | "market";

export interface NewsItem {
  id: string;
  source: string;
  title: string;
  url: string;
  summary: string | null;
  category: NewsCategory;
  relevance_score: number;
  published_at: string | null;
  fetched_at: string;
  saved_to_briefing: boolean;
}

export interface StandardsWatch {
  id: string;
  code: string;
  body: string;
  title: string;
  last_updated: string | null;
  relevance: string | null;
  url: string | null;
  notes: string | null;
}

export interface NewsDigest {
  id: string;
  week_of: string;
  content: string;
  topics: string[];
  created_at: string;
}

export interface WidgetPreference {
  id: string;
  user_id: string;
  widget_id: string;
  visible: boolean;
  sort_order: number;
  size_override: string | null;
}

// Panel types for DetailPanel
export type PanelType = "project" | "task" | "milestone" | "account" | "decision" | "agent" | "news" | "content";

export interface PanelRef {
  type: PanelType;
  id: string;
}

export interface AgentConversation {
  id: string;
  user_id: string;
  agent_type: AgentType;
  title: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConversationMessage {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  tool_calls: unknown | null;
  tool_results: unknown | null;
  input_method: "text" | "voice";
  created_at: string;
}
