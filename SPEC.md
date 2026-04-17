# Embedia OS Cockpit — Full Upgrade SPEC
**Status:** [AWAITING APPROVAL]  
**Author:** Embedia AI Ops  
**Date:** 2026-04-17  
**Codebase:** `outputs/cockpit-webapp/app`  
**Live:** https://cockpit.embedia.io

---

## 1. Vision

Transform the cockpit from an MVP scaffold into the **Embedia OS** — the single operational screen for the CEO/CTO. Every domain is visible at a glance; any item drills into full context via a right-side slide-out panel. The system is widget-based and database-driven: no hardcoded data, no redeployment needed to add content.

---

## 2. Design Principles

| Principle | Implementation |
|-----------|----------------|
| **Scan → Drill** | Compact cards everywhere; detail panel on any click |
| **Database-driven** | Zero hardcoded seed data in components; all from Supabase |
| **Widget-first** | Dashboard is a configurable grid of registered widgets |
| **Role-aware** | `admin` = full CRUD; `member` = read-only; enforced at DB (RLS) and UI |
| **Agent-integrated** | Every detail panel has a contextual "Ask agent" entry point |
| **No redeployment** | New content (projects, accounts, news) added via DB, not code |

---

## 3. Information Architecture — 7 Modules

### 3.1 War Room (Dashboard) — `/`
The command centre. Loads in < 2 s.

**Sections:**
- **KPI Strip** — 6 cards: Active Projects · Revenue Pipeline · Avg Margin · BD Accounts · Overdue Tasks · Days to Next Milestone (computed from DB)
- **Critical Now** — auto-generated list: overdue tasks + open decisions with past deadline
- **Enterprise Milestones Rail** — 90-day timeline, all projects, colour by category. Replaces current hardcoded cockpit-deployment-only bar.
- **Portfolio Summary** — project list (existing), click → DetailPanel
- **Daily Briefing Card** — last Chief of Staff AI summary, "Regenerate" button
- **Quick Actions** — 4 agent shortcuts (existing, keep)

### 3.2 Portfolio — `/projects`
Full project and workstream management.

**Views:** Function-lane (like local HTML) ↔ Flat list with filters  
**Filters:** Category · Priority · Status · Stage  
**Project row:** dot colour · name · priority badge · stage · progress bar · target date · arrow  
**Click → DetailPanel** with: summary, progress, risks (pills), dependencies, milestones, task breakdown grouped by WBS stage  
**Inline actions (admin):** Edit status, add risk, add task  

### 3.3 Sprint Board — `/sprint`
Active sprint kanban. **Replaces** the current placeholder.

**Layout:** 4 columns — To Do · In Progress · Blocked · Done  
**Card:** task_code · name · due_date · epic label · assignee dot  
**Above board:** Sprint header (name · date range · day N of M · tasks in progress · overdue count)  
**Click → DetailPanel:** task detail with epic, WBS stage, due date, effort days, linked project  
**Filters:** Epic · Assignee · Project  
**Admin:** drag-and-drop status change (HTML5 drag API, no library needed)  

### 3.4 Milestones & Roadmap — `/roadmap`
**New tab.** Replaces the hardcoded milestone bar.

**Layout:** Horizontal timeline, 3 swimlanes by time horizon (This Month · Next 3 Months · Beyond)  
**Milestone dot:** colour by project category, filled = done, ring = active, empty = pending  
**Click → DetailPanel:** milestone name · project · target date · status · what it unlocks · dependencies  
**Admin:** mark done, shift date  

### 3.5 BD & GTM — `/pipeline`
Two sub-tabs within the existing Pipeline view.

**BD sub-tab (existing, enhanced):**
- Kanban: Identified → Contacted → Qualified → Proposal → Won
- Account card: name · category · city · last touch date · ICP segment
- Click → DetailPanel: full account detail, contacts list, notes history, "Ask BizDev Agent" button
- Table view toggle (Kanban ↔ Table)
- Admin: edit stage (drag card), add contact, add note

**GTM sub-tab (new):**
- Content pipeline: whitepapers + articles, tracked as `content_assets`
- Card: title · type · status (Draft → Review → Published) · target date · audience · channel
- Progress bar per asset
- Click → DetailPanel: summary, progress, decision (publish channel), linked project, "Ask Content Agent"

