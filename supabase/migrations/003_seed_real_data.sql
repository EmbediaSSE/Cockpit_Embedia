-- ============================================================
-- Embedia CEO Cockpit — Real Operational Seed Data (Migration 003)
-- Source: 2026-04-14-embedia-ceo-dashboard.html
-- Matches: SPEC.md §7
-- ============================================================

-- ── Helper: temp vars for project IDs ────────────────────────
-- We use DO blocks to capture UUIDs for FK references

DO $$
DECLARE
  -- Product workstreams
  p_mbse        UUID;
  p_fusa        UUID;
  p_cyber       UUID;
  p_platform    UUID;
  p_hoopx       UUID;
  p_cockpit     UUID;

  -- Consultancy
  p_cbtme       UUID;
  p_togaf       UUID;

  -- Thought Leadership
  p_wp_mbse     UUID;
  p_wp_fusa     UUID;
  p_wp_cyber    UUID;
  p_wp_ee       UUID;
  p_wp_dt       UUID;
  p_wp_agile    UUID;

  -- BizDev
  p_bd_dach     UUID;
  p_bd_nord     UUID;

  -- Operations
  p_ops_fin     UUID;
  p_ops_brand   UUID;

  -- WBS stage IDs (MBSE sprint)
  s_mbse_p      UUID;
  s_mbse_d      UUID;
  s_mbse_c      UUID;
  s_mbse_e      UUID;
  s_mbse_t      UUID;

  -- WBS stage IDs (FuSa)
  s_fusa_p      UUID;
  s_fusa_d      UUID;
  s_fusa_c      UUID;
  s_fusa_t      UUID;

  -- WBS stage IDs (Cyber)
  s_cyber_p     UUID;
  s_cyber_d     UUID;
  s_cyber_c     UUID;
  s_cyber_t     UUID;

  -- WBS stage IDs (Platform)
  s_plat_i      UUID;
  s_plat_d      UUID;
  s_plat_o      UUID;
  s_plat_t      UUID;

BEGIN

-- ── PROJECTS ──────────────────────────────────────────────────

-- Product
INSERT INTO public.projects (code, name, client, category, stage, status, priority, summary, function_area, phase, target_date)
VALUES ('MBSE-001', 'AI Agent — MBSE', 'Embedia', 'Product', 'Active', 'active', 'P0',
  'On-prem MBSE reasoning agent trained on Embedia project corpus. Covers SysML v2, requirements traceability, digital thread analysis. Target: Tier-1 suppliers and OEMs.',
  'Product', 'Sprint 1', '2025-09-30')
RETURNING id INTO p_mbse;

INSERT INTO public.projects (code, name, client, category, stage, status, priority, summary, function_area, phase, target_date)
VALUES ('FUSA-001', 'AI Agent — FuSa', 'Embedia', 'Product', 'Planned', 'pending', 'P1',
  'Functional safety reasoning agent (ISO 26262 / IEC 61508). HARA templates, FMEA review, safety goal derivation, FTA analysis support. Builds on MBSE agent kernel.',
  'Product', 'Planned', NULL)
RETURNING id INTO p_fusa;

INSERT INTO public.projects (code, name, client, category, stage, status, priority, summary, function_area, phase, target_date)
VALUES ('CYBER-001', 'AI Agent — CyberSec', 'Embedia', 'Product', 'Planned', 'pending', 'P2',
  'Cybersecurity agent (ISO/SAE 21434 / UNECE R155). TARA automation, threat classification, cybersecurity goals, CSMS gap analysis.',
  'Product', 'Planned', NULL)
RETURNING id INTO p_cyber;

INSERT INTO public.projects (code, name, client, category, stage, status, priority, summary, function_area, phase, target_date)
VALUES ('PLAT-001', 'Agent Platform & Infra', 'Embedia', 'Product', 'Active', 'active', 'P0',
  'Common runtime for all Embedia AI agents: RAG pipeline, auth, usage telemetry, multi-tenant configuration, on-prem deployment packaging (Docker/K8s).',
  'Product', 'Foundation', '2025-07-31')
RETURNING id INTO p_platform;

