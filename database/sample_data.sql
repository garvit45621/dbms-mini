-- Vehicle Rental Management System
-- Seed Sample Data

USE rental_db;

-- -----------------------------------------------------
-- Seed Admins (password is 'admin123' hashed with bcrypt: $2a$10$5nVAfoqBNghQcMNoHppl2u0S1BQ4Q5DoUrG9waeLtyhM4pnCXUB3y)
-- -----------------------------------------------------
INSERT INTO admins (username, password_hash, email, name, role, status) VALUES
('admin', '$2a$10$5nVAfoqBNghQcMNoHppl2u0S1BQ4Q5DoUrG9waeLtyhM4pnCXUB3y', 'admin@vehiclerentals.com', 'Alex Mercer', 'admin', 'active'),
('staff_jane', '$2a$10$5nVAfoqBNghQcMNoHppl2u0S1BQ4Q5DoUrG9waeLtyhM4pnCXUB3y', 'jane.doe@vehiclerentals.com', 'Jane Doe', 'staff', 'active'),
('manager_bob', '$2a$10$5nVAfoqBNghQcMNoHppl2u0S1BQ4Q5DoUrG9waeLtyhM4pnCXUB3y', 'bob.builder@vehiclerentals.com', 'Bob Builder', 'manager', 'active');

-- -----------------------------------------------------
-- Seed Categories
-- -----------------------------------------------------
INSERT INTO categories (name, description, daily_rate, late_fee_per_hour, deposit_amount) VALUES
('Economy/Sedan', 'Fuel-efficient, compact, and ideal for city rides. E.g., Honda Civic, Toyota Corolla.', 45.00, 5.00, 150.00),
('SUV', 'Spacious, high clearance, perfect for families and outstation trips. E.g., Ford Explorer, Toyota RAV4.', 75.00, 10.00, 250.00),
('Luxury', 'Premium styling, high performance, top-tier comfort. E.g., BMW 5 Series, Mercedes C-Class.', 120.00, 15.00, 500.00),
('Electric (EV)', 'Eco-friendly smart vehicles with instant torque. E.g., Tesla Model Y, Hyundai Ioniq 5.', 90.00, 10.00, 300.00);