### 3.6 Organisation — `/org`
Existing org chart, extended.

**Top section (unchanged):** Safouen Selmi → Team / Agents tree  
**Agent cards enhanced:** name · type · status (active/dev/planned) · last_used · current_task · capabilities list · "Ask" button  
**Toggle:** Org view ↔ Agent capability matrix (table: agent × capability, cell = status)  
**Functional Areas (existing):** Executive · Consultancy Delivery · Product & Engineering · BD · Operations & Publishing  
**Team members section:** renders real data from `users` table when populated  

### 3.7 Intelligence — `/intelligence`
**New tab.** Market & tech debrief. ~€20/month to operate.

**4 widget types:**
1. **Industry News** — RSS parser (free: Automotive IQ, IEEE Spectrum, SAE, McKinsey) + NewsData.io API (€15–20/month) for broader tech/AI/LLM coverage. Keyword filters: SDV · MBSE · ISO 26262 · Claude/Anthropic · automotive AI.
2. **Standards Radar** — manually curated table: standard name · body · last update · relevance note · link. No API needed.
3. **Competitor Watch** — manually curated cards: firm name · type · recent signal · date. Admin adds/edits.
4. **Technology Signals** — curated feed: notable tool/model/platform releases. Admin adds; AI can suggest via Chief of Staff.

**News ingestion:** Next.js API route `/api/intelligence/fetch` — runs server-side RSS fetch + NewsData.io call, stores results in `news_items` table. Can be called by a Vercel Cron job (daily at 07:00 CET) for zero-touch daily briefing.

**Click any item → DetailPanel:** full article summary (AI-generated), source link, save-to-briefing-board button.

---

## 4. Universal Detail Panel — `<DetailPanel />`

The most important new component. Replaces the current inline card expansion in the pipeline.

```
┌─────────────────────────────────────────────────────────┐
│ [×]  Project Name                                        │
│      Category · Priority · Status                        │
├─────────────────────────────────────────────────────────┤
│  Summary Cards (2×2 grid): Status · Phase · Progress · Target │
├─────────────────────────────────────────────────────────┤
│  Description paragraph                                   │
│  Progress bar (if applicable)                            │
│  Risks & Flags (pills: high/medium/low/info)             │
│  Dependencies (→ list)                                   │
│  Task Breakdown (grouped by epic/stage, status dots)     │
│  Documents (list with status badges)                     │
├─────────────────────────────────────────────────────────┤
│  [Ask Agent ▸]  [Edit]  [Open full page →]              │
└─────────────────────────────────────────────────────────┘
```

**Behaviour:**
- Slides in from right (520px wide), overlay darkens main content
- Close: × button, Escape key, click overlay
- URL-addressable: `?panel=project&id=MBSE-001` — panels are shareable links
- Panel `type` determines which template renders: `project` · `task` · `milestone` · `account` · `decision` · `agent` · `news`
- Any component calls `openPanel({ type, id })` via a React context — no prop drilling

**File:** `src/components/shared/DetailPanel.tsx`  
**Context:** `src/contexts/PanelContext.tsx`

---

## 5. Widget System

### 5.1 Widget Registry

Each widget is a self-contained React component that declares a metadata object:

```ts
interface WidgetMeta {
  id: string;           // e.g. "kpi-strip"
  title: string;
  size: "sm" | "md" | "lg" | "full";
  dataFetcher: () => Promise<unknown>;
  refreshMs?: number;
  requiredRole?: UserRole;
}
```

A `widget_preferences` table (per user) stores `{ user_id, widget_id, visible, order, size_override }`.

### 5.2 Dashboard Grid

`src/components/dashboard/WidgetGrid.tsx` — renders widgets based on the user's saved preferences. Admin users see a settings drawer to toggle/reorder widgets. The grid uses CSS Grid; widget `size` maps to `col-span-*`.

### 5.3 Built-in Widgets (Phase 1–3)

