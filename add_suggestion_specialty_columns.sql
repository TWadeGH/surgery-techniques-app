-- Add specialty/subspecialty columns to resource_suggestions table
-- This allows admins to filter suggestions based on their role

-- Add user_specialty_id column (stores the specialty of the user who suggested)
ALTER TABLE resource_suggestions
ADD COLUMN IF NOT EXISTS user_specialty_id UUID REFERENCES specialties(id) ON DELETE SET NULL;

-- Add user_subspecialty_id column (stores the subspecialty of the user who suggested)
ALTER TABLE resource_suggestions
ADD COLUMN IF NOT EXISTS user_subspecialty_id UUID REFERENCES subspecialties(id) ON DELETE SET NULL;

-- Add reviewed_by column (stores which admin reviewed the suggestion)
ALTER TABLE resource_suggestions
ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Add reviewed_at column (timestamp when suggestion was reviewed)
ALTER TABLE resource_suggestions
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_resource_suggestions_user_specialty_id ON resource_suggestions(user_specialty_id);
CREATE INDEX IF NOT EXISTS idx_resource_suggestions_user_subspecialty_id ON resource_suggestions(user_subspecialty_id);
CREATE INDEX IF NOT EXISTS idx_resource_suggestions_status ON resource_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_resource_suggestions_reviewed_by ON resource_suggestions(reviewed_by);

-- Add comments
COMMENT ON COLUMN resource_suggestions.user_specialty_id IS 'Specialty of the user who suggested this resource. Used for filtering by specialty admins.';
COMMENT ON COLUMN resource_suggestions.user_subspecialty_id IS 'Subspecialty of the user who suggested this resource. Used for filtering by subspecialty admins.';
COMMENT ON COLUMN resource_suggestions.reviewed_by IS 'Admin who reviewed this suggestion.';
COMMENT ON COLUMN resource_suggestions.reviewed_at IS 'Timestamp when the suggestion was reviewed.';
