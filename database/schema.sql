-- Vehicle Rental Management System
-- Database Schema for MySQL 8.0+

CREATE DATABASE IF NOT EXISTS rental_db;
USE rental_db;

-- -----------------------------------------------------
-- Table structures
-- -----------------------------------------------------

-- 1. admins
CREATE TABLE IF NOT EXISTS admins (
    admin_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    role VARCHAR(20) DEFAULT 'staff' CHECK (role IN ('admin', 'staff', 'manager')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. categories
CREATE TABLE IF NOT EXISTS categories (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    daily_rate DECIMAL(10,2) NOT NULL CHECK (daily_rate >= 0),
    late_fee_per_hour DECIMAL(10,2) NOT NULL CHECK (late_fee_per_hour >= 0),
    deposit_amount DECIMAL(10,2) NOT NULL CHECK (deposit_amount >= 0)
) ENGINE=InnoDB;

-- 3. vehicles
CREATE TABLE IF NOT EXISTS vehicles (
    vehicle_id INT AUTO_INCREMENT PRIMARY KEY,
    make VARCHAR(50) NOT NULL,
    model VARCHAR(50) NOT NULL,
    year INT NOT NULL CHECK (year >= 1900),
    license_plate VARCHAR(20) UNIQUE NOT NULL,
    color VARCHAR(30) NOT NULL,
    category_id INT NOT NULL,
    status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'rented', 'maintenance', 'retired')),
    image_url VARCHAR(255) DEFAULT NULL,
    mileage INT NOT NULL DEFAULT 0 CHECK (mileage >= 0),
    fuel_type VARCHAR(20) NOT NULL CHECK (fuel_type IN ('petrol', 'diesel', 'electric', 'hybrid')),
    transmission VARCHAR(20) NOT NULL CHECK (transmission IN ('manual', 'automatic')),
    FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 4. customers
CREATE TABLE IF NOT EXISTS customers (
    customer_id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(20) NOT NULL,
    license_number VARCHAR(50) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'pending')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 5. rentals
CREATE TABLE IF NOT EXISTS rentals (
    rental_id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    vehicle_id INT NOT NULL,
    booking_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    start_date DATETIME NOT NULL,
    end_date DATETIME NOT NULL,
    actual_return_date DATETIME DEFAULT NULL,
    total_cost DECIMAL(10,2) NOT NULL DEFAULT 0.00 CHECK (total_cost >= 0),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'overdue', 'cancelled')),
    created_by_admin_id INT DEFAULT NULL,
    CONSTRAINT chk_rental_dates CHECK (end_date >= start_date),
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(vehicle_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (created_by_admin_id) REFERENCES admins(admin_id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 6. payments
CREATE TABLE IF NOT EXISTS payments (
    payment_id INT AUTO_INCREMENT PRIMARY KEY,
    rental_id INT NOT NULL,
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
    payment_method VARCHAR(30) NOT NULL CHECK (payment_method IN ('credit_card', 'debit_card', 'cash', 'bank_transfer', 'mobile_wallet')),
    status VARCHAR(20) DEFAULT 'paid' CHECK (status IN ('paid', 'refunded', 'failed', 'pending')),
    transaction_reference VARCHAR(100) DEFAULT NULL,
    FOREIGN KEY (rental_id) REFERENCES rentals(rental_id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 7. invoices
CREATE TABLE IF NOT EXISTS invoices (
    invoice_id INT AUTO_INCREMENT PRIMARY KEY,
    rental_id INT NOT NULL,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    issue_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    due_date DATETIME NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL CHECK (subtotal >= 0),
    tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00 CHECK (tax_amount >= 0),
    discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00 CHECK (discount_amount >= 0),
    total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount >= 0),
    status VARCHAR(20) DEFAULT 'unpaid' CHECK (status IN ('paid', 'unpaid', 'partially_paid', 'voided')),
    FOREIGN KEY (rental_id) REFERENCES rentals(rental_id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 8. returns
CREATE TABLE IF NOT EXISTS returns (
    return_id INT AUTO_INCREMENT PRIMARY KEY,
    rental_id INT NOT NULL,
    return_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    mileage_in INT NOT NULL CHECK (mileage_in >= 0),
    fuel_level_in VARCHAR(20) NOT NULL CHECK (fuel_level_in IN ('full', 'three_quarters', 'half', 'quarter', 'empty')),
    damage_notes TEXT DEFAULT NULL,
    late_hours INT DEFAULT 0 CHECK (late_hours >= 0),
    late_fee DECIMAL(10,2) DEFAULT 0.00 CHECK (late_fee >= 0),
    damage_charges DECIMAL(10,2) DEFAULT 0.00 CHECK (damage_charges >= 0),
    additional_charges DECIMAL(10,2) DEFAULT 0.00 CHECK (additional_charges >= 0),
    total_refund_deducted DECIMAL(10,2) DEFAULT 0.00 CHECK (total_refund_deducted >= 0),
    final_amount_paid DECIMAL(10,2) DEFAULT 0.00 CHECK (final_amount_paid >= 0),
    processed_by_admin_id INT DEFAULT NULL,
    FOREIGN KEY (rental_id) REFERENCES rentals(rental_id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (processed_by_admin_id) REFERENCES admins(admin_id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

-- -----------------------------------------------------
-- Indices for Query Optimization
-- -----------------------------------------------------
CREATE INDEX idx_vehicle_status ON vehicles(status);
CREATE INDEX idx_vehicle_category ON vehicles(category_id);
CREATE INDEX idx_customer_license ON customers(license_number);
CREATE INDEX idx_rental_status ON rentals(status);
CREATE INDEX idx_rental_dates ON rentals(start_date, end_date);
CREATE INDEX idx_invoice_number ON invoices(invoice_number);

-- -----------------------------------------------------
-- Database Views
-- -----------------------------------------------------

-- View: Detailed Rental Records
CREATE OR REPLACE VIEW vw_rental_details AS
SELECT 
    r.rental_id,
    r.booking_date,
    r.start_date,
    r.end_date,
    r.actual_return_date,
    r.status AS rental_status,
    r.total_cost AS base_total_cost,
    c.customer_id,
    CONCAT(c.first_name, ' ', c.last_name) AS customer_name,
    c.email AS customer_email,
    c.phone AS customer_phone,
    v.vehicle_id,
    CONCAT(v.make, ' ', v.model, ' (', v.year, ')') AS vehicle_info,
    v.license_plate,
    cat.name AS category_name,
    cat.daily_rate,
    inv.invoice_id,
    inv.invoice_number,
    inv.total_amount AS invoice_total,
    inv.status AS invoice_status,
    ret.return_id,
    ret.late_hours,
    ret.late_fee,
    ret.damage_charges,
    ret.final_amount_paid
FROM rentals r
JOIN customers c ON r.customer_id = c.customer_id
JOIN vehicles v ON r.vehicle_id = v.vehicle_id
JOIN categories cat ON v.category_id = cat.category_id
LEFT JOIN invoices inv ON r.rental_id = inv.rental_id
LEFT JOIN returns ret ON r.rental_id = ret.rental_id;

-- View: Vehicle Utilization & Revenue Metrics
CREATE OR REPLACE VIEW vw_vehicle_utilization AS
SELECT 
    v.vehicle_id,
    v.make,
    v.model,
    v.license_plate,
    cat.name AS category_name,
    v.status AS current_status,
    COUNT(r.rental_id) AS total_rentals,
    COALESCE(SUM(DATEDIFF(COALESCE(r.actual_return_date, r.end_date), r.start_date)), 0) AS total_rental_days,
    COALESCE(SUM(inv.total_amount), 0) + COALESCE(SUM(ret.final_amount_paid), 0) AS total_revenue_generated
FROM vehicles v
JOIN categories cat ON v.category_id = cat.category_id
LEFT JOIN rentals r ON v.vehicle_id = r.vehicle_id AND r.status != 'cancelled'
LEFT JOIN invoices inv ON r.rental_id = inv.rental_id
LEFT JOIN returns ret ON r.rental_id = ret.rental_id
GROUP BY v.vehicle_id, v.make, v.model, v.license_plate, cat.name, v.status;

-- -----------------------------------------------------
-- Triggers
-- -----------------------------------------------------

DELIMITER $$

-- Trigger 1: Mark vehicle as 'rented' on active rental insertion
CREATE TRIGGER tg_after_rental_insert
AFTER INSERT ON rentals
FOR EACH ROW
BEGIN
    IF NEW.status = 'active' THEN
        UPDATE vehicles 
        SET status = 'rented' 
        WHERE vehicle_id = NEW.vehicle_id;
    END IF;
END$$

-- Trigger 2: Update vehicle status to 'available' or 'maintenance' and update mileage upon return log
CREATE TRIGGER tg_after_return_insert
AFTER INSERT ON returns
FOR EACH ROW
BEGIN
    DECLARE v_vehicle_id INT;
    DECLARE v_damage_notes TEXT;
    
    -- Retrieve vehicle ID and damage notes from rental
    SELECT vehicle_id INTO v_vehicle_id FROM rentals WHERE rental_id = NEW.rental_id;
    
    -- Update vehicle mileage and set status based on damage log
    IF NEW.damage_notes IS NOT NULL AND CHAR_LENGTH(TRIM(NEW.damage_notes)) > 0 THEN
        UPDATE vehicles 
        SET status = 'maintenance', mileage = NEW.mileage_in 
        WHERE vehicle_id = v_vehicle_id;
    ELSE
        UPDATE vehicles 
        SET status = 'available', mileage = NEW.mileage_in 
        WHERE vehicle_id = v_vehicle_id;
    END IF;
    
    -- Mark rental status as completed
    UPDATE rentals 
    SET status = 'completed', actual_return_date = NEW.return_date 
    WHERE rental_id = NEW.rental_id;
END$$

DELIMITER ;

-- -----------------------------------------------------
-- Stored Procedures
-- -----------------------------------------------------

DELIMITER $$

-- Stored Procedure 1: Safe Booking Transaction
CREATE PROCEDURE sp_create_booking(
    IN p_customer_id INT,
    IN p_vehicle_id INT,
    IN p_start_date DATETIME,
    IN p_end_date DATETIME,
    IN p_admin_id INT,
    IN p_discount DECIMAL(10,2),
    OUT o_rental_id INT
)
BEGIN
    DECLARE v_vehicle_status VARCHAR(20);
    DECLARE v_daily_rate DECIMAL(10,2);
    DECLARE v_deposit DECIMAL(10,2);
    DECLARE v_days INT;
    DECLARE v_subtotal DECIMAL(10,2);
    DECLARE v_tax DECIMAL(10,2);
    DECLARE v_total DECIMAL(10,2);
    DECLARE v_invoice_num VARCHAR(50);
    
    -- Error handling block for Rollback
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;
    
    -- 1. Check vehicle availability
    SELECT status, cat.daily_rate, cat.deposit_amount 
    INTO v_vehicle_status, v_daily_rate, v_deposit
    FROM vehicles v
    JOIN categories cat ON v.category_id = cat.category_id
    WHERE v.vehicle_id = p_vehicle_id;
    
    IF v_vehicle_status IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Vehicle does not exist';
    ELSEIF v_vehicle_status != 'available' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Vehicle is not available for rental';
    END IF;
    
    -- 2. Check customer status
    SELECT status INTO v_vehicle_status FROM customers WHERE customer_id = p_customer_id;
    IF v_vehicle_status != 'active' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Customer account is not active';
    END IF;
    
    -- 3. Calculate rental cost
    SET v_days = DATEDIFF(p_end_date, p_start_date);
    IF v_days = 0 THEN
        SET v_days = 1;
    END IF;
    
    SET v_subtotal = (v_daily_rate * v_days) + v_deposit;
    SET v_tax = v_subtotal * 0.12; -- 12% sales tax
    SET v_total = v_subtotal + v_tax - COALESCE(p_discount, 0.00);
    
    -- 4. Create Rental record
    INSERT INTO rentals (customer_id, vehicle_id, start_date, end_date, total_cost, status, created_by_admin_id)
    VALUES (p_customer_id, p_vehicle_id, p_start_date, p_end_date, v_total, 'active', p_admin_id);
    
    SET o_rental_id = LAST_INSERT_ID();
    
    -- 5. Create Invoice record
    SET v_invoice_num = CONCAT('INV-', YEAR(CURDATE()), '-', LPAD(o_rental_id, 5, '0'));
    INSERT INTO invoices (rental_id, invoice_number, due_date, subtotal, tax_amount, discount_amount, total_amount, status)
    VALUES (o_rental_id, v_invoice_num, p_start_date, v_subtotal, v_tax, COALESCE(p_discount, 0.00), v_total, 'unpaid');
    
    COMMIT;
END$$

-- Stored Procedure 2: Complete Return & Adjust Final Payments
CREATE PROCEDURE sp_process_return(
    IN p_rental_id INT,
    IN p_mileage_in INT,
    IN p_fuel_level VARCHAR(20),
    IN p_damage_notes TEXT,
    IN p_damage_charges DECIMAL(10,2),
    IN p_additional_charges DECIMAL(10,2),
    IN p_admin_id INT,
    OUT o_return_id INT
)
BEGIN
    DECLARE v_end_date DATETIME;
    DECLARE v_start_mileage INT;
    DECLARE v_late_hours INT DEFAULT 0;
    DECLARE v_late_fee DECIMAL(10,2) DEFAULT 0.00;
    DECLARE v_hourly_late_rate DECIMAL(10,2);
    DECLARE v_deposit DECIMAL(10,2);
    DECLARE v_total_refund DECIMAL(10,2) DEFAULT 0.00;
    DECLARE v_final_amount DECIMAL(10,2) DEFAULT 0.00;
    DECLARE v_hours_diff INT;
    
    -- Error handling block
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;
    
    -- 1. Fetch rental configurations
    SELECT r.end_date, v.mileage, cat.late_fee_per_hour, cat.deposit_amount
    INTO v_end_date, v_start_mileage, v_hourly_late_rate, v_deposit
    FROM rentals r
    JOIN vehicles v ON r.vehicle_id = v.vehicle_id
    JOIN categories cat ON v.category_id = cat.category_id
    WHERE r.rental_id = p_rental_id AND r.status = 'active';
    
    IF v_end_date IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Rental record is not active or not found';
    END IF;
    
    IF p_mileage_in < v_start_mileage THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Return mileage cannot be lower than start mileage';
    END IF;
    
    -- 2. Calculate late fee
    SET v_hours_diff = TIMESTAMPDIFF(HOUR, v_end_date, NOW());
    IF v_hours_diff > 0 THEN
        SET v_late_hours = v_hours_diff;
        SET v_late_fee = v_late_hours * v_hourly_late_rate;
    END IF;
    
    -- 3. Calculate refund/charges logic
    -- Final payments = late fees + damage fees + extra charges
    SET v_final_amount = v_late_fee + COALESCE(p_damage_charges, 0.00) + COALESCE(p_additional_charges, 0.00);
    
    -- Deduct from deposit
    IF v_deposit >= v_final_amount THEN
        SET v_total_refund = v_deposit - v_final_amount;
        SET v_final_amount = 0.00; -- Nothing more to pay
    ELSE
        SET v_total_refund = 0.00;
        SET v_final_amount = v_final_amount - v_deposit; -- Balance due
    END IF;
    
    -- 4. Create Return record
    INSERT INTO returns (
        rental_id, return_date, mileage_in, fuel_level_in, damage_notes, 
        late_hours, late_fee, damage_charges, additional_charges, 
        total_refund_deducted, final_amount_paid, processed_by_admin_id
    ) VALUES (
        p_rental_id, NOW(), p_mileage_in, p_fuel_level, p_damage_notes,
        v_late_hours, v_late_fee, COALESCE(p_damage_charges, 0.00), COALESCE(p_additional_charges, 0.00),
        v_total_refund, v_final_amount, p_admin_id
    );
    
    SET o_return_id = LAST_INSERT_ID();
    
    -- 5. Mark invoice as paid (final settlement)
    UPDATE invoices 
    SET status = 'paid', total_amount = total_amount + v_final_amount
    WHERE rental_id = p_rental_id;
    
    -- Note: tg_after_return_insert trigger will run automatically here to clean up vehicle status and rental status.
    
    COMMIT;
END$$

DELIMITER ;

-- -----------------------------------------------------
-- Complex Analytical Queries
-- -----------------------------------------------------

-- Query A: Monthly revenue by category
-- SELECT 
--     cat.name AS Category,
--     DATE_FORMAT(p.payment_date, '%Y-%m') AS Month,
--     SUM(p.amount) AS TotalRevenue,
--     COUNT(DISTINCT r.rental_id) AS RentalsCount
-- FROM categories cat
-- JOIN vehicles v ON cat.category_id = v.category_id
-- JOIN rentals r ON v.vehicle_id = r.vehicle_id
-- JOIN payments p ON r.rental_id = p.rental_id
-- WHERE p.status = 'paid'
-- GROUP BY cat.name, Month
-- ORDER BY Month DESC, TotalRevenue DESC;

-- Query B: Customers with active overdue rentals
-- SELECT 
--     c.customer_id,
--     CONCAT(c.first_name, ' ', c.last_name) AS CustomerName,
--     c.email,
--     c.phone,
--     r.rental_id,
--     v.license_plate,
--     DATEDIFF(NOW(), r.end_date) AS DaysOverdue
-- FROM customers c
-- JOIN rentals r ON c.customer_id = r.customer_id
-- JOIN vehicles v ON r.vehicle_id = v.vehicle_id
-- WHERE r.status = 'active' AND NOW() > r.end_date;

-- -----------------------------------------------------
-- Audit Log Table & Triggers for State Monitoring
-- -----------------------------------------------------

CREATE TABLE IF NOT EXISTS audit_logs (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    action_type VARCHAR(20) NOT NULL,
    table_name VARCHAR(50) NOT NULL,
    record_id INT NOT NULL,
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

DELIMITER $$

CREATE TRIGGER tg_vehicle_status_audit
AFTER UPDATE ON vehicles
FOR EACH ROW
BEGIN
    IF OLD.status != NEW.status THEN
        INSERT INTO audit_logs (action_type, table_name, record_id, details)
        VALUES ('UPDATE', 'vehicles', NEW.vehicle_id, 
                CONCAT('Vehicle ', NEW.make, ' ', NEW.model, ' (Plate: ', NEW.license_plate, ') status changed from "', OLD.status, '" to "', NEW.status, '". Mileage: ', NEW.mileage));
    END IF;
END$$

CREATE TRIGGER tg_rental_status_audit
AFTER UPDATE ON rentals
FOR EACH ROW
BEGIN
    IF OLD.status != NEW.status THEN
        INSERT INTO audit_logs (action_type, table_name, record_id, details)
        VALUES ('UPDATE', 'rentals', NEW.rental_id, 
                CONCAT('Rental Booking #', NEW.rental_id, ' status changed from "', OLD.status, '" to "', NEW.status, '". Cost: ', NEW.total_cost));
    END IF;
END$$

DELIMITER ;

