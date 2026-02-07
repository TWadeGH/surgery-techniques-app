-- Enable RLS on rep_inquiries if not already enabled
ALTER TABLE rep_inquiries ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert their own inquiries
CREATE POLICY "Users can submit their own inquiries"
ON rep_inquiries
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow users to view their own inquiries
CREATE POLICY "Users can view their own inquiries"
ON rep_inquiries
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Allow reps to view inquiries for their companies
-- (This may already exist, but adding for completeness)
CREATE POLICY "Reps can view inquiries for their companies"
ON rep_inquiries
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM subspecialty_company_contacts
    WHERE subspecialty_company_contacts.subspecialty_company_id = rep_inquiries.subspecialty_company_id
      AND subspecialty_company_contacts.email = auth.jwt() ->> 'email'
  )
);

-- Allow reps to update inquiries for their companies
CREATE POLICY "Reps can update inquiries for their companies"
ON rep_inquiries
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM subspecialty_company_contacts
    WHERE subspecialty_company_contacts.subspecialty_company_id = rep_inquiries.subspecialty_company_id
      AND subspecialty_company_contacts.email = auth.jwt() ->> 'email'
  )
);
