-- Linked Resource Schema (best practice: source, content type, curator, verified date)
-- Run in Supabase SQL editor. Adds columns to existing resources table + click tracking.

-- 1) Add columns to resources (if not present)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'resources' AND column_name = 'source_type') THEN
    ALTER TABLE resources ADD COLUMN source_type TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'resources' AND column_name = 'source_name') THEN
    ALTER TABLE resources ADD COLUMN source_name TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'resources' AND column_name = 'content_type') THEN
    ALTER TABLE resources ADD COLUMN content_type TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'resources' AND column_name = 'copyright_license') THEN
    ALTER TABLE resources ADD COLUMN copyright_license TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'resources' AND column_name = 'verified_at') THEN
    ALTER TABLE resources ADD COLUMN verified_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'resources' AND column_name = 'curation_notes') THEN
    ALTER TABLE resources ADD COLUMN curation_notes TEXT;
  END IF;
END $$;

-- Optional: constraint for source_type enum
-- ALTER TABLE resources ADD CONSTRAINT resources_source_type_check
--   CHECK (source_type IS NULL OR source_type IN ('youtube', 'manufacturer', 'journal', 'institution', 'vimeo', 'other'));

-- 2) Resource link click tracking (analytics + sponsor targeting)
CREATE TABLE IF NOT EXISTS resource_link_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  source_type TEXT,
  device_type TEXT,
  platform TEXT
);

CREATE INDEX IF NOT EXISTS idx_resource_link_clicks_resource_id ON resource_link_clicks(resource_id);
CREATE INDEX IF NOT EXISTS idx_resource_link_clicks_timestamp ON resource_link_clicks(timestamp DESC);

ALTER TABLE resource_link_clicks ENABLE ROW LEVEL SECURITY;

-- Allow insert for authenticated and anon (track clicks); no read for regular users
-- Drop first so script is safe to re-run
DROP POLICY IF EXISTS "resource_link_clicks_insert" ON resource_link_clicks;
CREATE POLICY "resource_link_clicks_insert" ON resource_link_clicks
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "resource_link_clicks_select_service" ON resource_link_clicks;
CREATE POLICY "resource_link_clicks_select_service" ON resource_link_clicks
  FOR SELECT USING (auth.role() = 'service_role' OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'super_admin'));