| Widget ID | Module | Default |
|-----------|--------|---------|
| `kpi-strip` | War Room | visible |
| `critical-now` | War Room | visible |
| `milestone-rail` | War Room | visible |
| `portfolio-summary` | Portfolio | visible |
| `daily-briefing` | War Room | visible |
| `quick-actions` | War Room | visible |
| `sprint-header` | Sprint | visible on Sprint tab |
| `gtm-pipeline` | BD/GTM | hidden by default |
| `standards-radar` | Intelligence | hidden by default |
| `competitor-watch` | Intelligence | hidden by default |

---

## 6. Schema Additions — Migration `002`

New tables to add on top of the existing `001_initial_schema.sql`:

### 6.1 `milestones`
```sql
CREATE TABLE public.milestones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target_date DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('done', 'active', 'pending', 'at_risk', 'overdue')),
  unlocks TEXT,          -- free text: what this milestone enables
  dependencies TEXT,     -- free text or JSON array of milestone IDs
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 6.2 `decisions`
```sql
CREATE TABLE public.decisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL,    -- D1, D2, etc.
  text TEXT NOT NULL,
  owner TEXT,
  deadline DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'deferred')),
  note TEXT,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 6.3 `content_assets` (GTM)
```sql
CREATE TABLE public.content_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('whitepaper', 'article', 'post', 'deck', 'video')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'approved', 'published')),
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
```

### 6.4 `news_items` (Intelligence)
```sql
CREATE TABLE public.news_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source TEXT NOT NULL,
  title TEXT NOT NULL,
  url TEXT UNIQUE NOT NULL,
  summary TEXT,                        -- AI-generated
  category TEXT NOT NULL CHECK (category IN ('automotive', 'sdv', 'mbse', 'ai_llm', 'standards', 'market')),
  relevance_score INT NOT NULL DEFAULT 50,   -- 0–100
  published_at TIMESTAMPTZ,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  saved_to_briefing BOOLEAN NOT NULL DEFAULT false
);
```

### 6.5 `standards_watch`
```sql
CREATE TABLE public.standards_watch (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL,     -- ISO 26262, ISO/SAE 21434, etc.
  body TEXT NOT NULL,     -- ISO, SAE, UNECE
  title TEXT NOT NULL,
  last_updated DATE,
  relevance TEXT,
  url TEXT,
  notes TEXT
);
```

### 6.6 `widget_preferences`
```sql
CREATE TABLE public.widget_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  widget_id TEXT NOT NULL,
  visible BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  size_override TEXT,
  UNIQUE(user_id, widget_id)
);
```

### 6.7 Additions to existing tables
```sql
-- Add epic grouping to wbs_tasks
ALTER TABLE public.wbs_tasks ADD COLUMN epic TEXT;
ALTER TABLE public.wbs_tasks ADD COLUMN sprint_name TEXT;

-- Add function/workstream grouping to projects
ALTER TABLE public.projects ADD COLUMN function_area TEXT
  CHECK (function_area IN ('Product', 'ThoughtLeadership', 'BizDev', 'ProfDevel', 'Operations'));
ALTER TABLE public.projects ADD COLUMN risks_summary JSONB DEFAULT '[]';
ALTER TABLE public.projects ADD COLUMN dependencies_text TEXT;
ALTER TABLE public.projects ADD COLUMN phase TEXT;

-- Add last_touch and next_action to pipeline_accounts
ALTER TABLE public.pipeline_accounts ADD COLUMN last_touch DATE;
ALTER TABLE public.pipeline_accounts ADD COLUMN next_action TEXT;
ALTER TABLE public.pipeline_accounts ADD COLUMN revenue_potential NUMERIC(12,2) DEFAULT 0;
ALTER TABLE public.pipeline_accounts ADD COLUMN priority TEXT DEFAULT 'P2'
  CHECK (priority IN ('P0', 'P1', 'P2', 'P3'));
```

---

## 7. Seed Data — Migration `003`

Populate Supabase with all real operational data from `2026-04-14-embedia-ceo-dashboard.html`:

- 19 workstreams (as projects with function_area set)
- 23 MBSE Sprint 1 tasks (M01–M23) with epic grouping
- 13 FuSa tasks (F01–F13)
- 11 CyberSec tasks (C01–C11)
- 10 Platform tasks (P01–P10)
- 9 enterprise milestones
- 4 decisions (D1–D4)
- 6 whitepapers (WP01–WP06) as content_assets
- 7 BD accounts (Continental, ZF, Volvo, Scania, BMW, Infineon, KONE — already in pipeline seed)
- 5 standards (ISO 26262, ISO/SAE 21434, UNECE R155, ISO 29148, ISO 21448) as standards_watch

---

## 8. New API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/milestones` | GET | All milestones ordered by date |
| `/api/decisions` | GET, PATCH | Decisions list + update status |
| `/api/content` | GET, POST | Content assets |
| `/api/intelligence/fetch` | POST | Trigger RSS fetch + HTML scraper, Haiku scoring, store in news_items |
| `/api/intelligence/digest` | POST | Weekly Claude Sonnet synthesis → news_digests |
| `/api/intelligence/news` | GET | Paginated news_items, filterable by topic/relevance |
| `/api/panel/[type]/[id]` | GET | Universal detail panel data (project/task/milestone/account/decision) |
| `/api/sprint/active` | GET | Active sprint tasks grouped by epic and status |
| `/api/projects/[id]/detail` | GET | Full project detail incl. tasks, risks, milestones, docs |

---

## 9. New & Modified Components

### New components
| File | Purpose |
|------|---------|
| `src/components/shared/DetailPanel.tsx` | Universal right slide-out panel |
| `src/contexts/PanelContext.tsx` | Global panel state (openPanel, closePanel) |
| `src/components/dashboard/WidgetGrid.tsx` | Configurable widget grid |
| `src/components/dashboard/CriticalNow.tsx` | Overdue + open decisions widget |
| `src/components/dashboard/DailyBriefing.tsx` | AI briefing card widget |
| `src/components/roadmap/RoadmapView.tsx` | Enterprise milestone timeline |
| `src/components/roadmap/MilestoneDot.tsx` | Clickable milestone node |
| `src/components/sprint/SprintBoardView.tsx` | Kanban with drag-and-drop |
| `src/components/sprint/SprintHeader.tsx` | Sprint metadata bar |
| `src/components/sprint/TaskCard.tsx` | Kanban task card |
| `src/components/pipeline/GTMView.tsx` | Content asset pipeline |
| `src/components/pipeline/ContentAssetCard.tsx` | Whitepaper/article card |
| `src/components/intelligence/IntelligenceView.tsx` | All 4 intelligence widgets |
| `src/components/intelligence/NewsFeed.tsx` | Curated news list |
| `src/components/intelligence/StandardsRadar.tsx` | Standards table |
| `src/components/intelligence/CompetitorWatch.tsx` | Competitor cards |
| `src/components/org/AgentCard.tsx` | Enhanced agent card with Ask button |
| `src/components/org/AgentMatrix.tsx` | Agent × capability matrix |

### Modified components
| File | Change |
|------|--------|
| `src/app/page.tsx` | Add Roadmap + Intelligence tabs; wire PanelContext; use WidgetGrid for dashboard |
| `src/components/dashboard/MilestoneBar.tsx` | Fetch from `milestones` table, not hardcoded |
| `src/components/dashboard/ProjectCard.tsx` | Add onClick → openPanel('project', id) |
| `src/components/pipeline/PipelineView.tsx` | Add GTM sub-tab; account click → openPanel |
| `src/app/(dashboard)/pipeline/page.tsx` | Wire to Supabase; detail via panel not inline expand |
| `src/lib/supabase/types.ts` | Add Milestone, Decision, ContentAsset, NewsItem, StandardsWatch, WidgetPreference types |

---

## 10. Navigation — Header Update

Add 2 new tabs to `src/components/dashboard/Header.tsx`:

```
DASHBOARD | PROJECTS | PIPELINE | ORGANISATION | SPRINT | ROADMAP | INTELLIGENCE
```

Sprint tab becomes functional (no longer a placeholder).

---

## 11. Roles & Permissions

