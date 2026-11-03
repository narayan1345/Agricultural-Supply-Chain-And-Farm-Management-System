-- AgriTrack relational database schema (MySQL 8.0+)
CREATE DATABASE IF NOT EXISTS agritrack_db CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE agritrack_db;

CREATE TABLE IF NOT EXISTS roles (
 role_id INT AUTO_INCREMENT PRIMARY KEY,
 role_name VARCHAR(30) NOT NULL UNIQUE,
 description VARCHAR(150)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS users (
 user_id INT AUTO_INCREMENT PRIMARY KEY,
 role_id INT NOT NULL,
 full_name VARCHAR(100) NOT NULL,
 email VARCHAR(150) NOT NULL UNIQUE,
 password_hash VARCHAR(255) NOT NULL,
 phone VARCHAR(20),
 is_active BOOLEAN NOT NULL DEFAULT TRUE,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT fk_users_role FOREIGN KEY(role_id) REFERENCES roles(role_id)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS farms (
 farm_id INT AUTO_INCREMENT PRIMARY KEY,
 owner_id INT NOT NULL,
 farm_name VARCHAR(120) NOT NULL,
 location VARCHAR(180) NOT NULL,
 land_area_acres DECIMAL(10,2) NOT NULL CHECK(land_area_acres>0),
 soil_type VARCHAR(60),
 is_active BOOLEAN DEFAULT TRUE,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT fk_farms_owner FOREIGN KEY(owner_id) REFERENCES users(user_id)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS crops (
 crop_id INT AUTO_INCREMENT PRIMARY KEY,
 farm_id INT NOT NULL,
 crop_name VARCHAR(100) NOT NULL,
 variety VARCHAR(100),
 season VARCHAR(40),
 expected_yield_kg DECIMAL(12,2) DEFAULT 0 CHECK(expected_yield_kg>=0),
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT fk_crops_farm FOREIGN KEY(farm_id) REFERENCES farms(farm_id) ON DELETE CASCADE
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS suppliers (
 supplier_id INT AUTO_INCREMENT PRIMARY KEY,
 supplier_name VARCHAR(120) NOT NULL,
 contact_person VARCHAR(100),
 email VARCHAR(150),
 phone VARCHAR(20),
 city VARCHAR(80) NOT NULL,
 CONSTRAINT uq_suppliers_name UNIQUE(supplier_name)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS harvests (
 harvest_id INT AUTO_INCREMENT PRIMARY KEY,
 farm_id INT NOT NULL,
 crop_id INT NOT NULL,
 harvest_date DATE NOT NULL,
 quantity_kg DECIMAL(12,2) NOT NULL CHECK(quantity_kg>0),
 quality_grade ENUM('A','B','C') NOT NULL DEFAULT 'A',
 notes VARCHAR(255),
 CONSTRAINT fk_harvest_farm FOREIGN KEY(farm_id) REFERENCES farms(farm_id),
 CONSTRAINT fk_harvest_crop FOREIGN KEY(crop_id) REFERENCES crops(crop_id)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS warehouses (
 warehouse_id INT AUTO_INCREMENT PRIMARY KEY,
 warehouse_name VARCHAR(120) NOT NULL,
 location VARCHAR(180) NOT NULL,
 capacity_kg DECIMAL(14,2) NOT NULL CHECK(capacity_kg>0),
 manager_name VARCHAR(100)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS inventory (
 inventory_id INT AUTO_INCREMENT PRIMARY KEY,
 crop_id INT NOT NULL,
 warehouse_id INT NOT NULL,
 quantity_kg DECIMAL(14,2) NOT NULL DEFAULT 0 CHECK(quantity_kg>=0),
 unit_price DECIMAL(12,2) NOT NULL DEFAULT 45.00 CHECK(unit_price>=0),
 reorder_level_kg DECIMAL(14,2) NOT NULL DEFAULT 100 CHECK(reorder_level_kg>=0),
 last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 CONSTRAINT fk_inventory_crop FOREIGN KEY(crop_id) REFERENCES crops(crop_id),
 CONSTRAINT fk_inventory_warehouse FOREIGN KEY(warehouse_id) REFERENCES warehouses(warehouse_id),
 CONSTRAINT uq_inventory_crop_warehouse UNIQUE(crop_id,warehouse_id)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS orders (
 order_id INT AUTO_INCREMENT PRIMARY KEY,
 buyer_id INT NOT NULL,
 order_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 status ENUM('pending','confirmed','processing','dispatched','delivered','cancelled') NOT NULL DEFAULT 'pending',
 total_amount DECIMAL(14,2) NOT NULL DEFAULT 0 CHECK(total_amount>=0),
 delivery_address VARCHAR(255) NOT NULL,
 CONSTRAINT fk_orders_buyer FOREIGN KEY(buyer_id) REFERENCES users(user_id)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS order_items (
 order_item_id INT AUTO_INCREMENT PRIMARY KEY,
 order_id INT NOT NULL,
 inventory_id INT NOT NULL,
 quantity_kg DECIMAL(12,2) NOT NULL CHECK(quantity_kg>0),
 unit_price DECIMAL(12,2) NOT NULL CHECK(unit_price>=0),
 line_total DECIMAL(14,2) GENERATED ALWAYS AS (quantity_kg*unit_price) STORED,
 CONSTRAINT fk_items_order FOREIGN KEY(order_id) REFERENCES orders(order_id) ON DELETE CASCADE,
 CONSTRAINT fk_items_inventory FOREIGN KEY(inventory_id) REFERENCES inventory(inventory_id)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS deliveries (
 delivery_id INT AUTO_INCREMENT PRIMARY KEY,
 order_id INT NOT NULL UNIQUE,
 tracking_code VARCHAR(50) NOT NULL UNIQUE,
 dispatch_date DATE,
 expected_date DATE,
 delivered_date DATE,
 delivery_status ENUM('scheduled','in_transit','delivered','delayed') NOT NULL DEFAULT 'scheduled',
 CONSTRAINT fk_delivery_order FOREIGN KEY(order_id) REFERENCES orders(order_id) ON DELETE CASCADE
) ENGINE=InnoDB;

INSERT INTO roles(role_name,description) VALUES
('admin','Full system administration'),('farmer','Manage own farms and harvests'),('distributor','Browse inventory and place orders')
ON DUPLICATE KEY UPDATE description=VALUES(description);

CREATE OR REPLACE VIEW vw_available_inventory AS
SELECT i.inventory_id,c.crop_name,c.variety,w.warehouse_name,w.location AS warehouse_location,
       i.quantity_kg,i.reorder_level_kg,
       CASE WHEN i.quantity_kg<=i.reorder_level_kg THEN 'REORDER' ELSE 'AVAILABLE' END AS stock_status
FROM inventory i JOIN crops c ON c.crop_id=i.crop_id JOIN warehouses w ON w.warehouse_id=i.warehouse_id;
