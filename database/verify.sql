USE agritrack_db;
SELECT 'roles' AS entity, COUNT(*) AS records FROM roles
UNION ALL SELECT 'users',COUNT(*) FROM users
UNION ALL SELECT 'farms',COUNT(*) FROM farms
UNION ALL SELECT 'crops',COUNT(*) FROM crops
UNION ALL SELECT 'harvests',COUNT(*) FROM harvests
UNION ALL SELECT 'warehouses',COUNT(*) FROM warehouses
UNION ALL SELECT 'inventory',COUNT(*) FROM inventory
UNION ALL SELECT 'orders',COUNT(*) FROM orders;
SELECT * FROM vw_available_inventory ORDER BY crop_name;
SELECT f.farm_name,fn_farm_harvest_total(f.farm_id) AS total_harvest_kg FROM farms f;
