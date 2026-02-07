-- Check the exact email stored for Conmed contacts
SELECT 
  scc.id,
  scc.email,
  scc.name,
  scc.company_id,
  sc.company_name,
  sc.subspecialty_id,
  s.name as subspecialty_name
FROM subspecialty_company_contacts scc
JOIN subspecialty_companies sc ON scc.company_id = sc.id
LEFT JOIN subspecialties s ON sc.subspecialty_id = s.id
WHERE sc.company_name ILIKE '%conmed%'
  OR scc.email ILIKE '%sportst%';
