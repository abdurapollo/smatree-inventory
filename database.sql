-- ==========================================================================
-- Smatree Solar Panel Production Inventory Management System
-- Database Schema for Users, Suppliers & Purchased Raw Materials
-- Database Name: smatree_inventory
-- ==========================================================================

CREATE DATABASE IF NOT EXISTS `smatree_inventory` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `smatree_inventory`;

-- --------------------------------------------------------------------------
-- 1. Table structure for `users`
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_code` VARCHAR(20) NOT NULL UNIQUE COMMENT 'Unique identifier, e.g. USR-001',
  `name` VARCHAR(100) NOT NULL COMMENT 'Full Name, e.g. Rajesh Kumar',
  `display_name` VARCHAR(50) NOT NULL COMMENT 'Short name for UI display, e.g. Rajesh K.',
  `email` VARCHAR(150) NOT NULL UNIQUE COMMENT 'Work Email Address',
  `password` VARCHAR(255) NOT NULL COMMENT 'Bcrypt password hash',
  `role` VARCHAR(50) NOT NULL COMMENT 'System Role identifier (Admin, Inventory Manager, Production Manager, Sales Manager)',
  `role_label` VARCHAR(50) NOT NULL COMMENT 'UI Display Label (Super Admin, Inventory Lead, Plant Manager, Sales Director)',
  `avatar` VARCHAR(255) DEFAULT NULL COMMENT 'Avatar image URL or initials identifier',
  `status` ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
  `last_login` DATETIME DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_email` (`email`),
  INDEX `idx_role` (`role`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='User credentials and 4-level role access';

-- Seed Users
INSERT INTO `users` (`id`, `user_code`, `name`, `display_name`, `email`, `password`, `role`, `role_label`, `status`, `created_at`) VALUES
(1, 'USR-001', 'Rajesh Kumar', 'Rajesh K.', 'admin@smatree.com', '$2y$10$Za1c1Q44hxyt/ijzyNPw9u13D2CT3okb1zA09t6AecBtE6OeD67EK', 'Admin', 'Super Admin', 'active', '2025-01-15 10:00:00'),
(2, 'USR-002', 'Priya Sharma', 'Priya S.', 'inventory@smatree.com', '$2y$10$EnbChlQd8yWJ6V2dXL.Gde9zE5ZCEJR6Tj9LPRUoaCXVZ0SM9H3Ea', 'Inventory Manager', 'Inventory Lead', 'active', '2025-02-01 10:00:00'),
(3, 'USR-003', 'Amit Patel', 'Amit P.', 'production@smatree.com', '$2y$10$Ce/V6UVS4dXRHwuoBuUsfOZLr2OCLvp47KgyQbfEELtNO0IdxbVAK', 'Production Manager', 'Plant Manager', 'active', '2025-02-15 10:00:00'),
(4, 'USR-004', 'Sneha Reddy', 'Sneha R.', 'sales@smatree.com', '$2y$10$nKSf0XkG5FIe7Xp4rfCJVerqyhCouAyL1I5GWECE8883L4w4demuq', 'Sales Manager', 'Sales Director', 'active', '2025-03-01 10:00:00')
ON DUPLICATE KEY UPDATE `email` = VALUES(`email`);

-- --------------------------------------------------------------------------
-- 2. Table structure for `suppliers`
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `suppliers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `supplier_code` VARCHAR(20) NOT NULL UNIQUE COMMENT 'Unique supplier code, e.g. SUP-001',
  `name` VARCHAR(100) NOT NULL COMMENT 'Contact Person Name',
  `company` VARCHAR(150) NOT NULL COMMENT 'Company / Vendor Name',
  `phone` VARCHAR(30) DEFAULT NULL,
  `email` VARCHAR(150) DEFAULT NULL,
  `gst` VARCHAR(30) DEFAULT NULL COMMENT 'GSTIN registration number',
  `address` TEXT DEFAULT NULL,
  `materials` TEXT DEFAULT NULL COMMENT 'Comma-separated categories supplied',
  `status` ENUM('active', 'inactive') DEFAULT 'active',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_company` (`company`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Solar raw material vendors and suppliers';

-- Seed Suppliers
INSERT INTO `suppliers` (`id`, `supplier_code`, `name`, `company`, `phone`, `email`, `gst`, `address`, `materials`, `status`) VALUES
(1, 'SUP-001', 'Vikram Singh', 'SolarTech Industries', '+91 98765 43210', 'vikram@solartech.in', '27AADCS1234F1ZP', 'Plot 45, MIDC Bhosari, Pune, Maharashtra', 'Solar Cells, EVA Sheet', 'active'),
(2, 'SUP-002', 'Arun Mehta', 'GlassCraft Ltd', '+91 87654 32109', 'arun@glasscraft.in', '24AADCG5678K1ZQ', '12 Industrial Area, Vadodara, Gujarat', 'Glass, Backsheet', 'active'),
(3, 'SUP-003', 'Deepak Joshi', 'FrameWorks Aluminium', '+91 76543 21098', 'deepak@frameworks.in', '29AADCF9012L1ZR', '78 Peenya Industrial, Bangalore, Karnataka', 'Aluminum Frame, Mounting Structure', 'active'),
(4, 'SUP-004', 'Meera Nair', 'PowerBox Electronics', '+91 65432 10987', 'meera@powerbox.in', '32AADCP3456M1ZS', '34 Technopark, Trivandrum, Kerala', 'Junction Box, Inverter, Copper Wire', 'active'),
(5, 'SUP-005', 'Suresh Gupta', 'BatteryKing Pvt Ltd', '+91 54321 09876', 'suresh@batteryking.in', '07AADCB7890N1ZT', '56 Okhla Industrial, New Delhi', 'Battery', 'active')
ON DUPLICATE KEY UPDATE `company` = VALUES(`company`);

-- --------------------------------------------------------------------------
-- 3. Table structure for `purchased_raw_materials`
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `purchased_raw_materials` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `material_code` VARCHAR(20) NOT NULL UNIQUE COMMENT 'Unique material code, e.g. MAT-001',
  `category` VARCHAR(100) NOT NULL COMMENT 'Category (Solar Cells, Glass, Aluminum Frame, etc.)',
  `supplier_id` INT DEFAULT NULL COMMENT 'Foreign key to suppliers table',
  `supplier_name` VARCHAR(150) DEFAULT NULL COMMENT 'Vendor company name',
  `quantity` INT NOT NULL DEFAULT 0,
  `unit` VARCHAR(50) NOT NULL DEFAULT 'Pieces' COMMENT 'Pieces, Sheets, Rolls, Sets, Meters, Units',
  `cost_per_unit` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `total_value` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `warehouse_location` VARCHAR(150) DEFAULT NULL COMMENT 'e.g. Warehouse A - Rack 1',
  `purchase_date` DATE NOT NULL,
  `notes` TEXT DEFAULT NULL,
  `image` VARCHAR(255) DEFAULT NULL,
  `reorder_level` INT NOT NULL DEFAULT 50,
  `status` ENUM('in_stock', 'low_stock', 'out_of_stock') DEFAULT 'in_stock',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_category` (`category`),
  INDEX `idx_supplier_name` (`supplier_name`),
  INDEX `idx_purchase_date` (`purchase_date`),
  INDEX `idx_status` (`status`),
  CONSTRAINT `fk_prm_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Purchased solar manufacturing raw materials';

-- Seed Purchased Raw Materials
INSERT INTO `purchased_raw_materials` 
(`id`, `material_code`, `category`, `supplier_id`, `supplier_name`, `quantity`, `unit`, `cost_per_unit`, `total_value`, `warehouse_location`, `purchase_date`, `notes`, `reorder_level`, `status`) VALUES
(1, 'MAT-001', 'Solar Cells', 1, 'SolarTech Industries', 5000, 'Pieces', 85.00, 425000.00, 'Warehouse A - Rack 1', '2026-04-15', 'Grade A cells, 22% efficiency', 1000, 'in_stock'),
(2, 'MAT-002', 'Solar Cells', 1, 'SolarTech Industries', 3200, 'Pieces', 65.00, 208000.00, 'Warehouse A - Rack 2', '2026-04-18', 'Grade B cells, 18% efficiency', 800, 'in_stock'),
(3, 'MAT-003', 'Glass', 2, 'GlassCraft Ltd', 1200, 'Sheets', 450.00, 540000.00, 'Warehouse B - Section 1', '2026-04-20', 'Anti-reflective coating, 4mm thickness', 300, 'in_stock'),
(4, 'MAT-004', 'Aluminum Frame', 3, 'FrameWorks Aluminium', 800, 'Sets', 620.00, 496000.00, 'Warehouse C - Bay 1', '2026-04-22', 'Anodized silver, pre-drilled holes', 200, 'in_stock'),
(5, 'MAT-005', 'EVA Sheet', 1, 'SolarTech Industries', 2500, 'Rolls', 180.00, 450000.00, 'Warehouse A - Rack 3', '2026-04-25', 'Fast cure formula, UV resistant', 500, 'in_stock'),
(6, 'MAT-006', 'Backsheet', 2, 'GlassCraft Ltd', 1500, 'Rolls', 220.00, 330000.00, 'Warehouse B - Section 2', '2026-04-28', 'Tedlar-PET-Tedlar composite', 400, 'in_stock'),
(7, 'MAT-007', 'Junction Box', 4, 'PowerBox Electronics', 150, 'Pieces', 95.00, 14250.00, 'Warehouse D - Shelf 1', '2026-05-01', 'With bypass diodes, MC4 compatible', 300, 'low_stock'),
(8, 'MAT-008', 'Copper Wire', 4, 'PowerBox Electronics', 3000, 'Meters', 12.00, 36000.00, 'Warehouse D - Shelf 2', '2026-05-02', 'For cell interconnection', 1000, 'in_stock'),
(9, 'MAT-009', 'Inverter', 4, 'PowerBox Electronics', 45, 'Units', 28000.00, 1260000.00, 'Warehouse E - Zone 1', '2026-05-03', 'MPPT tracking, WiFi monitoring', 15, 'in_stock'),
(10, 'MAT-010', 'Battery', 5, 'BatteryKing Pvt Ltd', 30, 'Units', 85000.00, 2550000.00, 'Warehouse E - Zone 2', '2026-05-05', 'LiFePO4, 10-year warranty', 10, 'in_stock'),
(11, 'MAT-011', 'Mounting Structure', 3, 'FrameWorks Aluminium', 320, 'Sets', 1200.00, 384000.00, 'Warehouse C - Bay 2', '2026-05-06', 'Galvanized steel, wind load rated', 80, 'in_stock'),
(12, 'MAT-012', 'Inverter', 4, 'PowerBox Electronics', 108, 'Units', 55000.00, 5940000.00, 'Warehouse E - Zone 1', '2026-05-07', 'On/off grid capability', 10, 'in_stock')
ON DUPLICATE KEY UPDATE `category` = VALUES(`category`);

-- --------------------------------------------------------------------------
-- 4. Table structure for `products` (Solar Panels Catalog & Stock)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `products` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `product_code` VARCHAR(20) NOT NULL UNIQUE COMMENT 'Unique product code e.g. PROD-001 or FG-001',
  `name` VARCHAR(150) NOT NULL COMMENT 'Solar panel commercial name',
  `model_number` VARCHAR(100) DEFAULT NULL COMMENT 'Model identifier',
  `cell_type` VARCHAR(50) NOT NULL DEFAULT 'Mono PERC',
  `watt_capacity` INT NOT NULL DEFAULT 400,
  `efficiency` DECIMAL(5,2) DEFAULT 21.50,
  `dimensions` VARCHAR(100) DEFAULT '2008 x 1002 x 35 mm',
  `weight_kg` DECIMAL(6,2) DEFAULT 22.50,
  `price_per_unit` DECIMAL(12,2) NOT NULL DEFAULT 12500.00,
  `total_produced` INT NOT NULL DEFAULT 0,
  `ready_to_sell` INT NOT NULL DEFAULT 0,
  `reserved_quantity` INT NOT NULL DEFAULT 0,
  `sold_quantity` INT NOT NULL DEFAULT 0,
  `warranty_years` VARCHAR(50) DEFAULT '25 Years',
  `status` ENUM('in_stock', 'low_stock', 'out_of_stock', 'discontinued') DEFAULT 'in_stock',
  `is_deleted` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Soft delete flag: 0=active, 1=soft-deleted/archived',
  `deleted_at` DATETIME DEFAULT NULL COMMENT 'Timestamp when soft deleted',
  `image` VARCHAR(255) DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_name` (`name`),
  INDEX `idx_cell_type` (`cell_type`),
  INDEX `idx_status` (`status`),
  INDEX `idx_is_deleted` (`is_deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Solar panels catalog and sales stock inventory';

-- Seed Products
INSERT INTO `products` 
(`id`, `product_code`, `name`, `model_number`, `cell_type`, `watt_capacity`, `efficiency`, `price_per_unit`, `total_produced`, `ready_to_sell`, `reserved_quantity`, `sold_quantity`, `warranty_years`, `status`)
VALUES 
(1, 'FG-001', 'SunMax Mono PERC 400W', 'SM-400-MP', 'Mono PERC', 400, 20.80, 12500.00, 180, 150, 0, 30, '25 Years', 'in_stock'),
(2, 'FG-002', 'SunMax Poly 330W', 'SM-330-PL', 'Polycrystalline', 330, 17.50, 9800.00, 360, 260, 20, 80, '20 Years', 'in_stock'),
(3, 'FG-003', 'SunMax Mono PERC 540W', 'SM-540-MP', 'Mono PERC', 540, 21.60, 16800.00, 180, 140, 40, 0, '25 Years', 'in_stock'),
(4, 'FG-004', 'HelioPro Bifacial 650W', 'HP-650-BF', 'Bifacial', 650, 22.40, 21500.00, 120, 120, 0, 0, '30 Years', 'in_stock'),
(5, 'FG-005', 'RayPower TopCon 580W', 'RP-580-TC', 'TopCon N-Type', 580, 22.10, 18900.00, 95, 95, 0, 0, '25 Years', 'in_stock')
ON DUPLICATE KEY UPDATE 
    `name` = VALUES(`name`),
    `price_per_unit` = VALUES(`price_per_unit`),
    `ready_to_sell` = VALUES(`ready_to_sell`);

-- --------------------------------------------------------------------------
-- 5. Table structure for `sales` (Sales Records & Allocations)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `sales` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `sale_code` VARCHAR(20) NOT NULL UNIQUE COMMENT 'Unique sale code e.g. SALE-001',
  `product_id` INT NOT NULL,
  `product_code` VARCHAR(20) NOT NULL,
  `product_name` VARCHAR(150) NOT NULL,
  `customer_name` VARCHAR(150) NOT NULL,
  `customer_phone` VARCHAR(30) DEFAULT NULL,
  `customer_email` VARCHAR(150) DEFAULT NULL,
  `customer_address` TEXT DEFAULT NULL,
  `quantity` INT NOT NULL DEFAULT 1,
  `unit_price` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `total_amount` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `sale_date` DATE NOT NULL,
  `status` ENUM('Reserved', 'Sold', 'Cancelled') NOT NULL DEFAULT 'Reserved',
  `notes` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_sale_date` (`sale_date`),
  INDEX `idx_status` (`status`),
  INDEX `idx_customer` (`customer_name`),
  CONSTRAINT `fk_sales_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Sales orders and reservations for solar panels';

-- Seed Sales
INSERT INTO `sales` 
(`id`, `sale_code`, `product_id`, `product_code`, `product_name`, `customer_name`, `customer_phone`, `customer_email`, `quantity`, `unit_price`, `total_amount`, `sale_date`, `status`, `notes`)
VALUES 
(1, 'SALE-001', 1, 'FG-001', 'SunMax Mono PERC 400W', 'Mahesh Industries', '+91 99887 76655', 'mahesh@industries.in', 30, 12500.00, 375000.00, '2026-04-18', 'Sold', 'Dispatched to Pune factory rooftop project'),
(2, 'SALE-002', 2, 'FG-002', 'SunMax Poly 330W', 'Green Valley School', '+91 88776 65544', 'contact@greenvalley.edu', 20, 9800.00, 196000.00, '2026-04-25', 'Reserved', 'Phase 1 rooftop solar installation hold'),
(3, 'SALE-003', 2, 'FG-002', 'SunMax Poly 330W', 'Green Valley School', '+91 88776 65544', 'contact@greenvalley.edu', 80, 9800.00, 784000.00, '2026-04-30', 'Sold', 'Full delivery completed with invoice #INV-492'),
(4, 'SALE-004', 3, 'FG-003', 'SunMax Mono PERC 540W', 'Sunrise Hospital', '+91 77665 54433', 'admin@sunrisehosp.org', 40, 16800.00, 672000.00, '2026-05-05', 'Reserved', 'Awaiting site clearance inspection')
ON DUPLICATE KEY UPDATE 
    `customer_name` = VALUES(`customer_name`),
    `status` = VALUES(`status`),
    `total_amount` = VALUES(`total_amount`);

-- --------------------------------------------------------------------------
-- 6. Table structure for `production_batches`
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `production_batches` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `batch_code` VARCHAR(20) NOT NULL UNIQUE COMMENT 'Unique batch identifier, e.g. BATCH-001',
  `product_id` INT DEFAULT NULL COMMENT 'Optional link to products table',
  `panel_type` VARCHAR(100) NOT NULL,
  `watt_capacity` INT NOT NULL DEFAULT 400,
  `quantity` INT NOT NULL DEFAULT 1,
  `team_assigned` VARCHAR(100) NOT NULL,
  `start_date` DATE NOT NULL,
  `completion_date` DATE DEFAULT NULL,
  `status` ENUM('Pending', 'In Production', 'Quality Check', 'Completed') NOT NULL DEFAULT 'Pending',
  `progress` INT NOT NULL DEFAULT 0,
  `production_cost` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `materials_used` TEXT DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_status` (`status`),
  INDEX `idx_batch_code` (`batch_code`),
  INDEX `idx_start_date` (`start_date`),
  CONSTRAINT `fk_pb_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Production batches and manufacturing progress';

-- Seed Production Batches
INSERT INTO `production_batches` 
(`id`, `batch_code`, `product_id`, `panel_type`, `watt_capacity`, `quantity`, `team_assigned`, `start_date`, `completion_date`, `status`, `progress`, `production_cost`, `materials_used`)
VALUES
(1, 'BATCH-001', 1, 'Mono PERC 400W', 400, 200, 'Team Alpha', '2026-04-01', '2026-04-15', 'Completed', 100, 1250000.00, 'Monocrystalline Cells, Glass, Aluminum Frame, EVA, Backsheet, Junction Box'),
(2, 'BATCH-002', 2, 'Poly 330W', 330, 300, 'Team Beta', '2026-04-10', '2026-04-28', 'Completed', 100, 1425000.00, 'Polycrystalline Cells, Glass, Aluminum Frame, EVA, Backsheet, Junction Box'),
(3, 'BATCH-003', 3, 'Mono PERC 540W', 540, 150, 'Team Alpha', '2026-04-20', '2026-05-08', 'Completed', 100, 1687500.00, 'Monocrystalline Cells, Glass, Aluminum Frame, EVA, Backsheet, Junction Box'),
(4, 'BATCH-004', 4, 'Bifacial 450W', 450, 100, 'Team Gamma', '2026-05-01', NULL, 'In Production', 65, 875000.00, 'Monocrystalline Cells, Glass (double), Aluminum Frame, EVA, Junction Box'),
(5, 'BATCH-005', 1, 'Mono PERC 400W', 400, 250, 'Team Beta', '2026-05-05', NULL, 'Pending', 0, 0.00, 'Monocrystalline Cells, Glass, Aluminum Frame, EVA, Backsheet, Junction Box'),
(6, 'BATCH-006', 5, 'HJT 500W', 500, 80, 'Team Alpha', '2026-05-08', NULL, 'Quality Check', 90, 560000.00, 'HJT Cells, Glass, Aluminum Frame, EVA, Backsheet, Junction Box')
ON DUPLICATE KEY UPDATE `panel_type` = VALUES(`panel_type`);

-- --------------------------------------------------------------------------
-- 7. Table structure for `installations`
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `installations` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `installation_code` VARCHAR(20) NOT NULL UNIQUE COMMENT 'Unique installation ID, e.g. INST-001',
  `customer_name` VARCHAR(150) NOT NULL,
  `phone` VARCHAR(30) NOT NULL,
  `email` VARCHAR(150) DEFAULT NULL,
  `address` TEXT NOT NULL,
  `panel_type` VARCHAR(100) NOT NULL,
  `product_id` INT DEFAULT NULL,
  `quantity_installed` INT NOT NULL DEFAULT 1,
  `total_capacity` DECIMAL(8,2) NOT NULL DEFAULT 0.00 COMMENT 'Capacity in kW',
  `installation_date` DATE NOT NULL,
  `team_assigned` VARCHAR(100) DEFAULT NULL,
  `inverter_used` VARCHAR(150) DEFAULT NULL,
  `battery_used` VARCHAR(150) DEFAULT NULL,
  `warranty` VARCHAR(150) DEFAULT NULL,
  `status` ENUM('Pending', 'In Progress', 'Completed', 'Cancelled') NOT NULL DEFAULT 'In Progress',
  `notes` TEXT DEFAULT NULL,
  `photos` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_status` (`status`),
  INDEX `idx_inst_code` (`installation_code`),
  INDEX `idx_inst_date` (`installation_date`),
  CONSTRAINT `fk_inst_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Customer solar installations and project tracking';

-- Seed Installations
INSERT INTO `installations`
(`id`, `installation_code`, `customer_name`, `phone`, `email`, `address`, `panel_type`, `product_id`, `quantity_installed`, `total_capacity`, `installation_date`, `team_assigned`, `inverter_used`, `battery_used`, `warranty`, `status`, `notes`)
VALUES
(1, 'INST-001', 'Mahesh Industries', '+91 99887 76655', 'mahesh@industries.in', '123 Industrial Area, Pune', 'Mono PERC 400W', 1, 50, 20.00, '2026-04-20', 'Install Team A', 'Grid-Tie 5kW x2', 'Lithium 5kWh x2', '25 years panels, 10 years inverter', 'Completed', 'Rooftop installation, flat roof'),
(2, 'INST-002', 'Green Valley School', '+91 88776 65544', 'contact@greenvalley.edu', '456 Education Lane, Mumbai', 'Poly 330W', 2, 80, 26.40, '2026-05-01', 'Install Team B', 'Grid-Tie 5kW x5', 'Lithium 5kWh x4', '20 years panels, 10 years inverter', 'Completed', 'Building rooftop, tilted structure'),
(3, 'INST-003', 'Sunrise Hospital', '+91 77665 54433', 'admin@sunrisehosp.org', '789 Health Street, Bangalore', 'Mono PERC 540W', 3, 40, 21.60, '2026-05-10', 'Install Team A', 'Hybrid 10kW x2', 'Lithium 5kWh x4', '25 years panels, 10 years inverter', 'In Progress', 'Requires backup power, critical facility')
ON DUPLICATE KEY UPDATE `customer_name` = VALUES(`customer_name`);