| Action | admin | member |
|--------|-------|--------|
| View all data | ✓ | ✓ |
| Edit project status | ✓ | ✗ |
| Add/edit tasks | ✓ | ✗ |
| Add/edit pipeline accounts | ✓ | ✗ |
| Mark decisions | ✓ | ✗ |
| Fetch intelligence | ✓ | ✗ |
| Curate standards/competitors | ✓ | ✗ |
| Manage widget preferences | ✓ (own) | ✓ (own) |
| User management | ✓ | ✗ |

RLS policies already enforce admin-write / any-read on `projects`, `wbs_tasks`, `pipeline_accounts`. New tables follow the same pattern.

---

## 12. Intelligence Module — Tech Decision

**Approach: 100% free — RSS only + Claude agent for curation**

No paid API. All sources publish public RSS feeds. The Intelligence agent (Claude Haiku via the existing Anthropic SDK) processes everything: groups by topic, scores Embedia relevance (0–10), writes a 2–3 sentence summary per article, and generates a weekly digest. Every item carries a direct link to the original source so Safouen can dive deeper on anything of interest.

For sources without a native RSS feed (Prostep, Agoria), a lightweight HTML scraper in the fetch route extracts the latest news page and creates synthetic feed items. This requires no third-party service.

---

### Feed Registry — `src/lib/intelligence/feeds.ts`

All sources declared as a typed array with `{ id, name, domain, url, fetchType, relevanceBoost }`.  
Add new sources here — zero code changes elsewhere required.  
`fetchType`: `rss` = standard RSS/Atom parser · `scrape` = lightweight HTML extractor for sites without native feeds.

---

#### Domain 1 — MBSE · Systems Engineering · PLM · Digital Thread

| Source | Type | URL |
|--------|------|-----|
| prostep ivip — News | scrape | `https://www.prostep.org/en/news` |
| prostep ivip — Events | scrape | `https://www.prostep.org/en/events/events` |
| SAE International — Technical Papers | rss | `https://www.sae.org/feeds/technical-papers.rss` |
| SAE International — Automotive Eng. | rss | `https://www.sae.org/feeds/automotive-engineering.rss` |
| IEEE Spectrum | rss | `https://spectrum.ieee.org/feeds/feed.rss` |
| INCOSE — News | scrape | `https://www.incose.org/news-articles` |
| Digital Engineering 247 | rss | `https://www.digitalengineering247.com/feed/` |
| Design Engineering | rss | `https://www.design-engineering.com/feed/` |
| SDV Guide (community) | scrape | `https://www.sdv.guide/blog` |

---

#### Domain 2 — Automotive · SDV · E/E Architecture · Connectivity

| Source | Type | URL |
|--------|------|-----|
| Automotive IQ | rss | `https://www.automotive-iq.com/rss-feeds` |
| Automotive News Europe | rss | `https://europe.autonews.com/rss.xml` |
| EIN Automotive | rss | `https://automotive.einnews.com/rss/newsfeed` |
| AUTOSAR — News & Events | scrape | `https://www.autosar.org/news-events` |
| Eclipse Foundation Newsroom | rss | `https://newsroom.eclipse.org/rss.xml` |
| COVESA — News | scrape | `https://covesa.global/news/` |
| Elektrobit (SDV blog) | scrape | `https://www.elektrobit.com/blog/` |
| Automotive World | rss | `https://www.automotiveworld.com/news/feed/` |
| InsideEVs | rss | `https://insideevs.com/rss/articles/all/` |
| Automotive Testing Technology Intl. | rss | `https://www.automotivetestingtechnologyinternational.com/feed` |

---

#### Domain 3 — AI · LLM · Engineering Intelligence Tools

| Source | Type | URL |
|--------|------|-----|
| Anthropic Blog | rss | `https://www.anthropic.com/rss.xml` |
| MIT Technology Review | rss | `https://www.technologyreview.com/feed/` |
| McKinsey Technology & Digital | rss | `https://www.mckinsey.com/capabilities/mckinsey-digital/our-insights/rss` |
| McKinsey Insights (all) | rss | `https://www.mckinsey.com/insights/rss` |
| The Gradient (AI research) | rss | `https://thegradient.pub/rss/` |
| Import AI (Jack Clark) | rss | `https://importai.substack.com/feed` |
| AI Business | rss | `https://aibusiness.com/rss.xml` |
| Hugging Face Blog | rss | `https://huggingface.co/blog/feed.xml` |
| Simon Willison's Weblog (LLMs) | rss | `https://simonwillison.net/atom/everything/` |