INSERT INTO public.projects (code, name, client, category, stage, status, priority, summary, function_area, phase, target_date)
VALUES ('HOOPX-001', 'HoopX Platform', 'HoopX / Embedia', 'Product', 'Concept', 'pending', 'P2',
  'Basketball analytics and team management platform. AI-assisted player tracking, game stats, coach dashboards. Adjacent to core Embedia automotive business.',
  'Product', 'Concept', NULL)
RETURNING id INTO p_hoopx;

INSERT INTO public.projects (code, name, client, category, stage, status, priority, summary, function_area, phase, target_date)
VALUES ('COCKPIT-001', 'CEO War Room Cockpit', 'Embedia', 'Operations', 'Active', 'active', 'P0',
  'Web application at cockpit.embedia.io — single operational screen for the CEO/CTO. Next.js + Supabase + Anthropic SDK. Widget-based, role-aware, AI-integrated.',
  'Operations', 'MVP', '2025-05-31')
RETURNING id INTO p_cockpit;

-- Consultancy
INSERT INTO public.projects (code, name, client, category, stage, status, priority, summary, function_area, selling_price, margin_pct, target_date)
VALUES ('CB-TME-001', 'Codebeamer RM Configuration', 'Toyota Motor Europe', 'Consultancy', 'Won', 'active', 'P0',
  'Requirements management tool configuration for TME EE department. PTC Integrity → Codebeamer migration. 3 workshops + implementation sprint.',
  'Operations', 30000, 83, '2025-06-30')
RETURNING id INTO p_cbtme;

INSERT INTO public.projects (code, name, client, category, stage, status, priority, summary, function_area, target_date)
VALUES ('TOGAF-001', 'TOGAF EA Framework', 'Embedia', 'ProfDevel', 'Delivered', 'completed', 'P2',
  'TOGAF Architecture Documentation: Business, Application, Data, Technology architecture views. Capability maps, building blocks, architecture governance.',
  'Operations', '2026-04-15')
RETURNING id INTO p_togaf;

-- Thought Leadership (whitepapers as projects for tracking)
INSERT INTO public.projects (code, name, client, category, stage, status, priority, summary, function_area, target_date)
VALUES ('WP-001', 'WP: MBSE Adoption Roadmap', 'Embedia', 'Publishing', 'Active', 'active', 'P1',
  'White paper: MBSE adoption roadmap for mechatronic enterprises. Audience: engineering directors at Tier-1 suppliers and OEMs.',
  'ThoughtLeadership', '2025-05-15')
RETURNING id INTO p_wp_mbse;

INSERT INTO public.projects (code, name, client, category, stage, status, priority, summary, function_area, target_date)
VALUES ('WP-002', 'WP: FuSa AI Augmentation', 'Embedia', 'Publishing', 'Planned', 'pending', 'P2',
  'White paper: How AI augments functional safety processes under ISO 26262. Target: safety engineers and system architects.',
  'ThoughtLeadership', '2025-07-31')
RETURNING id INTO p_wp_fusa;

INSERT INTO public.projects (code, name, client, category, stage, status, priority, summary, function_area, target_date)
VALUES ('WP-003', 'WP: CyberSec Compliance Playbook', 'Embedia', 'Publishing', 'Planned', 'pending', 'P3',
  'White paper: Practical ISO/SAE 21434 + UNECE R155 compliance playbook for OEMs and Tier-1 suppliers.',
  'ThoughtLeadership', '2025-08-31')
RETURNING id INTO p_wp_cyber;

INSERT INTO public.projects (code, name, client, category, stage, status, priority, summary, function_area, target_date)
VALUES ('WP-004', 'WP: EE Architecture Patterns', 'Embedia', 'Publishing', 'Planned', 'pending', 'P3',
  'White paper: E/E architecture patterns for zonal vs. domain architectures in SDV. Includes Autosar adaptive.',
  'ThoughtLeadership', '2025-09-30')
RETURNING id INTO p_wp_ee;

