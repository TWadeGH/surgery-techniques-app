-- Check if resources have company_name and product_name saved
SELECT 
  id,
  title,
  company_name,
  product_name
FROM resources
WHERE title LIKE '%Conmed%' OR title LIKE '%BioBrace%' OR title LIKE '%Lateral ankle%'
ORDER BY created_at DESC
LIMIT 10;

-- Also check ALL resources that have company_name set
SELECT 
  id,
  title,
  company_name,
  product_name
FROM resources
WHERE company_name IS NOT NULL AND company_name != ''
ORDER BY created_at DESC;
