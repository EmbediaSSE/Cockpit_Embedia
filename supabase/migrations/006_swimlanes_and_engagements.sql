-- ─────────────────────────────────────────────────────────────────────────────
-- 006_swimlanes_and_engagements.sql
-- Adds swimlane segmentation to pipeline_accounts and a customer_engagements
-- table for tracking per-customer project history.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Add swimlane column ────────────────────────────────────────────────────
ALTER TABLE public.pipeline_accounts
  ADD COLUMN IF NOT EXISTS swimlane TEXT NOT NULL DEFAULT 'customer'
    CHECK (swimlane IN ('customer', 'investor', 'ecosystem'));

-- ── 2. Drop the old status CHECK constraint (stages differ per swimlane) ─────
ALTER TABLE public.pipeline_accounts
  DROP CONSTRAINT IF EXISTS pipeline_accounts_status_check;

-- ── 3. Customer Engagements table ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.customer_engagements (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id    UUID        NOT NULL REFERENCES public.pipeline_accounts(id) ON DELETE CASCADE,
  code          TEXT        NOT NULL DEFAULT '',
  name          TEXT        NOT NULL,
  type          TEXT        NOT NULL DEFAULT 'delivery'
                  CHECK (type IN ('delivery', 'rfq', 'retainer', 'advisory')),
  outcome       TEXT        NOT NULL DEFAULT 'active'
                  CHECK (outcome IN ('active', 'won', 'lost', 'on_hold')),
  value         NUMERIC(12,2) DEFAULT 0,
  date          DATE,
  lost_reason   TEXT,
  notes         TEXT        NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.customer_engagements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read customer engagements"
  ON public.customer_engagements FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Service role can modify customer engagements"
  ON public.customer_engagements FOR ALL
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Admins can modify customer engagements"
  ON public.customer_engagements FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
  );

CREATE INDEX idx_customer_engagements_account ON public.customer_engagements(account_id);

-- Auto-update updated_at
CREATE TRIGGER set_customer_engagements_updated_at
  BEFORE UPDATE ON public.customer_engagements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── 4. Update Kjøller → investor / submitted ──────────────────────────────────
UPDATE public.pipeline_accounts
  SET swimlane = 'investor',
      status   = 'submitted',
      notes    = 'Case #35558. Application submitted 2026-04-16. Seeking €150K–€500K. Awaiting due diligence questions.'
  WHERE name = 'Kjøller';

-- ── 5. Insert Garrett Motion as Customer ─────────────────────────────────────
INSERT INTO public.pipeline_accounts
  (name, category, country, region, swimlane, status, icp_segment,
   notes, priority, revenue_potential, last_touch, next_action)
VALUES (
  'Garrett Motion',
  'Tier-1 Supplier',
  'Switzerland',
  'DACH',
  'customer',
  'active',
  'Automotive Tier-1 — MBSE & Systems Engineering',
  'Existing customer. P1 NPI Assessment delivered (won). P2 HELIX OCM RFQ lost (budget misalignment). Explore next engagement.',
  'P1',
  50000,
  '2026-04-01',
  'Explore FuSa / MBSE Agent pilot opportunity'
);

-- ── 6. Insert Garrett engagements ─────────────────────────────────────────────
INSERT INTO public.customer_engagements
  (account_id, code, name, type, outcome, value, date, lost_reason, notes)
SELECT
  pa.id, 'GARRETT-P1', 'NPI Process Assessment', 'delivery', 'won', 30000,
  '2025-12-01', NULL,
  'Requirements management + stakeholder interviews. Delivered on time. Strong relationship built with engineering VP.'
FROM public.pipeline_accounts pa WHERE pa.name = 'Garrett Motion';

INSERT INTO public.customer_engagements
  (account_id, code, name, type, outcome, value, date, lost_reason, notes)
SELECT
  pa.id, 'GARRETT-P2', 'HELIX OCM RFQ', 'rfq', 'lost', 0,
  '2026-02-01',
  'Budget misalignment — scope exceeded approved budget envelope for the quarter.',
  'Submitted proposal for HELIX OCM implementation. Technically well received but lost on budget. Re-engage Q3 2026.'
FROM public.pipeline_accounts pa WHERE pa.name = 'Garrett Motion';

-- ── 7. Seed Ecosystem entries ─────────────────────────────────────────────────
INSERT INTO public.pipeline_accounts
  (name, category, country, region, swimlane, status, icp_segment, notes, priority, website)
VALUES
  ('Prostep ivip',
   'Standards Body',
   'Germany',
   'DACH',
   'ecosystem',
   'identified',
   'PLM / MBSE Standards',
   'Leading PLM/MBSE standardisation association. Member benefits: working groups, MBSE methodology access, automotive network.',
   'P0',
   'https://www.prostep.org'),

  ('INCOSE',
   'Professional Association',
   'USA',
   'Global',
   'ecosystem',
   'identified',
   'Systems Engineering',
   'International Council on Systems Engineering. Access to SE standards, MBSE community, certification pathways.',
   'P0',
   'https://www.incose.org'),

  ('Agoria',
   'Industry Federation',
   'Belgium',
   'Benelux',
   'ecosystem',
   'identified',
   'Tech Industry — Digital & Manufacturing',
   'Belgian federation for technology companies. Network of 1,900+ members, policy influence, talent & innovation programmes.',
   'P1',
   'https://www.agoria.be'),

  ('CLEPA',
   'Industry Association',
   'Belgium',
   'Europe',
   'ecosystem',
   'identified',
   'Automotive Suppliers',
   'European Association of Automotive Suppliers. Direct access to OEM procurement networks and lobbying.',
   'P1',
   'https://www.clepa.eu'),

  ('Sirris',
   'Research Institute',
   'Belgium',
   'Benelux',
   'ecosystem',
   'identified',
   'Manufacturing & Digital Innovation',
   'Collective centre for Belgian technology industry. R&D partnerships, innovation grants, manufacturing digitalisation.',
   'P2',
   'https://www.sirris.be');