INSERT INTO public.projects (code, name, client, category, stage, status, priority, summary, function_area, target_date)
VALUES ('WP-005', 'WP: Digital Thread in Practice', 'Embedia', 'Publishing', 'Planned', 'pending', 'P3',
  'White paper: End-to-end digital thread implementation guide for automotive mechatronic systems.',
  'ThoughtLeadership', '2025-10-31')
RETURNING id INTO p_wp_dt;

INSERT INTO public.projects (code, name, client, category, stage, status, priority, summary, function_area, target_date)
VALUES ('WP-006', 'WP: Agile MBSE', 'Embedia', 'Publishing', 'Planned', 'pending', 'P3',
  'White paper: Agile MBSE — combining SysML v2 modelling with Scrum/SAFe delivery cadence.',
  'ThoughtLeadership', '2025-11-30')
RETURNING id INTO p_wp_agile;

-- BizDev
INSERT INTO public.projects (code, name, client, category, stage, status, priority, summary, function_area)
VALUES ('BD-DACH-001', 'BD — DACH Region', 'Embedia', 'BD', 'Active', 'active', 'P1',
  'Business development in DACH: Germany, Austria, Switzerland. Target: OEMs (BMW, Volkswagen Group) and Tier-1 suppliers (Continental, ZF, Bosch). Approach: LinkedIn outreach, white paper thought leadership, PROSTEP events.',
  'BizDev')
RETURNING id INTO p_bd_dach;

INSERT INTO public.projects (code, name, client, category, stage, status, priority, summary, function_area)
VALUES ('BD-NORD-001', 'BD — Nordics Region', 'Embedia', 'BD', 'Active', 'active', 'P1',
  'Business development in Nordics: Sweden, Finland, Denmark, Norway. Target: Volvo Cars, Scania, Sandvik, KONE. Approach: white paper distribution, engineering community presence.',
  'BizDev')
RETURNING id INTO p_bd_nord;

-- Operations
INSERT INTO public.projects (code, name, client, category, stage, status, priority, summary, function_area)
VALUES ('OPS-FIN-001', 'Financial Operations Setup', 'Embedia', 'Operations', 'Active', 'active', 'P1',
  'Setup of Belgian entity financial operations: accounting software, invoicing workflow, VAT registration, bank account linkage, expense tracking.',
  'Operations')
RETURNING id INTO p_ops_fin;

INSERT INTO public.projects (code, name, client, category, stage, status, priority, summary, function_area)
VALUES ('OPS-BRAND-001', 'Brand & Visual Identity', 'Embedia', 'Operations', 'Active', 'active', 'P2',
  'Embedia brand system: logo variants, colour palette, typography, presentation templates, white paper template, social media kit.',
  'Operations')
RETURNING id INTO p_ops_brand;

-- ── WBS STAGES & TASKS — MBSE Agent (Sprint 1) ───────────────

INSERT INTO public.wbs_stages (project_id, name, sort_order) VALUES (p_mbse, 'Platform', 1) RETURNING id INTO s_mbse_p;
INSERT INTO public.wbs_stages (project_id, name, sort_order) VALUES (p_mbse, 'Data & RAG', 2) RETURNING id INTO s_mbse_d;
INSERT INTO public.wbs_stages (project_id, name, sort_order) VALUES (p_mbse, 'Core Agent', 3) RETURNING id INTO s_mbse_c;
INSERT INTO public.wbs_stages (project_id, name, sort_order) VALUES (p_mbse, 'Evaluation', 4) RETURNING id INTO s_mbse_e;
INSERT INTO public.wbs_stages (project_id, name, sort_order) VALUES (p_mbse, 'Testing', 5) RETURNING id INTO s_mbse_t;

