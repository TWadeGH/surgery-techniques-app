-- Enable SELECT access for company contacts
-- Authenticated users need to be able to check if they are reps
CREATE POLICY "authenticated_users_can_view_company_contacts"
ON subspecialty_company_contacts
FOR SELECT
TO authenticated
USING (true);

-- This allows any authenticated user to read company contacts
-- which is necessary for:
-- 1. Checking if a user is a rep (for showing Rep Portal tab)
-- 2. Displaying "Contact Rep" buttons on resources
-- 3. Loading company contact info in rep portal