---

#### Domain 4 — Functional Safety · ISO 26262 · SOTIF

| Source | Type | URL |
|--------|------|-----|
| exida Blog | scrape | `https://www.exida.com/blog` |
| TÜV SÜD — Automotive Insights | scrape | `https://www.tuvsud.com/en/newsroom` |
| Synopsys — Automotive Safety Blog | scrape | `https://www.synopsys.com/blogs/chip-design.html` |
| SGS TÜV SAAR — FuSa insights | scrape | `https://sgs-tuev-saar.com/en/blog` |
| Safety-Critical Systems Club | scrape | `https://scsc.uk/news` |

---

#### Domain 5 — Automotive Cybersecurity · ISO/SAE 21434 · UNECE R155

| Source | Type | URL |
|--------|------|-----|
| Upstream Security Blog | rss | `https://upstream.auto/blog/feed/` |
| ENISA — Cybersecurity News | rss | `https://www.enisa.europa.eu/news/enisa-news/RSS` |
| Argus Cyber Security Blog | scrape | `https://argus-sec.com/blog/` |
| Karamba Security Blog | scrape | `https://karambasecurity.com/blog/` |
| AUTOCRYPT Blog | scrape | `https://autocrypt.io/blog/` |
| Automotive ISAC | scrape | `https://www.automotiveisac.com/news/` |

---

#### Domain 6 — Standards · Regulation · EU Policy · Compliance

| Source | Type | URL |
|--------|------|-----|
| EU AI Act Tracker | rss | `https://artificialintelligenceact.eu/feed/` |
| European Commission — Digital Strategy | rss | `https://digital-strategy.ec.europa.eu/en/rss.xml` |
| European Commission — Industry | rss | `https://ec.europa.eu/newsroom/growth/rss.cfm` |
| European Parliament — Press | rss | `https://www.europarl.europa.eu/rss/en/pressreleases.xml` |
| EASA Newsroom | rss | `https://www.easa.europa.eu/en/rss.xml` |
| Global Policy Watch | rss | `https://www.globalpolicywatch.com/feed/` |
| ISO Newsroom | scrape | `https://www.iso.org/news/` |
| IEC e-tech Magazine | rss | `https://etech.iec.ch/feed` |
| UNECE WP.29 press | scrape | `https://unece.org/transport/vehicle-regulations/press` |
| Cyber Resilience Act tracker | scrape | `https://www.cyberresilienceact.eu/news/` |

---

#### Domain 7 — Belgian & EU Ecosystem · Mechatronics · Startups

| Source | Type | URL |
|--------|------|-----|
| Agoria — News | scrape | `https://www.agoria.be/en/about-us/agoria-news` |
| Flanders Make — News | scrape | `https://www.flandersmake.be/en/news` |
| imec (KU Leuven deep tech) | rss | `https://www.imec-int.com/en/articles/rss` |
| Sirris — Inspiration | scrape | `https://www.sirris.be/en/inspiration` |
| hub.brussels | scrape | `https://hub.brussels/en/news` |
| Start it @KBC | rss | `https://startit.be/feed/` |
| EU-Startups — Belgium | rss | `https://www.eu-startups.com/category/belgium/feed/` |
| EU-Startups — Deep Tech | rss | `https://www.eu-startups.com/category/deep-tech/feed/` |
| EU-Startups — Industry 4.0 | rss | `https://www.eu-startups.com/category/industry-4-0/feed/` |
| Sifted — Deep Tech | rss | `https://sifted.eu/feed/?post_type=article&category=deeptech` |
| Sifted — All | rss | `https://sifted.eu/feed/?post_type=article` |
| Leuven MindGate | scrape | `https://leuvenmindgate.be/en/news` |
| EIT Manufacturing — News | scrape | `https://www.eitmanufacturing.eu/news/` |
| EIC (European Innovation Council) | scrape | `https://eic.ec.europa.eu/news_en` |
| Innoviris (Brussels R&D) | scrape | `https://www.innoviris.brussels/en/news` |
| Digital Wallonia | scrape | `https://www.digitalwallonia.be/en/publications` |