INSERT INTO public.wbs_tasks (stage_id, task_code, name, status, effort_days, epic, sprint_name, due_date) VALUES
  (s_mbse_p, 'M01', 'Set up dev environment (Docker + LangChain)',    'done',        1,   'Platform',  'Sprint 1', '2025-04-05'),
  (s_mbse_p, 'M02', 'Scaffold agent service (FastAPI)',                'done',        1,   'Platform',  'Sprint 1', '2025-04-07'),
  (s_mbse_p, 'M03', 'Anthropic SDK integration (Claude Sonnet)',       'done',        1,   'Platform',  'Sprint 1', '2025-04-07'),
  (s_mbse_p, 'M04', 'Auth middleware (API key)',                       'in_progress', 1,   'Platform',  'Sprint 1', '2025-04-18'),
  (s_mbse_d, 'M05', 'Document ingestion pipeline (PDF → chunks)',      'done',        2,   'RAG',       'Sprint 1', '2025-04-10'),
  (s_mbse_d, 'M06', 'Embedding model selection and benchmarking',      'done',        1,   'RAG',       'Sprint 1', '2025-04-10'),
  (s_mbse_d, 'M07', 'Vector store setup (Chroma)',                     'done',        1,   'RAG',       'Sprint 1', '2025-04-12'),
  (s_mbse_d, 'M08', 'Ingest DT2 TCU corpus',                          'done',        1,   'RAG',       'Sprint 1', '2025-04-12'),
  (s_mbse_d, 'M09', 'Ingest Lightyear LY2 corpus',                    'done',        1,   'RAG',       'Sprint 1', '2025-04-14'),
  (s_mbse_d, 'M10', 'Retrieval quality evaluation (MRR, recall@5)',    'in_progress', 2,   'RAG',       'Sprint 1', '2025-04-20'),
  (s_mbse_c, 'M11', 'MBSE system prompt engineering',                  'in_progress', 2,   'Core',      'Sprint 1', '2025-04-20'),
  (s_mbse_c, 'M12', 'Requirements traceability tool',                  'todo',        2,   'Core',      'Sprint 1', '2025-04-25'),
  (s_mbse_c, 'M13', 'SysML v2 block diagram parser',                   'todo',        3,   'Core',      'Sprint 1', '2025-04-28'),
  (s_mbse_c, 'M14', 'Digital thread gap analysis tool',                'todo',        2,   'Core',      'Sprint 1', '2025-04-30'),
  (s_mbse_c, 'M15', 'MBSE maturity assessment tool',                   'todo',        2,   'Core',      'Sprint 1', '2025-05-05'),
  (s_mbse_c, 'M16', 'Multi-turn conversation memory',                  'todo',        1,   'Core',      'Sprint 1', '2025-05-05'),
  (s_mbse_e, 'M17', 'Benchmark dataset creation (50 Q&A pairs)',       'todo',        2,   'Eval',      'Sprint 1', '2025-05-10'),
  (s_mbse_e, 'M18', 'Automated eval harness (RAGAS)',                  'todo',        2,   'Eval',      'Sprint 1', '2025-05-12'),
  (s_mbse_e, 'M19', 'Baseline accuracy measurement',                   'todo',        1,   'Eval',      'Sprint 1', '2025-05-14'),
  (s_mbse_e, 'M20', 'Iterative prompt optimisation (target: >85%)',    'todo',        3,   'Eval',      'Sprint 1', '2025-05-20'),
  (s_mbse_t, 'M21', 'Unit tests: retrieval pipeline',                  'todo',        1,   'Testing',   'Sprint 1', '2025-05-22'),
  (s_mbse_t, 'M22', 'Integration tests: agent API',                    'todo',        1,   'Testing',   'Sprint 1', '2025-05-24'),
  (s_mbse_t, 'M23', 'Alpha user test session with Safouen',            'todo',        1,   'Testing',   'Sprint 1', '2025-05-28');

-- ── WBS STAGES & TASKS — FuSa Agent ──────────────────────────

INSERT INTO public.wbs_stages (project_id, name, sort_order) VALUES (p_fusa, 'Planning', 1) RETURNING id INTO s_fusa_p;
INSERT INTO public.wbs_stages (project_id, name, sort_order) VALUES (p_fusa, 'Domain Knowledge', 2) RETURNING id INTO s_fusa_d;
INSERT INTO public.wbs_stages (project_id, name, sort_order) VALUES (p_fusa, 'Agent Core', 3) RETURNING id INTO s_fusa_c;
INSERT INTO public.wbs_stages (project_id, name, sort_order) VALUES (p_fusa, 'Testing', 4) RETURNING id INTO s_fusa_t;

