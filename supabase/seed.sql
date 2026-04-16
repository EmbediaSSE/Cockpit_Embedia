-- ============================================================
-- Embedia CEO Cockpit — Seed Data
-- Source: War Room Cockpit PROJECTS array + accounts.json
-- ============================================================

-- ── Projects ──────────────────────────────────────────────────

INSERT INTO public.projects (id, code, name, client, category, stage, status, priority, summary, selling_price, margin_pct, target_date) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'CB-TME-001', 'Codebeamer RM Configuration', 'Toyota Motor Europe', 'Consultancy', 'Won', 'active', 'P0',
   'End-to-end requirements management configuration for TCU platform using PTC Codebeamer. Covers item types, workflows, traceability, and reporting dashboards.',
   30000, 83, '2025-06-30'),

  ('a1000000-0000-0000-0000-000000000002', 'MBSE-001', 'AI Agent — MBSE', 'Embedia', 'Product', 'Active', 'active', 'P0',
   'On-premise MBSE reasoning agent. RAG-based context ingestion from SysML models, requirements docs, and architecture artefacts. Sprint 1: core pipeline.',
   0, 0, '2025-09-30'),

  ('a1000000-0000-0000-0000-000000000003', 'WP-001', 'MBSE Adoption Roadmap', 'Embedia', 'Publishing', 'Active', 'active', 'P1',
   'White paper: a practitioner roadmap for MBSE adoption in mechatronic enterprises. 8 chapters, ~60 pages. 80% draft complete.',
   0, 0, '2025-04-21'),

  ('a1000000-0000-0000-0000-000000000004', 'FUSA-001', 'AI Agent — FuSa', 'Embedia', 'Product', 'Planned', 'pending', 'P1',
   'Functional safety reasoning agent for ISO 26262 compliance support. HARA, FMEA, ASIL decomposition, safety case generation.',
   0, 0, NULL),

  ('a1000000-0000-0000-0000-000000000005', 'CYBER-001', 'AI Agent — CyberSec', 'Embedia', 'Product', 'Planned', 'pending', 'P2',
   'Cybersecurity agent for ISO/SAE 21434 and UN R155. TARA support, threat modelling, risk treatment plans.',
   0, 0, NULL),

  ('a1000000-0000-0000-0000-000000000006', 'COCKPIT-001', 'CEO War Room Cockpit', 'Embedia', 'Operations', 'Active', 'active', 'P0',
   'Web application for cockpit.embedia.io. Multi-agent chat, portfolio view, BD pipeline, voice input. Next.js + Supabase + Claude API.',
   0, 0, '2025-05-31'),

  ('a1000000-0000-0000-0000-000000000007', 'BD-001', 'BD Pipeline — DACH & Nordics', 'Embedia', 'BD', 'Active', 'active', 'P1',
   'Business development pipeline management for automotive OEMs, Tier-1s, and engineering service providers in DACH and Nordics.',
   0, 0, NULL),

  ('a1000000-0000-0000-0000-000000000008', 'LY2-001', 'Lightyear LY2 — Systems Architecture', 'Lightyear', 'Consultancy', 'Backlog', 'on_hold', 'P3',
   'Systems architecture support for solar electric vehicle programme. Currently on hold pending Lightyear restructuring.',
   0, 0, NULL);

-- ── WBS Stages (Codebeamer project) ──────────────────────────

