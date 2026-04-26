-- Migration 010: RLS policies for customer_engagements and pipeline_accounts
-- Fixes silent INSERT failures when authenticated users log engagements or
-- add new accounts from the browser (anon/authenticated JWT, not service role).

-- customer_engagements: grant INSERT / UPDATE / DELETE to all authenticated users
CREATE POLICY "Authenticated users can insert engagements"
  ON customer_engagements FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update engagements"
  ON customer_engagements FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete engagements"
  ON customer_engagements FOR DELETE
  TO authenticated
  USING (true);

-- pipeline_accounts: grant INSERT to authenticated users
-- (UPDATE/DELETE already covered by existing "Admins can modify" ALL policy)
CREATE POLICY "Authenticated users can insert accounts"
  ON pipeline_accounts FOR INSERT
  TO authenticated
  WITH CHECK (true);