INSERT INTO public.wbs_tasks (stage_id, task_code, name, status, effort_days, epic, sprint_name) VALUES
  (s_fusa_p, 'F01', 'Define FuSa agent scope and use cases',          'todo', 2, 'Planning', 'Sprint 2'),
  (s_fusa_p, 'F02', 'ISO 26262 corpus collection and curation',       'todo', 3, 'Planning', 'Sprint 2'),
  (s_fusa_p, 'F03', 'HARA template library creation',                 'todo', 2, 'Planning', 'Sprint 2'),
  (s_fusa_d, 'F04', 'Ingest ISO 26262 Part 3, 4, 6, 8, 9, 10',      'todo', 2, 'Domain',   'Sprint 2'),
  (s_fusa_d, 'F05', 'Ingest Embedia FuSa reference projects',         'todo', 1, 'Domain',   'Sprint 2'),
  (s_fusa_d, 'F06', 'FMEA/FTA structured output schema',             'todo', 2, 'Domain',   'Sprint 2'),
  (s_fusa_d, 'F07', 'Safety goal derivation reasoning chain',        'todo', 3, 'Domain',   'Sprint 2'),
  (s_fusa_c, 'F08', 'FuSa system prompt engineering',                'todo', 2, 'Core',     'Sprint 2'),
  (s_fusa_c, 'F09', 'HARA generation tool',                          'todo', 3, 'Core',     'Sprint 2'),
  (s_fusa_c, 'F10', 'FMEA review and gap analysis tool',             'todo', 3, 'Core',     'Sprint 2'),
  (s_fusa_c, 'F11', 'Functional safety concept drafting tool',       'todo', 3, 'Core',     'Sprint 2'),
  (s_fusa_t, 'F12', 'Benchmark: 30 HARA Q&A pairs',                 'todo', 2, 'Testing',  'Sprint 2'),
  (s_fusa_t, 'F13', 'Alpha session with FuSa domain expert',         'todo', 1, 'Testing',  'Sprint 2');

-- ── WBS STAGES & TASKS — CyberSec Agent ──────────────────────

INSERT INTO public.wbs_stages (project_id, name, sort_order) VALUES (p_cyber, 'Planning', 1) RETURNING id INTO s_cyber_p;
INSERT INTO public.wbs_stages (project_id, name, sort_order) VALUES (p_cyber, 'Domain Knowledge', 2) RETURNING id INTO s_cyber_d;
INSERT INTO public.wbs_stages (project_id, name, sort_order) VALUES (p_cyber, 'Agent Core', 3) RETURNING id INTO s_cyber_c;
INSERT INTO public.wbs_stages (project_id, name, sort_order) VALUES (p_cyber, 'Testing', 4) RETURNING id INTO s_cyber_t;

INSERT INTO public.wbs_tasks (stage_id, task_code, name, status, effort_days, epic, sprint_name) VALUES
  (s_cyber_p, 'C01', 'Define CyberSec agent scope (21434 + R155)',   'todo', 2, 'Planning', 'Sprint 3'),
  (s_cyber_p, 'C02', 'TARA template and threat taxonomy',            'todo', 2, 'Planning', 'Sprint 3'),
  (s_cyber_d, 'C03', 'Ingest ISO/SAE 21434 corpus',                 'todo', 2, 'Domain',   'Sprint 3'),
  (s_cyber_d, 'C04', 'Ingest UNECE R155/R156 corpus',               'todo', 1, 'Domain',   'Sprint 3'),
  (s_cyber_d, 'C05', 'Threat taxonomy library (STRIDE, EVITA)',      'todo', 2, 'Domain',   'Sprint 3'),
  (s_cyber_c, 'C06', 'CyberSec system prompt engineering',           'todo', 2, 'Core',     'Sprint 3'),
  (s_cyber_c, 'C07', 'TARA automation tool',                        'todo', 4, 'Core',     'Sprint 3'),
  (s_cyber_c, 'C08', 'CSMS gap analysis tool',                      'todo', 3, 'Core',     'Sprint 3'),
  (s_cyber_c, 'C09', 'Cybersecurity goal derivation tool',          'todo', 2, 'Core',     'Sprint 3'),
  (s_cyber_t, 'C10', 'Benchmark: 30 TARA Q&A pairs',               'todo', 2, 'Testing',  'Sprint 3'),
  (s_cyber_t, 'C11', 'Alpha session with security domain expert',   'todo', 1, 'Testing',  'Sprint 3');

