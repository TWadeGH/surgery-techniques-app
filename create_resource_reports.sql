-- Report Resource: table + RLS
-- Run in Supabase SQL Editor once.
-- Reports go to: Super Admin, Admin of that resource's specialty, Sub-admin of that resource's subspecialty.

-- Table
CREATE TABLE IF NOT EXISTS resource_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id uuid NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  reported_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  report_text text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed')),
  resource_specialty_id uuid REFERENCES specialties(id) ON DELETE SET NULL,
  resource_subspecialty_id uuid REFERENCES subspecialties(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_resource_reports_resource_id ON resource_reports(resource_id);
CREATE INDEX IF NOT EXISTS idx_resource_reports_status ON resource_reports(status);
CREATE INDEX IF NOT EXISTS idx_resource_reports_created_at ON resource_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_resource_reports_specialty ON resource_reports(resource_specialty_id) WHERE resource_specialty_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_resource_reports_subspecialty ON resource_reports(resource_subspecialty_id) WHERE resource_subspecialty_id IS NOT NULL;

COMMENT ON TABLE resource_reports IS 'User reports on resources; visible to super_admin, specialty_admin for that resource, subspecialty_admin for that resource';

-- RLS
ALTER TABLE resource_reports ENABLE ROW LEVEL SECURITY;

-- INSERT: any authenticated user may report (reported_by = self)
CREATE POLICY "resource_reports_insert_own"
  ON resource_reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reported_by);

-- SELECT: super_admin sees all; specialty_admin sees reports where resource_specialty_id = their primary_specialty_id; subspecialty_admin sees where resource_subspecialty_id = their primary_subspecialty_id
CREATE POLICY "resource_reports_select_admin"
  ON resource_reports FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND (
        p.role = 'super_admin'
        OR (p.role = 'specialty_admin' AND p.primary_specialty_id = resource_reports.resource_specialty_id)
        OR (p.role = 'subspecialty_admin' AND p.primary_subspecialty_id = resource_reports.resource_subspecialty_id)
      )
    )
  );

-- UPDATE: same admins may update (e.g. set status to reviewed/dismissed)
CREATE POLICY "resource_reports_update_admin"
  ON resource_reports FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND (
        p.role = 'super_admin'
        OR (p.role = 'specialty_admin' AND p.primary_specialty_id = resource_reports.resource_specialty_id)
        OR (p.role = 'subspecialty_admin' AND p.primary_subspecialty_id = resource_reports.resource_subspecialty_id)
      )
    )
  )
  WITH CHECK (true);
