-- Enable SELECT access for subspecialties
-- This table is joined when checking rep access and loading company info
CREATE POLICY "authenticated_users_can_view_subspecialties"
ON subspecialties
FOR SELECT
TO authenticated
USING (true);

-- This allows any authenticated user to read subspecialties
-- which is necessary for:
-- 1. Checking if a user is a rep (joins through companies to subspecialties)
-- 2. Displaying subspecialty names in the UI
-- 3. Filtering resources and companies by subspecialty