-- ── WBS STAGES & TASKS — Agent Platform ──────────────────────

INSERT INTO public.wbs_stages (project_id, name, sort_order) VALUES (p_platform, 'Infrastructure', 1) RETURNING id INTO s_plat_i;
INSERT INTO public.wbs_stages (project_id, name, sort_order) VALUES (p_platform, 'Developer', 2) RETURNING id INTO s_plat_d;
INSERT INTO public.wbs_stages (project_id, name, sort_order) VALUES (p_platform, 'Operations', 3) RETURNING id INTO s_plat_o;
INSERT INTO public.wbs_stages (project_id, name, sort_order) VALUES (p_platform, 'Testing', 4) RETURNING id INTO s_plat_t;

INSERT INTO public.wbs_tasks (stage_id, task_code, name, status, effort_days, epic, sprint_name) VALUES
  (s_plat_i, 'P01', 'Multi-tenant agent configuration schema',       'in_progress', 2, 'Infra',   'Sprint 1'),
  (s_plat_i, 'P02', 'Docker packaging (agent + RAG + API)',          'todo',        2, 'Infra',   'Sprint 1'),
  (s_plat_i, 'P03', 'Kubernetes helm chart (on-prem deploy)',        'todo',        3, 'Infra',   'Sprint 2'),
  (s_plat_d, 'P04', 'Usage telemetry (token count, latency)',        'todo',        2, 'DevEx',   'Sprint 1'),
  (s_plat_d, 'P05', 'Admin UI: agent config panel',                  'todo',        3, 'DevEx',   'Sprint 2'),
  (s_plat_d, 'P06', 'SDK: Python client library',                    'todo',        3, 'DevEx',   'Sprint 2'),
  (s_plat_o, 'P07', 'Logging pipeline (structured JSON)',            'todo',        1, 'Ops',     'Sprint 1'),
  (s_plat_o, 'P08', 'Alerting: Slack webhook on agent errors',       'todo',        1, 'Ops',     'Sprint 1'),
  (s_plat_o, 'P09', 'Backup & restore for vector store',             'todo',        2, 'Ops',     'Sprint 2'),
  (s_plat_t, 'P10', 'Load test: 10 concurrent agent calls',          'todo',        2, 'Testing', 'Sprint 2');

-- ── MILESTONES ────────────────────────────────────────────────

INSERT INTO public.milestones (project_id, name, target_date, status, unlocks, sort_order) VALUES
  (p_cockpit, 'TOGAF Docs Complete',             '2026-04-15', 'done',    'Architecture governance baseline',                          1),
  (p_cockpit, 'MVP Scaffold Running',            '2026-04-16', 'done',    'Foundation for all Cockpit features',                       2),
  (p_cockpit, 'Auth + DB Connected',             '2026-04-18', 'active',  'Live data in dashboard; user login',                        3),
  (p_cockpit, 'Detail Panels + Widget System',   '2026-04-22', 'pending', 'Full drill-down UX; widget personalisation',                4),
  (p_cockpit, 'Intelligence Module Live',        '2026-04-25', 'pending', 'Daily market briefing; standards radar',                    5),
  (p_cockpit, 'cockpit.embedia.io Production',   '2026-04-30', 'pending', 'Full CEO/CTO operational screen live',                     6),
  (p_mbse,    'MBSE Agent Alpha',                '2025-05-28', 'pending', 'First live demo with real customer data',                   7),
  (p_mbse,    'MBSE Agent Beta (Pilot Customer)','2025-07-31', 'pending', 'Revenue-generating pilot; go/no-go for FuSa agent',         8),
  (p_cbtme,   'TME Codebeamer Delivery',         '2025-06-30', 'pending', 'Invoice €30k; reference customer case study',              9);

