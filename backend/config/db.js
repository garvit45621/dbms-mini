const mysql = require('mysql2/promise');
require('dotenv').config();

let pool = null;
let isMock = false;

// Mock database storage initialized with the exact sample data from sample_data.sql
const mockDb = {
  admins: [
    { admin_id: 1, username: 'admin', password_hash: '$2a$10$5nVAfoqBNghQcMNoHppl2u0S1BQ4Q5DoUrG9waeLtyhM4pnCXUB3y', email: 'admin@vehiclerentals.com', name: 'Alex Mercer', role: 'admin', status: 'active', created_at: new Date() },
    { admin_id: 2, username: 'staff_jane', password_hash: '$2a$10$5nVAfoqBNghQcMNoHppl2u0S1BQ4Q5DoUrG9waeLtyhM4pnCXUB3y', email: 'jane.doe@vehiclerentals.com', name: 'Jane Doe', role: 'staff', status: 'active', created_at: new Date() },
    { admin_id: 3, username: 'manager_bob', password_hash: '$2a$10$5nVAfoqBNghQcMNoHppl2u0S1BQ4Q5DoUrG9waeLtyhM4pnCXUB3y', email: 'bob.builder@vehiclerentals.com', name: 'Bob Builder', role: 'manager', status: 'active', created_at: new Date() }
  ],
  categories: [
    { category_id: 1, name: 'Economy/Sedan', description: 'Fuel-efficient, compact, and ideal for city rides.', daily_rate: 45.00, late_fee_per_hour: 5.00, deposit_amount: 150.00 },
    { category_id: 2, name: 'SUV', description: 'Spacious, high clearance, perfect for families and outstation trips.', daily_rate: 75.00, late_fee_per_hour: 10.00, deposit_amount: 250.00 },
    { category_id: 3, name: 'Luxury', description: 'Premium styling, high performance, top-tier comfort.', daily_rate: 120.00, late_fee_per_hour: 15.00, deposit_amount: 500.00 },
    { category_id: 4, name: 'Electric (EV)', description: 'Eco-friendly smart vehicles with instant torque.', daily_rate: 90.00, late_fee_per_hour: 10.00, deposit_amount: 300.00 }
  ],
  vehicles: [
    { vehicle_id: 1, make: 'Honda', model: 'Civic', year: 2022, license_plate: 'KA-01-ME-1234', color: 'Platinum White', category_id: 1, status: 'available', image_url: 'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?auto=format&fit=crop&w=600&q=80', mileage: 12450, fuel_type: 'petrol', transmission: 'automatic' },
    { vehicle_id: 2, make: 'Toyota', model: 'Corolla', year: 2021, license_plate: 'KA-03-NF-5678', color: 'Classic Silver', category_id: 1, status: 'rented', image_url: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=600&q=80', mileage: 23100, fuel_type: 'hybrid', transmission: 'automatic' },
    { vehicle_id: 3, make: 'Ford', model: 'Explorer', year: 2023, license_plate: 'KA-51-ZZ-9012', color: 'Magnetic Metallic Gray', category_id: 2, status: 'available', image_url: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=600&q=80', mileage: 8120, fuel_type: 'diesel', transmission: 'automatic' },
    { vehicle_id: 4, make: 'Jeep', model: 'Grand Cherokee', year: 2022, license_plate: 'KA-05-AB-7777', color: 'Diamond Black', category_id: 2, status: 'rented', image_url: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=600&q=80', mileage: 15900, fuel_type: 'petrol', transmission: 'automatic' },
    { vehicle_id: 5, make: 'BMW', model: '5 Series', year: 2023, license_plate: 'KA-04-AA-9999', color: 'Carbon Black Metallic', category_id: 3, status: 'available', image_url: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=600&q=80', mileage: 4200, fuel_type: 'petrol', transmission: 'automatic' },
    { vehicle_id: 6, make: 'Tesla', model: 'Model Y', year: 2023, license_plate: 'KA-02-EV-8888', color: 'Deep Blue Metallic', category_id: 4, status: 'available', image_url: 'https://images.unsplash.com/photo-1619767886558-efdc259cde1a?auto=format&fit=crop&w=600&q=80', mileage: 9500, fuel_type: 'electric', transmission: 'automatic' },
    { vehicle_id: 7, make: 'Hyundai', model: 'Ioniq 5', year: 2022, license_plate: 'KA-03-EV-1111', color: 'Cyber Gray', category_id: 4, status: 'maintenance', image_url: 'https://images.unsplash.com/photo-1669023414166-a4cf7c0fd1f2?auto=format&fit=crop&w=600&q=80', mileage: 14200, fuel_type: 'electric', transmission: 'automatic' },
    { vehicle_id: 8, make: 'Hyundai', model: 'i20', year: 2020, license_plate: 'KA-03-MM-4444', color: 'Fiery Red', category_id: 1, status: 'available', image_url: 'https://images.unsplash.com/photo-1609521263047-f8f205293f24?auto=format&fit=crop&w=600&q=80', mileage: 45200, fuel_type: 'petrol', transmission: 'manual' }
  ],
  customers: [
    { customer_id: 1, first_name: 'Rohan', last_name: 'Sharma', email: 'rohan.sharma@gmail.com', phone: '+919876543210', license_number: 'DL-1420110023456', status: 'active', created_at: new Date() },
    { customer_id: 2, first_name: 'Priya', last_name: 'Patel', email: 'priya.patel@yahoo.com', phone: '+919988776655', license_number: 'DL-0420150098765', status: 'active', created_at: new Date() },
    { customer_id: 3, first_name: 'Amit', last_name: 'Kumar', email: 'amit.kumar@outlook.com', phone: '+919560123456', license_number: 'DL-1220180011223', status: 'active', created_at: new Date() },
    { customer_id: 4, first_name: 'Sneha', last_name: 'Reddy', email: 'sneha.reddy@gmail.com', phone: '+918877665544', license_number: 'DL-0920200055443', status: 'active', created_at: new Date() },
    { customer_id: 5, first_name: 'Vikram', last_name: 'Singh', email: 'vikram.singh@gmail.com', phone: '+919765432109', license_number: 'DL-1120120099887', status: 'suspended', created_at: new Date() },
    { customer_id: 6, first_name: 'Anjali', last_name: 'Nair', email: 'anjali.nair@gmail.com', phone: '+919611223344', license_number: 'DL-1320210088776', status: 'active', created_at: new Date() }
  ],
  rentals: [
    { rental_id: 1, customer_id: 1, vehicle_id: 1, booking_date: new Date('2026-05-10T09:00:00'), start_date: new Date('2026-05-10T09:00:00'), end_date: new Date('2026-05-13T09:00:00'), actual_return_date: new Date('2026-05-13T08:30:00'), total_cost: 319.20, status: 'completed', created_by_admin_id: 1 },
    { rental_id: 2, customer_id: 2, vehicle_id: 2, booking_date: new Date('2026-05-20T10:00:00'), start_date: new Date('2026-05-20T10:00:00'), end_date: new Date('2026-05-26T10:00:00'), actual_return_date: null, total_cost: 582.40, status: 'active', created_by_admin_id: 2 },
    { rental_id: 3, customer_id: 3, vehicle_id: 4, booking_date: new Date('2026-05-22T09:00:00'), start_date: new Date('2026-05-22T09:00:00'), end_date: new Date('2026-05-24T09:00:00'), actual_return_date: null, total_cost: 448.00, status: 'active', created_by_admin_id: 2 },
    { rental_id: 4, customer_id: 4, vehicle_id: 3, booking_date: new Date('2026-05-15T14:00:00'), start_date: new Date('2026-05-15T14:00:00'), end_date: new Date('2026-05-17T14:00:00'), actual_return_date: null, total_cost: 0.00, status: 'cancelled', created_by_admin_id: 1 }
  ],
  payments: [
    { payment_id: 1, rental_id: 1, payment_date: new Date('2026-05-10T09:15:00'), amount: 319.20, payment_method: 'credit_card', status: 'paid', transaction_reference: 'TXN_98274981729' }
  ],
  invoices: [
    { invoice_id: 1, rental_id: 1, invoice_number: 'INV-2026-00001', issue_date: new Date('2026-05-10T09:00:00'), due_date: new Date('2026-05-10T09:00:00'), subtotal: 285.00, tax_amount: 34.20, discount_amount: 0.00, total_amount: 319.20, status: 'paid' },
    { invoice_id: 2, rental_id: 2, invoice_number: 'INV-2026-00002', issue_date: new Date('2026-05-20T10:00:00'), due_date: new Date('2026-05-20T10:00:00'), subtotal: 520.00, tax_amount: 62.40, discount_amount: 0.00, total_amount: 582.40, status: 'unpaid' },
    { invoice_id: 3, rental_id: 3, invoice_number: 'INV-2026-00003', issue_date: new Date('2026-05-22T09:00:00'), due_date: new Date('2026-05-22T09:00:00'), subtotal: 400.00, tax_amount: 48.00, discount_amount: 0.00, total_amount: 448.00, status: 'unpaid' }
  ],
  returns: [
    { return_id: 1, rental_id: 1, return_date: new Date('2026-05-13T08:30:00'), mileage_in: 12450, fuel_level_in: 'full', damage_notes: 'No new damage reported. Vehicle returned clean.', late_hours: 0, late_fee: 0.00, damage_charges: 0.00, additional_charges: 0.00, total_refund_deducted: 150.00, final_amount_paid: 0.00, processed_by_admin_id: 1 }
  ]
};

async function connectDatabase() {
  try {
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : '',
      database: process.env.DB_NAME || 'rental_db',
      port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    // Test the connection
    const connection = await pool.getConnection();
    console.log('Successfully connected to MySQL database: ' + (process.env.DB_NAME || 'rental_db'));
    connection.release();
    isMock = false;
  } catch (error) {
    console.warn('\n========================================================================');
    console.warn('WARNING: Failed to connect to MySQL database.');
    console.warn('Error detail:', error.message);
    if (process.env.USE_MOCK_FALLBACK !== 'false') {
      console.warn('FALLBACK ACTIVATED: Running with fully operational In-Memory Mock Database!');
      console.warn('You can browse, create bookings, return vehicles, and test the app seamlessly.');
      console.warn('========================================================================\n');
      isMock = true;
      pool = null;
    } else {
      console.error('USE_MOCK_FALLBACK is set to false. Exiting process...');
      console.warn('========================================================================\n');
      process.exit(1);
    }
  }
}

connectDatabase();

module.exports = {
  getPool: () => pool,
  getIsMock: () => isMock,
  mockDb
};