INSERT INTO public.wbs_stages (id, project_id, name, sort_order) VALUES
  ('b1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'Requirements Analysis', 1),
  ('b1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001', 'Configuration', 2),
  ('b1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000001', 'Testing & Handover', 3);

-- ── WBS Tasks ─────────────────────────────────────────────────

INSERT INTO public.wbs_tasks (id, stage_id, task_code, name, effort_days, rate, status, assignee, due_date) VALUES
  ('c1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'CB-T01', 'Stakeholder interviews', 2, 1200, 'done', 'Safouen', '2025-04-01'),
  ('c1000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000001', 'CB-T02', 'Item type mapping', 3, 1200, 'done', 'Safouen', '2025-04-05'),
  ('c1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000002', 'CB-T03', 'Workflow configuration', 5, 1200, 'in_progress', 'Safouen', '2025-04-20'),
  ('c1000000-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000002', 'CB-T04', 'Traceability rules', 3, 1200, 'todo', 'Safouen', '2025-04-25'),
  ('c1000000-0000-0000-0000-000000000005', 'b1000000-0000-0000-0000-000000000003', 'CB-T05', 'UAT and handover', 4, 1200, 'todo', 'Safouen', '2025-05-10');

-- ── WBS Stages (MBSE Agent) ──────────────────────────────────

INSERT INTO public.wbs_stages (id, project_id, name, sort_order) VALUES
  ('b2000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000002', 'Sprint 1 — Core Pipeline', 1),
  ('b2000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000002', 'Sprint 2 — Reasoning', 2);

INSERT INTO public.wbs_tasks (id, stage_id, task_code, name, effort_days, rate, status, assignee, due_date) VALUES
  ('c2000000-0000-0000-0000-000000000001', 'b2000000-0000-0000-0000-000000000001', 'MBSE-T01', 'PDF ingestion pipeline', 3, 0, 'done', 'Safouen', '2025-04-08'),
  ('c2000000-0000-0000-0000-000000000002', 'b2000000-0000-0000-0000-000000000001', 'MBSE-T02', 'RAG retrieval + embedding', 4, 0, 'in_progress', 'Safouen', '2025-04-18'),
  ('c2000000-0000-0000-0000-000000000003', 'b2000000-0000-0000-0000-000000000001', 'MBSE-T03', 'Sprint 1 demo', 1, 0, 'todo', 'Safouen', '2025-04-14'),
  ('c2000000-0000-0000-0000-000000000004', 'b2000000-0000-0000-0000-000000000002', 'MBSE-T04', 'Chain-of-thought prompts', 5, 0, 'todo', NULL, '2025-05-02');

-- ── WBS Stages (White Paper) ─────────────────────────────────

INSERT INTO public.wbs_stages (id, project_id, name, sort_order) VALUES
  ('b3000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000003', 'Writing', 1),
  ('b3000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000003', 'Review & Publish', 2);

INSERT INTO public.wbs_tasks (id, stage_id, task_code, name, effort_days, rate, status, assignee, due_date) VALUES
  ('c3000000-0000-0000-0000-000000000001', 'b3000000-0000-0000-0000-000000000001', 'WP-T01', 'Chapters 1-3 draft', 5, 0, 'done', 'Safouen', '2025-03-30'),
  ('c3000000-0000-0000-0000-000000000002', 'b3000000-0000-0000-0000-000000000001', 'WP-T02', 'Chapters 4-6 draft', 5, 0, 'in_progress', 'Safouen', '2025-04-10'),
  ('c3000000-0000-0000-0000-000000000003', 'b3000000-0000-0000-0000-000000000001', 'WP-T03', 'Chapter 4 review', 2, 0, 'todo', 'Safouen', '2025-04-14'),
  ('c3000000-0000-0000-0000-000000000004', 'b3000000-0000-0000-0000-000000000002', 'WP-T04', 'Final review + formatting', 3, 0, 'todo', 'Safouen', '2025-04-21');

-- ── KPI Snapshots ─────────────────────────────────────────────

INSERT INTO public.kpi_snapshots (project_id, date, metric_name, value, metadata) VALUES
  (NULL, '2025-04-15', 'active_projects', 6, '{}'),
  (NULL, '2025-04-15', 'revenue_pipeline', 247000, '{"unit": "EUR"}'),
  (NULL, '2025-04-15', 'avg_margin', 72, '{"unit": "%"}'),
  ('a1000000-0000-0000-0000-000000000002', '2025-04-15', 'sprint_velocity', 14, '{"unit": "points", "sprint": 1}'),
  (NULL, '2025-04-15', 'overdue_items', 2, '{"tasks": 1, "milestones": 1}');

-- ── Pipeline Accounts (DACH & Nordics) ────────────────────────

INSERT INTO public.pipeline_accounts (id, name, category, country, region, city, website, icp_segment, status, notes) VALUES
  ('d1000000-0000-0000-0000-000000000001', 'Continental AG', 'Tier-1 Supplier', 'Germany', 'DACH', 'Hanover', 'continental.com', 'Tier-1 ADAS/EE', 'contacted',
   'Initial outreach via LinkedIn. Interest in MBSE tooling for EE architecture.'),
  ('d1000000-0000-0000-0000-000000000002', 'ZF Friedrichshafen', 'Tier-1 Supplier', 'Germany', 'DACH', 'Friedrichshafen', 'zf.com', 'Tier-1 Chassis/Safety', 'identified',
   'Strong FuSa needs. Target the safety engineering team.'),
  ('d1000000-0000-0000-0000-000000000003', 'Volvo Cars', 'OEM', 'Sweden', 'Nordics', 'Gothenburg', 'volvocars.com', 'OEM Premium', 'qualified',
   'Engineering leadership interested in MBSE adoption roadmap. Potential consulting engagement.'),
  ('d1000000-0000-0000-0000-000000000004', 'Scania', 'OEM', 'Sweden', 'Nordics', 'Södertälje', 'scania.com', 'OEM Commercial Vehicle', 'identified',
   'Commercial vehicle focus. Cybersec compliance a known gap.'),
  ('d1000000-0000-0000-0000-000000000005', 'BMW Group', 'OEM', 'Germany', 'DACH', 'Munich', 'bmwgroup.com', 'OEM Premium', 'identified',
   'Large E/E transformation programme. Long sales cycle but high value.'),
  ('d1000000-0000-0000-0000-000000000006', 'Infineon Technologies', 'Semiconductor', 'Germany', 'DACH', 'Neubiberg', 'infineon.com', 'Semiconductor Automotive', 'contacted',
   'Application engineering team exploring MBSE for SoC development.'),
  ('d1000000-0000-0000-0000-000000000007', 'KONE', 'Machinery', 'Finland', 'Nordics', 'Espoo', 'kone.com', 'Machinery/Elevator', 'identified',
   'Mechatronic systems — elevator control. Adjacent to automotive methods.');

-- ── Account Contacts ──────────────────────────────────────────

INSERT INTO public.account_contacts (account_id, name, title, email, linkedin_url, is_decision_maker) VALUES
  ('d1000000-0000-0000-0000-000000000001', 'Dr. Thomas Müller', 'VP Systems Engineering', '', 'linkedin.com/in/thomasmueller', true),
  ('d1000000-0000-0000-0000-000000000001', 'Anna Schmidt', 'MBSE Lead', '', 'linkedin.com/in/annaschmidt', false),
  ('d1000000-0000-0000-0000-000000000003', 'Erik Johansson', 'Director Architecture', '', 'linkedin.com/in/erikjohansson', true),
  ('d1000000-0000-0000-0000-000000000003', 'Sara Lindgren', 'Engineering Manager', '', 'linkedin.com/in/saralindgren', false),
  ('d1000000-0000-0000-0000-000000000006', 'Dr. Michael Weber', 'Head of Application Engineering', '', 'linkedin.com/in/michaelweber', true);

-- ── Project Risks ─────────────────────────────────────────────

INSERT INTO public.project_risks (project_id, level, description, mitigation, status) VALUES
  ('a1000000-0000-0000-0000-000000000002', 'medium', 'RAG accuracy below threshold for safety-critical documents', 'Implement chunk-level confidence scoring and human-in-the-loop verification', 'open'),
  ('a1000000-0000-0000-0000-000000000006', 'medium', 'Cockpit project competing with MBSE Agent sprint for Safouen''s time', 'Time-box cockpit to 2h/day max; defer non-critical features to Phase 2', 'open'),
  ('a1000000-0000-0000-0000-000000000001', 'low', 'TME requirements scope creep beyond contracted item types', 'Scope boundary documented in SoW; change request process in place', 'mitigated'),
  ('a1000000-0000-0000-0000-000000000003', 'high', 'White paper review deadline at risk — Chapter 4 not yet reviewed', 'Prioritise WP-T03 this week; accept partial review if needed', 'open');