-- ── DECISIONS ─────────────────────────────────────────────────

INSERT INTO public.decisions (code, text, owner, deadline, status, note, project_id) VALUES
  ('D1', 'Select vector database for production (Chroma vs Weaviate vs Pinecone)',
   'Safouen', '2026-04-20', 'pending',
   'Chroma is sufficient for on-prem PoC. Revisit at 10k+ documents or multi-tenant requirement.',
   p_platform),
  ('D2', 'Pricing model for MBSE Agent (per-seat SaaS vs on-prem licence)',
   'Safouen', '2026-04-30', 'pending',
   'On-prem licence preferred for regulated automotive customers. Per-seat cloud option as fallback.',
   p_mbse),
  ('D3', 'White paper distribution channel (LinkedIn + direct email vs. gated PDF vs. partner)',
   'Safouen', '2026-05-01', 'pending',
   'Start ungated on LinkedIn to build reach. Gate v2 revisions for lead capture.',
   p_wp_mbse),
  ('D4', 'Kjøller investment: accept term sheet or continue bootstrapping',
   'Safouen', '2026-05-15', 'pending',
   'Case #35558 submitted 2026-04-16. Decision pending review outcome.',
   NULL);

-- ── CONTENT ASSETS (Whitepapers) ─────────────────────────────

INSERT INTO public.content_assets (project_id, title, asset_type, status, progress_pct, audience, channel, target_date, summary) VALUES
  (p_wp_mbse,  'MBSE Adoption Roadmap for Mechatronic Enterprises',  'whitepaper', 'draft',     40,
   'Engineering Directors, Systems Architects at Tier-1/OEM',
   'LinkedIn + Direct email + PROSTEP events',
   '2025-05-15',
   'Step-by-step guide to introducing MBSE in a traditionally document-centric automotive engineering organisation. Covers tooling selection, people change management, and early ROI demonstration.'),
  (p_wp_fusa,  'AI Augmentation of Functional Safety Processes',      'whitepaper', 'draft',     10,
   'Safety Engineers, Safety Managers at Tier-1/OEM',
   'LinkedIn + Safety-critical systems conferences',
   '2025-07-31',
   'How AI reasoning agents can accelerate HARA, FMEA, and safety goal derivation without compromising ISO 26262 compliance. Includes architectural guardrails for human oversight.'),
  (p_wp_cyber, 'ISO/SAE 21434 + UNECE R155 Compliance Playbook',     'whitepaper', 'draft',      5,
   'Cybersecurity Engineers, CISO at OEM/Tier-1',
   'LinkedIn + Automotive Cybersecurity World summit',
   '2025-08-31',
   'Practical implementation playbook: threat modelling with STRIDE, TARA automation, CSMS documentation, homologation readiness checklist.'),
  (p_wp_ee,    'E/E Architecture Patterns for Software-Defined Vehicles', 'whitepaper', 'draft',  0,
   'EE Architects, Platform Engineers at OEM/Tier-1',
   'LinkedIn + AUTOSAR member events',
   '2025-09-30',
   'Domain vs. zonal architecture comparison, AUTOSAR Adaptive platform adoption patterns, OTA update pipeline design.'),
  (p_wp_dt,    'Digital Thread in Practice: Automotive Mechatronic Systems', 'whitepaper', 'draft', 0,
   'PLM Managers, Engineering IT Directors',
   'LinkedIn + Prostep ivip symposium',
   '2025-10-31',
   'End-to-end digital thread: from requirements to manufacturing, linking MBSE models, CAD, simulation, and test artefacts in a traceable data thread.'),
  (p_wp_agile, 'Agile MBSE: SysML v2 Meets Scrum at Scale',          'whitepaper', 'draft',      0,
   'Engineering Managers, Agile Coaches at automotive companies',
   'LinkedIn + SAFe community channels',
   '2025-11-30',
   'Practical patterns for embedding SysML v2 modelling activities into Scrum sprints and SAFe PI cycles. Sprint planning for model-based artefacts, definition of done for system blocks.');

-- ── STANDARDS WATCH ──────────────────────────────────────────