---

#### Domain 8 — Market Intelligence · Consulting · Strategy

| Source | Type | URL |
|--------|------|-----|
| McKinsey Automotive | rss | `https://www.mckinsey.com/industries/automotive-and-assembly/our-insights/rss` |
| Deloitte Insights Podcast | rss | `https://public.deloitte.com/media/rss/deloitte_insights_pcast.xml` |
| HBR — Technology | rss | `https://hbr.org/rss/topic/technology` |
| BCG Henderson Institute | scrape | `https://www.bcg.com/publications/latest` |
| Roland Berger Insights | scrape | `https://www.rolandberger.com/en/Insights/` |
| Industry Week | rss | `https://www.industryweek.com/rss` |
| Control Engineering | rss | `https://www.controleng.com/rss` |

---

#### Domain 9 — European Startup Funding · Investment · BD Intelligence

| Source | Type | URL |
|--------|------|-----|
| Tech.eu | rss | `https://tech.eu/feed/` |
| Silicon Canals | rss | `https://siliconcanals.com/feed/` |
| TechFunding News | rss | `https://techfundingnews.com/feed/` |
| Dealroom.co Blog | scrape | `https://dealroom.co/blog` |
| The Next Web — Tech | rss | `https://thenextweb.com/feed/` |
| Failory (Belgium startups) | scrape | `https://www.failory.com/startups/belgium` |

---

### Agent Curation Pipeline

After raw fetch and deduplication, the Intelligence agent runs in two passes:

**Pass 1 — Per-article processing (Claude Haiku, ~0.001 USD each):**
```
For each new article:
1. Extract: title, source, date, full text or lead paragraph
2. Score Embedia relevance 0–10 based on:
   - MBSE / systems engineering content → +3
   - SDV / automotive / E/E → +2
   - AI tools for engineering → +2
   - Belgian / EU ecosystem → +1
   - Regulatory changes (AI Act, ISO, UNECE) → +2
   - Competitor or partner activity → +1
3. Write 2–3 sentence summary in English
4. Assign topic tag: MBSE · SDV · AI_TOOLS · REGULATION · ECOSYSTEM · MARKET
5. Store in news_items (skip if relevance < 4)
```

**Pass 2 — Weekly Digest (Claude Sonnet, once per week on Monday 07:00):**
```
Group all items from the past 7 days by topic tag.
For each topic: write one synthesis paragraph (3–4 sentences) covering:
  - What happened
  - Why it matters to Embedia specifically
  - Any action to consider (BD angle, whitepaper angle, product angle)
Output: structured JSON stored in news_digests table, rendered as "This Week in Intelligence" card on the dashboard.
```

---

### Fetch cadence

- **Daily articles:** Vercel Cron `0 6 * * *` → `/api/intelligence/fetch` (all RSS feeds + HTML scrapers)
- **Weekly digest:** Vercel Cron `0 7 * * 1` → `/api/intelligence/digest` (Claude Sonnet synthesis)
- **Manual trigger:** "Refresh" button in the Intelligence tab

---

