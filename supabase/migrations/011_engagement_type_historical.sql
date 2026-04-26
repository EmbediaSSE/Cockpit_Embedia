-- Migration 011: Add 'historical' to customer_engagements type check constraint
-- Required to log aggregate past revenue (e.g. "Toyota 2018–2024 — all projects").

ALTER TABLE customer_engagements
  DROP CONSTRAINT customer_engagements_type_check;

ALTER TABLE customer_engagements
  ADD CONSTRAINT customer_engagements_type_check
    CHECK (type IN ('delivery', 'rfq', 'retainer', 'advisory', 'historical'));
