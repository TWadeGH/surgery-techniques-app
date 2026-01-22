-- Add category_id column to resources table
ALTER TABLE resources
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE SET NULL;

COMMENT ON COLUMN resources.category_id IS 'Direct reference to the category this resource belongs to. Replaces procedure_id for new resources.';

-- Add category_id column to resource_suggestions table
ALTER TABLE resource_suggestions
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE SET NULL;

COMMENT ON COLUMN resource_suggestions.category_id IS 'Direct reference to the category this suggested resource belongs to. Replaces procedure_id for new suggestions.';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_resources_category_id ON resources(category_id);
CREATE INDEX IF NOT EXISTS idx_resource_suggestions_category_id ON resource_suggestions(category_id);