INSERT INTO public.standards_watch (code, body, title, last_updated, relevance, url, notes) VALUES
  ('ISO 26262',      'ISO',      'Road vehicles — Functional Safety',
   '2018-12-01', 'Core standard for all FuSa work; agent training corpus',
   'https://www.iso.org/standard/68383.html',
   'Ed.2 (2018). Monitor for technical corrigenda. Part 6 (software) most critical for agent scope.'),
  ('ISO/SAE 21434',  'ISO/SAE',  'Road vehicles — Cybersecurity Engineering',
   '2021-08-01', 'Core standard for CyberSec agent; TARA methodology basis',
   'https://www.iso.org/standard/70918.html',
   'First edition 2021. Complements UNECE R155 for type-approval.'),
  ('UNECE R155',     'UNECE/WP.29', 'Cybersecurity Management System (CSMS) for Vehicles',
   '2021-03-01', 'Regulatory requirement for EU/Japan/Korea type approval from 2022',
   'https://unece.org/transport/documents/2021/03/standards/un-regulation-no-155',
   'Mandatory for new type approvals in EU from July 2022. Covers CSMS lifecycle.'),
  ('ISO 29148',      'ISO',      'Systems and Software Engineering — Life Cycle Processes — Requirements Engineering',
   '2018-11-01', 'Requirements engineering backbone for MBSE agent prompts and templates',
   'https://www.iso.org/standard/72089.html',
   'Ed.2 (2018). Defines requirement qualities: unambiguous, complete, traceable, verifiable.'),
  ('ISO 21448 (SOTIF)', 'ISO',   'Road vehicles — Safety of the Intended Functionality',
   '2022-06-01', 'Extends FuSa scope to sensor/ML failures; relevant to ADAS agent use cases',
   'https://www.iso.org/standard/77490.html',
   'First edition 2022. Key for autonomous driving and ADAS feature safety arguments.');

-- ── PIPELINE ACCOUNTS — update with new columns ───────────────

-- Fill in last_touch and next_action for existing seed accounts
-- (These were seeded as hardcoded data in the app; we update here once DB is populated)
-- Note: actual UUIDs will differ; this sets defaults for fresh installs
UPDATE public.pipeline_accounts
SET
  last_touch    = CURRENT_DATE - INTERVAL '5 days',
  next_action   = 'Follow up on LinkedIn message; share MBSE whitepaper draft',
  priority      = 'P1'
WHERE name = 'Continental AG';

UPDATE public.pipeline_accounts
SET
  last_touch    = CURRENT_DATE - INTERVAL '14 days',
  next_action   = 'Request intro to safety engineering team lead',
  priority      = 'P1'
WHERE name = 'ZF Friedrichshafen';

UPDATE public.pipeline_accounts
SET
  last_touch    = CURRENT_DATE - INTERVAL '7 days',
  next_action   = 'Send MBSE roadmap white paper; schedule call with engineering VP',
  priority      = 'P0',
  revenue_potential = 80000
WHERE name = 'Volvo Cars';

UPDATE public.pipeline_accounts
SET
  last_touch    = CURRENT_DATE - INTERVAL '21 days',
  next_action   = 'Identify ADAS/cybersec team contacts via LinkedIn',
  priority      = 'P2'
WHERE name = 'Scania';

UPDATE public.pipeline_accounts
SET
  last_touch    = CURRENT_DATE - INTERVAL '30 days',
  next_action   = 'Monitor E/E transformation programme RFI; attend BMW Group supplier day',
  priority      = 'P2',
  revenue_potential = 150000
WHERE name = 'BMW Group';

UPDATE public.pipeline_accounts
SET
  last_touch    = CURRENT_DATE - INTERVAL '10 days',
  next_action   = 'Share MBSE for semiconductor use case brief; propose PoC scope',
  priority      = 'P2'
WHERE name = 'Infineon Technologies';

UPDATE public.pipeline_accounts
SET
  last_touch    = CURRENT_DATE - INTERVAL '18 days',
  next_action   = 'Qualify elevator control MBSE need; connect with engineering director',
  priority      = 'P3'
WHERE name = 'KONE';

END $$;
