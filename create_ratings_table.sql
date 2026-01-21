-- Create resource_ratings table for surgeon ratings
-- Each authenticated user (surgeon) can rate each resource once (1-5 stars)

-- Create the ratings table
CREATE TABLE IF NOT EXISTS resource_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(resource_id, user_id) -- One rating per user per resource
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_resource_ratings_resource_id ON resource_ratings(resource_id);
CREATE INDEX IF NOT EXISTS idx_resource_ratings_user_id ON resource_ratings(user_id);

-- Enable RLS
ALTER TABLE resource_ratings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for resource_ratings

-- SELECT: All authenticated users can view all ratings
CREATE POLICY "Anyone can view ratings"
ON resource_ratings
FOR SELECT
TO authenticated
USING (true);

-- INSERT: Authenticated users can insert their own ratings
CREATE POLICY "Users can insert their own ratings"
ON resource_ratings
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND rating >= 1 
  AND rating <= 5
);

-- UPDATE: Users can update their own ratings
CREATE POLICY "Users can update their own ratings"
ON resource_ratings
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (
  user_id = auth.uid()
  AND rating >= 1 
  AND rating <= 5
);

-- DELETE: Users can delete their own ratings
CREATE POLICY "Users can delete their own ratings"
ON resource_ratings
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_resource_ratings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on rating updates
CREATE TRIGGER update_resource_ratings_updated_at
BEFORE UPDATE ON resource_ratings
FOR EACH ROW
EXECUTE FUNCTION update_resource_ratings_updated_at();

-- Comment the table
COMMENT ON TABLE resource_ratings IS 'Surgeon ratings for resources (1-5 stars)';
