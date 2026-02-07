-- Enable SELECT access for subspecialty_companies
-- This table is joined when checking rep access and loading companies
CREATE POLICY "authenticated_users_can_view_subspecialty_companies"
ON subspecialty_companies
FOR SELECT
TO authenticated
USING (true);

-- This allows any authenticated user to read subspecialty companies
-- which is necessary for:
-- 1. Checking if a user is a rep (joins with company_contacts)
-- 2. Loading companies list in admin mode
-- 3. Displaying "Contact Rep" buttons (checking if company is active)
