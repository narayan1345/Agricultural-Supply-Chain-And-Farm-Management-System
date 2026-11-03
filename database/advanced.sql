USE agritrack_db;
DELIMITER $$

DROP TRIGGER IF EXISTS trg_harvest_crop_farm_check$$
DROP TRIGGER IF EXISTS trg_harvest_crop_farm_update_check$$
DROP TRIGGER IF EXISTS trg_order_item_reduce_stock$$
DROP TRIGGER IF EXISTS trg_farm_owner_role$$
DROP TRIGGER IF EXISTS trg_order_buyer_role$$
DROP PROCEDURE IF EXISTS sp_create_order$$
DROP FUNCTION IF EXISTS fn_farm_harvest_total$$

-- Trigger: ensure a harvest cannot be recorded against a crop belonging to another farm.
CREATE TRIGGER trg_harvest_crop_farm_check BEFORE INSERT ON harvests
FOR EACH ROW
BEGIN
  IF NOT EXISTS (SELECT 1 FROM crops WHERE crop_id=NEW.crop_id AND farm_id=NEW.farm_id) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Selected crop does not belong to the selected farm';
  END IF;
END$$

CREATE TRIGGER trg_harvest_crop_farm_update_check BEFORE UPDATE ON harvests
FOR EACH ROW
BEGIN
  IF NOT EXISTS (SELECT 1 FROM crops WHERE crop_id=NEW.crop_id AND farm_id=NEW.farm_id) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Selected crop does not belong to the selected farm';
  END IF;
END$$

-- Trigger: update inventory after an order item is inserted.
CREATE TRIGGER trg_order_item_reduce_stock AFTER INSERT ON order_items
FOR EACH ROW
BEGIN
  UPDATE inventory
     SET quantity_kg=quantity_kg-NEW.quantity_kg
   WHERE inventory_id=NEW.inventory_id AND quantity_kg>=NEW.quantity_kg;
  IF ROW_COUNT()=0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Insufficient stock for this order';
  END IF;
END$$

-- Procedure: create an order atomically and reduce inventory through the trigger.
CREATE PROCEDURE sp_create_order(
  IN p_buyer_id INT,
  IN p_inventory_id INT,
  IN p_quantity DECIMAL(12,2),
  IN p_delivery_address VARCHAR(255)
)
BEGIN
  DECLARE v_stock DECIMAL(14,2) DEFAULT NULL;
  DECLARE v_price DECIMAL(12,2) DEFAULT NULL;
  DECLARE v_order_id INT;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;
  DECLARE CONTINUE HANDLER FOR NOT FOUND BEGIN SET v_stock=NULL; SET v_price=NULL; END;

  IF p_quantity IS NULL OR p_quantity<=0 OR p_delivery_address IS NULL OR LENGTH(TRIM(p_delivery_address))=0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='A positive quantity and delivery address are required';
  END IF;

  START TRANSACTION;
  SELECT quantity_kg,unit_price INTO v_stock,v_price
    FROM inventory WHERE inventory_id=p_inventory_id FOR UPDATE;
  IF v_stock IS NULL OR v_price IS NULL OR v_stock<p_quantity THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Insufficient stock or invalid quantity';
  END IF;
  INSERT INTO orders(buyer_id,delivery_address,total_amount) VALUES(p_buyer_id,TRIM(p_delivery_address),0);
  SET v_order_id=LAST_INSERT_ID();
  INSERT INTO order_items(order_id,inventory_id,quantity_kg,unit_price) VALUES(v_order_id,p_inventory_id,p_quantity,v_price);
  UPDATE orders SET total_amount=(SELECT COALESCE(SUM(line_total),0) FROM order_items WHERE order_id=v_order_id),status='confirmed' WHERE order_id=v_order_id;
  INSERT INTO deliveries(order_id,tracking_code,delivery_status) VALUES(v_order_id,CONCAT('AGR-',LPAD(v_order_id,6,'0')),'scheduled');
  COMMIT;
  SELECT v_order_id AS order_id,'confirmed' AS status;
END$$

-- Function: calculate total harvested quantity for a farm.
CREATE FUNCTION fn_farm_harvest_total(p_farm_id INT) RETURNS DECIMAL(14,2) READS SQL DATA
BEGIN
  DECLARE v_total DECIMAL(14,2);
  SELECT COALESCE(SUM(quantity_kg),0) INTO v_total FROM harvests WHERE farm_id=p_farm_id;
  RETURN v_total;
END$$
DELIMITER ;

-- Database-enforced role checks for sensitive writes.
DELIMITER $$
CREATE TRIGGER trg_farm_owner_role BEFORE INSERT ON farms
FOR EACH ROW
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users u JOIN roles r ON r.role_id=u.role_id WHERE u.user_id=NEW.owner_id AND r.role_name IN ('farmer','admin')) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Only farmer or admin accounts can own farms';
  END IF;
END$$
CREATE TRIGGER trg_order_buyer_role BEFORE INSERT ON orders
FOR EACH ROW
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users u JOIN roles r ON r.role_id=u.role_id WHERE u.user_id=NEW.buyer_id AND r.role_name IN ('distributor','admin')) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Only distributor or admin accounts can place orders';
  END IF;
END$$
DELIMITER ;
