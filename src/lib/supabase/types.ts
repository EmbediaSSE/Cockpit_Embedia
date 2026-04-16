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
