-- Add implant_info_url column to resources and resource_suggestions tables
-- Run this in Supabase SQL Editor

-- Add to resources table
ALTER TABLE resources
ADD COLUMN IF NOT EXISTS implant_info_url text;

-- Add to resource_suggestions table
ALTER TABLE resource_suggestions
ADD COLUMN IF NOT EXISTS implant_info_url text;

-- Add comment for documentation
COMMENT ON COLUMN resources.implant_info_url IS 'Optional link to implant/device specifications';
COMMENT ON COLUMN resource_suggestions.implant_info_url IS 'Optional link to implant/device specifications';
