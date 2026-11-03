USE agritrack_db;

-- DML: create, update and remove one repeatable demonstration supplier.
INSERT INTO suppliers(supplier_name,contact_person,email,phone,city)
VALUES('AgriTrack Query Demo Supplier','Ravi Kumar','demo-supplier@agritrack.example','9876500001','Bengaluru')
ON DUPLICATE KEY UPDATE contact_person=VALUES(contact_person),email=VALUES(email),phone=VALUES(phone),city=VALUES(city);

UPDATE suppliers
SET phone='9876500002'
WHERE supplier_name='AgriTrack Query Demo Supplier';

DELETE FROM suppliers
WHERE supplier_name='AgriTrack Query Demo Supplier';

-- JOIN: crop inventory with warehouse and reorder status.
SELECT c.crop_name,c.variety,w.warehouse_name,i.quantity_kg,i.unit_price,
       CASE WHEN i.quantity_kg<=i.reorder_level_kg THEN 'REORDER' ELSE 'SUFFICIENT' END AS stock_status
FROM inventory i
JOIN crops c ON c.crop_id=i.crop_id
JOIN warehouses w ON w.warehouse_id=i.warehouse_id
ORDER BY c.crop_name,w.warehouse_name;

-- Nested query: farms whose harvested quantity is above the average total per farm.
SELECT f.farm_id,f.farm_name
FROM farms f
WHERE (SELECT COALESCE(SUM(h.quantity_kg),0)
       FROM harvests h WHERE h.farm_id=f.farm_id) >
      (SELECT AVG(farm_total)
       FROM (SELECT SUM(quantity_kg) AS farm_total
             FROM harvests GROUP BY farm_id) AS farm_totals);

-- Correlated query: most recent harvest row(s) for each farm.
SELECT h.farm_id,h.harvest_id,h.harvest_date,h.quantity_kg
FROM harvests h
WHERE h.harvest_date=(SELECT MAX(h2.harvest_date)
                      FROM harvests h2 WHERE h2.farm_id=h.farm_id)
ORDER BY h.farm_id,h.harvest_id;

-- Recursive CTE: generate a six-month reporting calendar.
WITH RECURSIVE month_series AS (
  SELECT DATE_FORMAT(CURDATE(),'%Y-%m-01') AS month_start,1 AS month_no
  UNION ALL
  SELECT DATE_ADD(month_start,INTERVAL 1 MONTH),month_no+1
  FROM month_series WHERE month_no<6
)
SELECT month_no,DATE_FORMAT(month_start,'%b %Y') AS reporting_month
FROM month_series;

-- CTE: rank crops by total harvested volume.
WITH crop_totals AS (
  SELECT c.crop_id,c.crop_name,SUM(h.quantity_kg) AS total_kg
  FROM crops c JOIN harvests h ON h.crop_id=c.crop_id
  GROUP BY c.crop_id,c.crop_name
)
SELECT crop_name,total_kg
FROM crop_totals
ORDER BY total_kg DESC,crop_name
LIMIT 5;

-- Function and view examples.
SELECT f.farm_id,f.farm_name,fn_farm_harvest_total(f.farm_id) AS lifetime_harvest_kg
FROM farms f ORDER BY f.farm_name;

SELECT * FROM vw_available_inventory ORDER BY crop_name,warehouse_name;

-- Transaction example: raise the stock of the first inventory record by 25 kg.
SET @demo_inventory_id := (SELECT MIN(inventory_id) FROM inventory);
START TRANSACTION;
UPDATE inventory
SET quantity_kg=quantity_kg+25
WHERE inventory_id=@demo_inventory_id;
COMMIT;