### Additional DB table: `news_digests`
```sql
CREATE TABLE public.news_digests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  week_start DATE NOT NULL UNIQUE,
  digest_json JSONB NOT NULL,   -- { topic: string, summary: string, item_count: int }[]
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 13. Phased Task Plan

### Phase 1 — Foundation & Data (Sprint 1, ~5 days)

| # | Task | Component/File |
|---|------|----------------|
| 1.1 | Write migration `002_schema_additions.sql` | `supabase/migrations/` |
| 1.2 | Write migration `003_seed_real_data.sql` | `supabase/migrations/` |
| 1.3 | Update `types.ts` with all new types | `src/lib/supabase/types.ts` |
| 1.4 | Build `PanelContext` + `DetailPanel` component | `src/contexts/`, `src/components/shared/` |
| 1.5 | Wire `ProjectCard` → `openPanel('project', id)` | `src/components/dashboard/ProjectCard.tsx` |
| 1.6 | Build `/api/projects/[id]/detail` route | `src/app/api/projects/[id]/route.ts` |
| 1.7 | Build `/api/panel/[type]/[id]` unified route | `src/app/api/panel/` |
| 1.8 | Update `MilestoneBar` to fetch from DB | `src/components/dashboard/MilestoneBar.tsx` |
| 1.9 | Add `CriticalNow` widget | `src/components/dashboard/CriticalNow.tsx` |
| 1.10 | Add `DailyBriefing` card widget | `src/components/dashboard/DailyBriefing.tsx` |

### Phase 2 — Sprint Board, Roadmap & GTM (Sprint 2, ~5 days)

| # | Task | Component/File |
|---|------|----------------|
| 2.1 | Build `SprintBoardView` with drag-and-drop | `src/components/sprint/` |
| 2.2 | Build `/api/sprint/active` route | `src/app/api/sprint/` |
| 2.3 | Build `RoadmapView` timeline | `src/components/roadmap/` |
| 2.4 | Build `/api/milestones` route | `src/app/api/milestones/` |
| 2.5 | Build `GTMView` content asset pipeline | `src/components/pipeline/GTMView.tsx` |
| 2.6 | Build `/api/content` route | `src/app/api/content/` |
| 2.7 | Wire Pipeline page — Supabase + panel | `src/app/(dashboard)/pipeline/page.tsx` |
| 2.8 | Update Header — add ROADMAP + INTELLIGENCE tabs | `src/components/dashboard/Header.tsx` |
| 2.9 | Enhance `OrgChartView` — AgentCard + matrix | `src/components/org/` |
| 2.10 | Build `WidgetGrid` + `widget_preferences` API | `src/components/dashboard/WidgetGrid.tsx` |

### Phase 3 — Intelligence Module (Sprint 3, ~4 days)

| # | Task | Component/File |
|---|------|----------------|
| 3.1 | Write `feeds.ts` — full feed registry (RSS URLs + HTML scraper configs) | `src/lib/intelligence/feeds.ts` |
| 3.2 | Build RSS parser + HTML scraper in fetch route | `src/app/api/intelligence/fetch/route.ts` |
| 3.3 | Add Claude Haiku pass: relevance score + summary + topic tag per article | inside fetch route |
| 3.4 | Build Claude Sonnet weekly digest route | `src/app/api/intelligence/digest/route.ts` |
| 3.5 | Write migration for `news_items`, `standards_watch`, `news_digests` | `supabase/migrations/004_intelligence.sql` |
| 3.6 | Build `IntelligenceView` — NewsFeed, Standards, Competitor, Weekly Digest card | `src/components/intelligence/` |
| 3.7 | Wire Vercel Cron: daily fetch at 06:00, weekly digest at 07:00 Monday | `vercel.json` |
| 3.8 | `Decisions` widget in War Room + `/api/decisions` route | `src/app/api/decisions/` + `src/components/dashboard/` |

---

## 14. Files NOT Changed

The following existing files are left untouched unless a task explicitly references them:

- `src/lib/agents/` — agent prompts and router (Phase 4 enhancement, not in scope here)
- `src/app/api/auth/` — auth routes unchanged
- `src/middleware.ts` — auth middleware unchanged
- `src/app/login/page.tsx` — login page unchanged
- `src/components/chat/ChatPanel.tsx` — chat panel unchanged
- `src/components/settings/` — settings unchanged

---

## 15. Definition of Done

- [ ] All seed data visible in cockpit with zero hardcoded fallbacks
- [ ] Any project/task/account/milestone click opens DetailPanel with full context
- [ ] Sprint Board is functional (move tasks between columns)
- [ ] Roadmap shows all enterprise milestones from DB
- [ ] GTM shows all 6 whitepapers with status and progress
- [ ] Intelligence tab shows at least 10 fetched articles on first load
- [ ] Dashboard widget grid works (toggle/reorder at least 3 widgets)
- [ ] Team read-only role sees full data, cannot edit
- [ ] No console errors, no TypeScript errors (`tsc --noEmit` passes)
- [ ] Deployed to cockpit.embedia.io and verified live

---

*[DRAFT] — Awaiting Safouen's approval before Phase 1 begins.*