-- -----------------------------------------------------
-- Seed Vehicles
-- -----------------------------------------------------
INSERT INTO vehicles (make, model, year, license_plate, color, category_id, status, image_url, mileage, fuel_type, transmission) VALUES
('Honda', 'Civic', 2022, 'KA-01-ME-1234', 'Platinum White', 1, 'available', 'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?auto=format&fit=crop&w=600&q=80', 12450, 'petrol', 'automatic'),
('Toyota', 'Corolla', 2021, 'KA-03-NF-5678', 'Classic Silver', 1, 'rented', 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=600&q=80', 23100, 'hybrid', 'automatic'),
('Ford', 'Explorer', 2023, 'KA-51-ZZ-9012', 'Magnetic Metallic Gray', 2, 'available', 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=600&q=80', 8120, 'diesel', 'automatic'),
('Jeep', 'Grand Cherokee', 2022, 'KA-05-AB-7777', 'Diamond Black', 2, 'rented', 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=600&q=80', 15900, 'petrol', 'automatic'),
('BMW', '5 Series', 2023, 'KA-04-AA-9999', 'Carbon Black Metallic', 3, 'available', 'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=600&q=80', 4200, 'petrol', 'automatic'),
('Tesla', 'Model Y', 2023, 'KA-02-EV-8888', 'Deep Blue Metallic', 4, 'available', 'https://images.unsplash.com/photo-1619767886558-efdc259cde1a?auto=format&fit=crop&w=600&q=80', 9500, 'electric', 'automatic'),
('Hyundai', 'Ioniq 5', 2022, 'KA-03-EV-1111', 'Cyber Gray', 4, 'maintenance', 'https://images.unsplash.com/photo-1669023414166-a4cf7c0fd1f2?auto=format&fit=crop&w=600&q=80', 14200, 'electric', 'automatic'),
('Hyundai', 'i20', 2020, 'KA-03-MM-4444', 'Fiery Red', 1, 'available', 'https://images.unsplash.com/photo-1609521263047-f8f205293f24?auto=format&fit=crop&w=600&q=80', 45200, 'petrol', 'manual');

-- -----------------------------------------------------
-- Seed Customers
-- -----------------------------------------------------
INSERT INTO customers (first_name, last_name, email, phone, license_number, status) VALUES
('Rohan', 'Sharma', 'rohan.sharma@gmail.com', '+919876543210', 'DL-1420110023456', 'active'),
('Priya', 'Patel', 'priya.patel@yahoo.com', '+919988776655', 'DL-0420150098765', 'active'),
('Amit', 'Kumar', 'amit.kumar@outlook.com', '+919560123456', 'DL-1220180011223', 'active'),
('Sneha', 'Reddy', 'sneha.reddy@gmail.com', '+918877665544', 'DL-0920200055443', 'active'),
('Vikram', 'Singh', 'vikram.singh@gmail.com', '+919765432109', 'DL-1120120099887', 'suspended'),
('Anjali', 'Nair', 'anjali.nair@gmail.com', '+919611223344', 'DL-1320210088776', 'active');

-- -----------------------------------------------------
-- Seed Rentals
-- -----------------------------------------------------
-- Rental 1: Completed Rental (Returned on time)
INSERT INTO rentals (customer_id, vehicle_id, start_date, end_date, actual_return_date, total_cost, status, created_by_admin_id)
VALUES (1, 1, '2026-05-10 09:00:00', '2026-05-13 09:00:00', '2026-05-13 08:30:00', 319.20, 'completed', 1);

-- Rental 2: Active Rental (Currently out, rented vehicle 2)
INSERT INTO rentals (customer_id, vehicle_id, start_date, end_date, actual_return_date, total_cost, status, created_by_admin_id)
VALUES (2, 2, '2026-05-20 10:00:00', '2026-05-26 10:00:00', NULL, 582.40, 'active', 2);

-- Rental 3: Overdue Active Rental (Rented vehicle 4, past return date of May 24)
INSERT INTO rentals (customer_id, vehicle_id, start_date, end_date, actual_return_date, total_cost, status, created_by_admin_id)
VALUES (3, 4, '2026-05-22 09:00:00', '2026-05-24 09:00:00', NULL, 448.00, 'active', 2);

-- Rental 4: Cancelled Rental
INSERT INTO rentals (customer_id, vehicle_id, start_date, end_date, actual_return_date, total_cost, status, created_by_admin_id)
VALUES (4, 3, '2026-05-15 14:00:00', '2026-05-17 14:00:00', NULL, 0.00, 'cancelled', 1);

-- -----------------------------------------------------
-- Seed Invoices
-- -----------------------------------------------------
-- Invoice 1: Paid (For Rental 1)
INSERT INTO invoices (rental_id, invoice_number, due_date, subtotal, tax_amount, discount_amount, total_amount, status)
VALUES (1, 'INV-2026-00001', '2026-05-10 09:00:00', 285.00, 34.20, 0.00, 319.20, 'paid');

-- Invoice 2: Unpaid (For Rental 2)
INSERT INTO invoices (rental_id, invoice_number, due_date, subtotal, tax_amount, discount_amount, total_amount, status)
VALUES (2, 'INV-2026-00002', '2026-05-20 10:00:00', 520.00, 62.40, 0.00, 582.40, 'unpaid');

-- Invoice 3: Unpaid (For Rental 3 - Overdue)
INSERT INTO invoices (rental_id, invoice_number, due_date, subtotal, tax_amount, discount_amount, total_amount, status)
VALUES (3, 'INV-2026-00003', '2026-05-22 09:00:00', 400.00, 48.00, 0.00, 448.00, 'unpaid');

-- -----------------------------------------------------
-- Seed Payments
-- -----------------------------------------------------
-- Payment 1: For Invoice 1
INSERT INTO payments (rental_id, payment_date, amount, payment_method, status, transaction_reference)
VALUES (1, '2026-05-10 09:15:00', 319.20, 'credit_card', 'paid', 'TXN_98274981729');

-- -----------------------------------------------------
-- Seed Returns
-- -----------------------------------------------------
-- Return 1: For Rental 1 (Returned Honda Civic: start mileage was 12300, return mileage is 12450)
INSERT INTO returns (rental_id, return_date, mileage_in, fuel_level_in, damage_notes, late_hours, late_fee, damage_charges, additional_charges, total_refund_deducted, final_amount_paid, processed_by_admin_id)
VALUES (1, '2026-05-13 08:30:00', 12450, 'full', 'No new damage reported. Vehicle returned clean.', 0, 0.00, 0.00, 0.00, 150.00, 0.00, 1);
