-- Debug query to check resources with company_name and product_name
-- This helps verify if the data is actually saved in the database

SELECT 
  id,
  title,
  company_name,
  product_name,
  resource_type,
  created_at
FROM resources
WHERE company_name IS NOT NULL OR product_name IS NOT NULL
ORDER BY created_at DESC
LIMIT 20;

-- Also check if the companies table has any active companies
SELECT 
  id,
  name,
  is_active,
  created_at
FROM companies
WHERE is_active = true
ORDER BY name;
