// API Communication Bridge
// Connects to Node.js backend or falls back to Client-side Storage if offline

const API_BASE = '/api';

// Check if running on local file system or server is offline
let useClientMock = false;
if (window.location.protocol === 'file:') {
  console.warn('Running from file:// protocol. Activating browser local-storage mock database.');
  useClientMock = true;
}

// Token Storage Helpers
const tokenKey = 'rental_sys_token';
const userKey = 'rental_sys_user';

function getAuthHeaders() {
  const token = localStorage.getItem(tokenKey);
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

// Client-side Mock Database (Local Storage Initialization)
const initialMockData = {
  admins: [
    { admin_id: 1, username: 'admin', name: 'Alex Mercer', role: 'admin', status: 'active' },
    { admin_id: 2, username: 'staff_jane', name: 'Jane Doe', role: 'staff', status: 'active' }
  ],
  categories: [
    { category_id: 1, name: 'Economy/Sedan', description: 'Fuel-efficient, compact, and ideal for city rides.', daily_rate: 45.00, late_fee_per_hour: 5.00, deposit_amount: 150.00 },
    { category_id: 2, name: 'SUV', description: 'Spacious, high clearance, perfect for families.', daily_rate: 75.00, late_fee_per_hour: 10.00, deposit_amount: 250.00 },
    { category_id: 3, name: 'Luxury', description: 'Premium styling, top-tier comfort.', daily_rate: 120.00, late_fee_per_hour: 15.00, deposit_amount: 500.00 },
    { category_id: 4, name: 'Electric (EV)', description: 'Eco-friendly smart vehicles.', daily_rate: 90.00, late_fee_per_hour: 10.00, deposit_amount: 300.00 }
  ],
  vehicles: [
    { vehicle_id: 1, make: 'Honda', model: 'Civic', year: 2022, license_plate: 'KA-01-ME-1234', color: 'Platinum White', category_id: 1, status: 'available', image_url: 'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?auto=format&fit=crop&w=600&q=80', mileage: 12450, fuel_type: 'petrol', transmission: 'automatic' },
    { vehicle_id: 2, make: 'Toyota', model: 'Corolla', year: 2021, license_plate: 'KA-03-NF-5678', color: 'Classic Silver', category_id: 1, status: 'rented', image_url: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=600&q=80', mileage: 23100, fuel_type: 'hybrid', transmission: 'automatic' },
    { vehicle_id: 3, make: 'Ford', model: 'Explorer', year: 2023, license_plate: 'KA-51-ZZ-9012', color: 'Magnetic Metallic Gray', category_id: 2, status: 'available', image_url: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=600&q=80', mileage: 8120, fuel_type: 'diesel', transmission: 'automatic' },
    { vehicle_id: 4, make: 'Jeep', model: 'Grand Cherokee', year: 2022, license_plate: 'KA-05-AB-7777', color: 'Diamond Black', category_id: 2, status: 'rented', image_url: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=600&q=80', mileage: 15900, fuel_type: 'petrol', transmission: 'automatic' },
    { vehicle_id: 5, make: 'BMW', model: '5 Series', year: 2023, license_plate: 'KA-04-AA-9999', color: 'Carbon Black Metallic', category_id: 3, status: 'available', image_url: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=600&q=80', mileage: 4200, fuel_type: 'petrol', transmission: 'automatic' },
    { vehicle_id: 6, make: 'Tesla', model: 'Model Y', year: 2023, license_plate: 'KA-02-EV-8888', color: 'Deep Blue Metallic', category_id: 4, status: 'available', image_url: 'https://images.unsplash.com/photo-1619767886558-efdc259cde1a?auto=format&fit=crop&w=600&q=80', mileage: 9500, fuel_type: 'electric', transmission: 'automatic' }
  ],
  customers: [
    { customer_id: 1, first_name: 'Rohan', last_name: 'Sharma', email: 'rohan.sharma@gmail.com', phone: '+919876543210', license_number: 'DL-1420110023456', status: 'active', created_at: new Date() },
    { customer_id: 2, first_name: 'Priya', last_name: 'Patel', email: 'priya.patel@yahoo.com', phone: '+919988776655', license_number: 'DL-0420150098765', status: 'active', created_at: new Date() },
    { customer_id: 3, first_name: 'Amit', last_name: 'Kumar', email: 'amit.kumar@outlook.com', phone: '+919560123456', license_number: 'DL-1220180011223', status: 'active', created_at: new Date() },
    { customer_id: 4, first_name: 'Sneha', last_name: 'Reddy', email: 'sneha.reddy@gmail.com', phone: '+918877665544', license_number: 'DL-0920200055443', status: 'active', created_at: new Date() }
  ],
  rentals: [
    { rental_id: 1, customer_id: 1, vehicle_id: 1, booking_date: '2026-05-10 09:00:00', start_date: '2026-05-10 09:00:00', end_date: '2026-05-13 09:00:00', actual_return_date: '2026-05-13 08:30:00', total_cost: 319.20, status: 'completed', created_by_admin_id: 1 },
    { rental_id: 2, customer_id: 2, vehicle_id: 2, booking_date: '2026-05-20 10:00:00', start_date: '2026-05-20 10:00:00', end_date: '2026-05-26 10:00:00', actual_return_date: null, total_cost: 582.40, status: 'active', created_by_admin_id: 2 },
    { rental_id: 3, customer_id: 3, vehicle_id: 4, booking_date: '2026-05-22 09:00:00', start_date: '2026-05-22 09:00:00', end_date: '2026-05-24 09:00:00', actual_return_date: null, total_cost: 448.00, status: 'active', created_by_admin_id: 2 }
  ],
  payments: [
    { payment_id: 1, rental_id: 1, payment_date: '2026-05-10 09:15:00', amount: 319.20, payment_method: 'credit_card', status: 'paid', transaction_reference: 'TXN_98274981729' }
  ],
  invoices: [
    { invoice_id: 1, rental_id: 1, invoice_number: 'INV-2026-00001', issue_date: '2026-05-10 09:00:00', due_date: '2026-05-10 09:00:00', subtotal: 285.00, tax_amount: 34.20, discount_amount: 0.00, total_amount: 319.20, status: 'paid' },
    { invoice_id: 2, rental_id: 2, invoice_number: 'INV-2026-00002', issue_date: '2026-05-20 10:00:00', due_date: '2026-05-20 10:00:00', subtotal: 520.00, tax_amount: 62.40, discount_amount: 0.00, total_amount: 582.40, status: 'unpaid' },
    { invoice_id: 3, rental_id: 3, invoice_number: 'INV-2026-00003', issue_date: '2026-05-22 09:00:00', due_date: '2026-05-22 09:00:00', subtotal: 400.00, tax_amount: 48.00, discount_amount: 0.00, total_amount: 448.00, status: 'unpaid' }
  ],
  returns: [
    { return_id: 1, rental_id: 1, return_date: '2026-05-13 08:30:00', mileage_in: 12450, fuel_level_in: 'full', damage_notes: 'No new damage reported.', late_hours: 0, late_fee: 0.00, damage_charges: 0.00, additional_charges: 0.00, total_refund_deducted: 150.00, final_amount_paid: 0.00, processed_by_admin_id: 1 }
  ]
};

// Initialize browser mockDB from LocalStorage
function getMockDb() {
  let db = localStorage.getItem('rental_mock_db');
  if (!db) {
    localStorage.setItem('rental_mock_db', JSON.stringify(initialMockData));
    return initialMockData;
  }
  return JSON.parse(db);
}

function saveMockDb(db) {
  localStorage.setItem('rental_mock_db', JSON.stringify(db));
}

// General HTTP wrapper
async function request(url, options = {}) {
  // If we decided to use ClientMock, skip API call
  if (useClientMock) {
    throw new Error('CLIENT_MOCK_ACTIVE');
  }

  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    }
  };

  const mergeOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers
    }
  };

  try {
    const res = await fetch(url, mergeOptions);
    let json;
    try {
      json = await res.json();
    } catch (parseErr) {
      console.warn('Response is not valid JSON. Backend might be down or misconfigured. Falling back to client-side mock.');
      useClientMock = true;
      throw new Error('CLIENT_MOCK_ACTIVE');
    }
    if (!res.ok) {
      throw new Error(json.message || `HTTP ${res.status} error`);
    }
    return json;
  } catch (error) {
    if (error.message === 'CLIENT_MOCK_ACTIVE') {
      throw error;
    }
    if (error.message === 'Failed to fetch' || error.name === 'TypeError' || error.name === 'SyntaxError') {
      console.warn('Backend server unreachable or returned invalid response. Switching current window session to Client Mock Fallback.');
      useClientMock = true;
      throw new Error('CLIENT_MOCK_ACTIVE');
    }
    throw error;
  }
}

// Central API Router with fallbacks
const api = {
  // Check if system is running in mock mode
  isMockActive: () => useClientMock,

  // Auth Operations
  login: async (username, password) => {
    try {
      const data = await request(`${API_BASE}/auth/login`, {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });
      localStorage.setItem(tokenKey, data.token);
      localStorage.setItem(userKey, JSON.stringify(data.user));
      return data;
    } catch (err) {
      if (err.message === 'CLIENT_MOCK_ACTIVE') {
        const db = getMockDb();
        const user = db.admins.find(a => a.username === username);
        if (user && password === 'admin123') { // Mock simple check
          localStorage.setItem(tokenKey, 'mock-jwt-token');
          const userInfo = { admin_id: user.admin_id, username: user.username, name: user.name, role: 'admin' };
          localStorage.setItem(userKey, JSON.stringify(userInfo));
          return { success: true, user: userInfo };
        }
        throw new Error('Invalid mock credentials (use: admin / admin123).');
      }
      throw err;
    }
  },

  logout: () => {
    localStorage.removeItem(tokenKey);
    localStorage.removeItem(userKey);
  },

  getMe: async () => {
    try {
      return await request(`${API_BASE}/auth/me`);
    } catch (err) {
      if (err.message === 'CLIENT_MOCK_ACTIVE') {
        const userStr = localStorage.getItem(userKey);
        if (userStr) return { success: true, user: JSON.parse(userStr) };
        throw new Error('No session active');
      }
      throw err;
    }
  },

  // Vehicle Management
  getVehicles: async (filters = {}) => {
    const params = new URLSearchParams(filters).toString();
    try {
      return await request(`${API_BASE}/vehicles?${params}`);
    } catch (err) {
      if (err.message === 'CLIENT_MOCK_ACTIVE') {
        const db = getMockDb();
        const { category, status, search, page = 1, limit = 8 } = filters;
        let filtered = [...db.vehicles];

        if (category) filtered = filtered.filter(v => v.category_id === parseInt(category, 10));
        if (status) filtered = filtered.filter(v => v.status === status);
        if (search) {
          const q = search.toLowerCase();
          filtered = filtered.filter(v => 
            v.make.toLowerCase().includes(q) || v.model.toLowerCase().includes(q) || v.license_plate.toLowerCase().includes(q)
          );
        }

        const offset = (page - 1) * limit;
        const pageData = filtered.slice(offset, offset + limit).map(v => {
          const cat = db.categories.find(c => c.category_id === v.category_id);
          return { ...v, category_name: cat ? cat.name : 'N/A', daily_rate: cat ? cat.daily_rate : 0 };
        });

        return {
          success: true,
          data: pageData,
          pagination: { total: filtered.length, page, limit, pages: Math.ceil(filtered.length / limit) }
        };
      }
      throw err;
    }
  },

  getCategories: async () => {
    try {
      return await request(`${API_BASE}/vehicles/categories`);
    } catch (err) {
      if (err.message === 'CLIENT_MOCK_ACTIVE') {
        return { success: true, data: getMockDb().categories };
      }
      throw err;
    }
  },

  addVehicle: async (vehicle) => {
    try {
      return await request(`${API_BASE}/vehicles`, { method: 'POST', body: JSON.stringify(vehicle) });
    } catch (err) {
      if (err.message === 'CLIENT_MOCK_ACTIVE') {
        const db = getMockDb();
        const dup = db.vehicles.some(v => v.license_plate.toLowerCase() === vehicle.license_plate.toLowerCase());
        if (dup) throw new Error('License plate registered already.');
        const id = db.vehicles.length > 0 ? Math.max(...db.vehicles.map(v => v.vehicle_id)) + 1 : 1;
        const nVehicle = {
          vehicle_id: id, ...vehicle,
          mileage: parseInt(vehicle.mileage),
          year: parseInt(vehicle.year),
          category_id: parseInt(vehicle.category_id),
          status: 'available',
          image_url: vehicle.image_url || 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=600&q=80'
        };
        db.vehicles.push(nVehicle);
        saveMockDb(db);
        return { success: true, message: 'Vehicle added successfully.', data: nVehicle };
      }
      throw err;
    }
  },

  updateVehicle: async (id, vehicle) => {
    try {
      return await request(`${API_BASE}/vehicles/${id}`, { method: 'PUT', body: JSON.stringify(vehicle) });
    } catch (err) {
      if (err.message === 'CLIENT_MOCK_ACTIVE') {
        const db = getMockDb();
        const idx = db.vehicles.findIndex(v => v.vehicle_id === id);
        if (idx === -1) throw new Error('Vehicle not found.');
        db.vehicles[idx] = { ...db.vehicles[idx], ...vehicle, year: parseInt(vehicle.year), category_id: parseInt(vehicle.category_id), mileage: parseInt(vehicle.mileage) };
        saveMockDb(db);
        return { success: true, message: 'Vehicle updated.' };
      }
      throw err;
    }
  },

  deleteVehicle: async (id) => {
    try {
      return await request(`${API_BASE}/vehicles/${id}`, { method: 'DELETE' });
    } catch (err) {
      if (err.message === 'CLIENT_MOCK_ACTIVE') {
        const db = getMockDb();
        const idx = db.vehicles.findIndex(v => v.vehicle_id === id);
        if (idx === -1) throw new Error('Vehicle not found.');
        if (db.vehicles[idx].status === 'rented') throw new Error('Cannot delete rented vehicle.');
        
        const hasRentals = db.rentals.some(r => r.vehicle_id === id);
        if (hasRentals) {
          db.vehicles[idx].status = 'retired';
          saveMockDb(db);
          return { success: true, message: 'Vehicle retired due to billing history.' };
        }
        db.vehicles.splice(idx, 1);
        saveMockDb(db);
        return { success: true, message: 'Vehicle deleted.' };
      }
      throw err;
    }
  },

  // Customer Management
  getCustomers: async (search = '', page = 1, limit = 8) => {
    const params = new URLSearchParams({ search, page, limit }).toString();
    try {
      return await request(`${API_BASE}/customers?${params}`);
    } catch (err) {
      if (err.message === 'CLIENT_MOCK_ACTIVE') {
        const db = getMockDb();
        let filtered = [...db.customers];
        if (search) {
          const q = search.toLowerCase();
          filtered = filtered.filter(c => 
            c.first_name.toLowerCase().includes(q) || c.last_name.toLowerCase().includes(q) || c.license_number.toLowerCase().includes(q)
          );
        }
        const offset = (page - 1) * limit;
        return {
          success: true,
          data: filtered.slice(offset, offset + limit),
          pagination: { total: filtered.length, page, limit, pages: Math.ceil(filtered.length / limit) }
        };
      }
      throw err;
    }
  },

  getCustomerProfile: async (id) => {
    try {
      return await request(`${API_BASE}/customers/${id}`);
    } catch (err) {
      if (err.message === 'CLIENT_MOCK_ACTIVE') {
        const db = getMockDb();
        const customer = db.customers.find(c => c.customer_id === id);
        if (!customer) throw new Error('Customer not found.');

        const history = db.rentals
          .filter(r => r.customer_id === id)
          .map(r => {
            const v = db.vehicles.find(veh => veh.vehicle_id === r.vehicle_id);
            const inv = db.invoices.find(i => i.rental_id === r.rental_id);
            return {
              rental_id: r.rental_id,
              booking_date: r.booking_date,
              start_date: r.start_date,
              end_date: r.end_date,
              actual_return_date: r.actual_return_date,
              total_cost: r.total_cost,
              status: r.status,
              vehicle_info: v ? `${v.make} ${v.model}` : 'Unknown Car',
              license_plate: v ? v.license_plate : 'N/A',
              invoice_status: inv ? inv.status : 'N/A'
            };
          });

        return { success: true, customer, history };
      }
      throw err;
    }
  },

  addCustomer: async (customer) => {
    try {
      return await request(`${API_BASE}/customers`, { method: 'POST', body: JSON.stringify(customer) });
    } catch (err) {
      if (err.message === 'CLIENT_MOCK_ACTIVE') {
        const db = getMockDb();
        if (db.customers.some(c => c.email.toLowerCase() === customer.email.toLowerCase())) throw new Error('Email registered.');
        if (db.customers.some(c => c.license_number.toLowerCase() === customer.license_number.toLowerCase())) throw new Error('License registered.');
        const id = db.customers.length > 0 ? Math.max(...db.customers.map(c => c.customer_id)) + 1 : 1;
        const nCustomer = { customer_id: id, ...customer, status: 'active', created_at: new Date() };
        db.customers.push(nCustomer);
        saveMockDb(db);
        return { success: true, message: 'Customer added.', data: nCustomer };
      }
      throw err;
    }
  },

  updateCustomer: async (id, customer) => {
    try {
      return await request(`${API_BASE}/customers/${id}`, { method: 'PUT', body: JSON.stringify(customer) });
    } catch (err) {
      if (err.message === 'CLIENT_MOCK_ACTIVE') {
        const db = getMockDb();
        const idx = db.customers.findIndex(c => c.customer_id === id);
        if (idx === -1) throw new Error('Customer not found.');
        db.customers[idx] = { ...db.customers[idx], ...customer };
        saveMockDb(db);
        return { success: true, message: 'Customer updated.' };
      }
      throw err;
    }
  },

  deleteCustomer: async (id) => {
    try {
      return await request(`${API_BASE}/customers/${id}`, { method: 'DELETE' });
    } catch (err) {
      if (err.message === 'CLIENT_MOCK_ACTIVE') {
        const db = getMockDb();
        const idx = db.customers.findIndex(c => c.customer_id === id);
        if (idx === -1) throw new Error('Customer not found.');
        if (db.rentals.some(r => r.customer_id === id && r.status === 'active')) throw new Error('Cannot delete. Customer has active rentals.');
        
        const hasHistory = db.rentals.some(r => r.customer_id === id);
        if (hasHistory) {
          db.customers[idx].status = 'suspended';
          saveMockDb(db);
          return { success: true, message: 'Customer suspended due to billing history.' };
        }
        db.customers.splice(idx, 1);
        saveMockDb(db);
        return { success: true, message: 'Customer deleted.' };
      }
      throw err;
    }
  },

  // Rental booking flow
  getActiveRentals: async () => {
    try {
      return await request(`${API_BASE}/rentals/active`);
    } catch (err) {
      if (err.message === 'CLIENT_MOCK_ACTIVE') {
        const db = getMockDb();
        const data = db.rentals.filter(r => r.status === 'active').map(r => {
          const c = db.customers.find(cust => cust.customer_id === r.customer_id);
          const v = db.vehicles.find(veh => veh.vehicle_id === r.vehicle_id);
          return {
            rental_id: r.rental_id, start_date: r.start_date, end_date: r.end_date,
            customer_name: c ? `${c.first_name} ${c.last_name}` : 'N/A',
            vehicle_info: v ? `${v.make} ${v.model}` : 'N/A', license_plate: v ? v.license_plate : 'N/A'
          };
        });
        return { success: true, data };
      }
      throw err;
    }
  },

  getRecentRentals: async () => {
    try {
      return await request(`${API_BASE}/rentals/recent`);
    } catch (err) {
      if (err.message === 'CLIENT_MOCK_ACTIVE') {
        const db = getMockDb();
        const data = db.rentals.slice().reverse().slice(0, 5).map(r => {
          const c = db.customers.find(cust => cust.customer_id === r.customer_id);
          const v = db.vehicles.find(veh => veh.vehicle_id === r.vehicle_id);
          const i = db.invoices.find(inv => inv.rental_id === r.rental_id);
          return {
            rental_id: r.rental_id, booking_date: r.booking_date, status: r.status, total_cost: r.total_cost,
            customer_name: c ? `${c.first_name} ${c.last_name}` : 'N/A',
            vehicle_info: v ? `${v.make} ${v.model}` : 'N/A', invoice_status: i ? i.status : 'unpaid'
          };
        });
        return { success: true, data };
      }
      throw err;
    }
  },

  calculateLate: async (rentalId) => {
    try {
      return await request(`${API_BASE}/rentals/calculate-late?rental_id=${rentalId}`);
    } catch (err) {
      if (err.message === 'CLIENT_MOCK_ACTIVE') {
        const db = getMockDb();
        const rental = db.rentals.find(r => r.rental_id === parseInt(rentalId));
        if (!rental) throw new Error('Rental not found.');
        const vehicle = db.vehicles.find(v => v.vehicle_id === rental.vehicle_id);
        const category = db.categories.find(c => c.category_id === vehicle.category_id);
        
        const endDate = new Date(rental.end_date);
        const now = new Date();
        const diff = now - endDate;
        let late_hours = 0;
        let late_fee = 0;
        if (diff > 0) {
          late_hours = Math.ceil(diff / (1000 * 60 * 60));
          late_fee = late_hours * category.late_fee_per_hour;
        }

        return {
          success: true,
          data: { late_hours, late_fee, deposit_amount: category.deposit_amount, current_mileage: vehicle.mileage }
        };
      }
      throw err;
    }
  },

  bookRental: async (booking) => {
    try {
      return await request(`${API_BASE}/rentals/book`, { method: 'POST', body: JSON.stringify(booking) });
    } catch (err) {
      if (err.message === 'CLIENT_MOCK_ACTIVE') {
        const db = getMockDb();
        const customer = db.customers.find(c => c.customer_id === parseInt(booking.customer_id));
        const vehicle = db.vehicles.find(v => v.vehicle_id === parseInt(booking.vehicle_id));

        if (!customer || customer.status !== 'active') throw new Error('Customer is suspended/inactive.');
        if (!vehicle || vehicle.status !== 'available') throw new Error('Vehicle is not available.');

        const category = db.categories.find(c => c.category_id === vehicle.category_id);
        const start = new Date(booking.start_date);
        const end = new Date(booking.end_date);
        const days = Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24)) || 1;
        
        const subtotal = (category.daily_rate * days) + category.deposit_amount;
        const tax = subtotal * 0.12;
        const discount = parseFloat(booking.discount || 0);
        const total = subtotal + tax - discount;

        // Save Rental
        const rentalId = db.rentals.length > 0 ? Math.max(...db.rentals.map(r => r.rental_id)) + 1 : 1;
        const newRental = {
          rental_id: rentalId, customer_id: customer.customer_id, vehicle_id: vehicle.vehicle_id,
          booking_date: new Date().toISOString(), start_date: booking.start_date, end_date: booking.end_date,
          actual_return_date: null, total_cost: total, status: 'active', created_by_admin_id: 1
        };
        db.rentals.push(newRental);

        // Save Invoice
        const invoiceNumber = `INV-${new Date().getFullYear()}-${String(rentalId).padStart(5, '0')}`;
        const newInvoice = {
          invoice_id: db.invoices.length + 1, rental_id: rentalId, invoice_number: invoiceNumber,
          issue_date: new Date().toISOString(), due_date: booking.start_date, subtotal, tax_amount: tax,
          discount_amount: discount, total_amount: total, status: 'unpaid'
        };
        db.invoices.push(newInvoice);

        // Update Car Status
        vehicle.status = 'rented';

        saveMockDb(db);
        return { success: true, message: 'Rental booked.', rental_id: rentalId, invoice: newInvoice };
      }
      throw err;
    }
  },

  returnVehicle: async (returnDetails) => {
    try {
      return await request(`${API_BASE}/rentals/return`, { method: 'POST', body: JSON.stringify(returnDetails) });
    } catch (err) {
      if (err.message === 'CLIENT_MOCK_ACTIVE') {
        const db = getMockDb();
        const rental = db.rentals.find(r => r.rental_id === parseInt(returnDetails.rental_id));
        if (!rental || rental.status !== 'active') throw new Error('Active rental not found.');

        const vehicle = db.vehicles.find(v => v.vehicle_id === rental.vehicle_id);
        const mileageIn = parseInt(returnDetails.mileage_in);
        if (mileageIn < vehicle.mileage) throw new Error('Return mileage cannot be lower than start mileage.');

        const category = db.categories.find(c => c.category_id === vehicle.category_id);
        const end = new Date(rental.end_date);
        const now = new Date();
        let late_hours = 0;
        let late_fee = 0;
        const diff = now - end;
        if (diff > 0) {
          late_hours = Math.ceil(diff / (1000 * 60 * 60));
          late_fee = late_hours * category.late_fee_per_hour;
        }

        const damageCharges = parseFloat(returnDetails.damage_charges || 0);
        const additionalCharges = parseFloat(returnDetails.additional_charges || 0);
        let finalAmount = late_fee + damageCharges + additionalCharges;
        let totalRefund = 0;

        const deposit = category.deposit_amount;
        if (deposit >= finalAmount) {
          totalRefund = deposit - finalAmount;
          finalAmount = 0;
        } else {
          totalRefund = 0;
          finalAmount = finalAmount - deposit;
        }

        // Add return record
        const returnId = db.returns.length > 0 ? Math.max(...db.returns.map(r => r.return_id)) + 1 : 1;
        const retLog = {
          return_id: returnId, rental_id: rental.rental_id, return_date: now.toISOString(),
          mileage_in: mileageIn, fuel_level_in: returnDetails.fuel_level, damage_notes: returnDetails.damage_notes || null,
          late_hours, late_fee, damage_charges: damageCharges, additional_charges: additionalCharges,
          total_refund_deducted: totalRefund, final_amount_paid: finalAmount, processed_by_admin_id: 1
        };
        db.returns.push(retLog);

        // Update Invoice
        const invoice = db.invoices.find(inv => inv.rental_id === rental.rental_id);
        if (invoice) {
          invoice.status = 'paid';
          invoice.total_amount = invoice.total_amount + finalAmount;
        }

        // Update Vehicle Status
        vehicle.mileage = mileageIn;
        if (returnDetails.damage_notes && returnDetails.damage_notes.trim().length > 0) {
          vehicle.status = 'maintenance';
        } else {
          vehicle.status = 'available';
        }

        rental.status = 'completed';
        rental.actual_return_date = now.toISOString();

        // Payment record
        if (finalAmount > 0) {
          db.payments.push({
            payment_id: db.payments.length + 1, rental_id: rental.rental_id, payment_date: now.toISOString(),
            amount: finalAmount, payment_method: 'cash', status: 'paid', transaction_reference: `RET_PAY_${returnId}`
          });
        }

        saveMockDb(db);
        return { success: true, message: 'Return logged successfully.', data: retLog };
      }
      throw err;
    }
  },

  getInvoice: async (rentalId) => {
    try {
      return await request(`${API_BASE}/rentals/${rentalId}/invoice`);
    } catch (err) {
      if (err.message === 'CLIENT_MOCK_ACTIVE') {
        const db = getMockDb();
        const inv = db.invoices.find(i => i.rental_id === rentalId);
        const rent = db.rentals.find(r => r.rental_id === rentalId);
        if (!inv || !rent) throw new Error('Invoice not found.');
        
        const cust = db.customers.find(c => c.customer_id === rent.customer_id);
        const veh = db.vehicles.find(v => v.vehicle_id === rent.vehicle_id);
        const cat = db.categories.find(c => c.category_id === veh.category_id);
        const retLog = db.returns.find(r => r.rental_id === rentalId);

        const start = new Date(rent.start_date);
        const end = new Date(rent.end_date);
        const rental_days = Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24)) || 1;

        return {
          success: true,
          data: {
            invoice_number: inv.invoice_number, issue_date: inv.issue_date, due_date: inv.due_date,
            subtotal: inv.subtotal, tax_amount: inv.tax_amount, discount_amount: inv.discount_amount, total_amount: inv.total_amount,
            invoice_status: inv.status, customer_name: cust ? `${cust.first_name} ${cust.last_name}` : 'N/A',
            customer_email: cust ? cust.email : 'N/A', customer_phone: cust ? cust.phone : 'N/A',
            vehicle_info: veh ? `${veh.make} ${veh.model}` : 'N/A', license_plate: veh ? veh.license_plate : 'N/A',
            daily_rate: cat ? cat.daily_rate : 0, deposit_amount: cat ? cat.deposit_amount : 0, rental_days,
            return_info: retLog ? {
              return_date: retLog.return_date, late_hours: retLog.late_hours, late_fee: retLog.late_fee,
              damage_charges: retLog.damage_charges, additional_charges: retLog.additional_charges,
              total_refund_deducted: retLog.total_refund_deducted, final_amount_paid: retLog.final_amount_paid
            } : null
          }
        };
      }
      throw err;
    }
  },

  // Reports API
  getDashboardStats: async () => {
    try {
      return await request(`${API_BASE}/reports/dashboard-stats`);
    } catch (err) {
      if (err.message === 'CLIENT_MOCK_ACTIVE') {
        const db = getMockDb();
        const total = db.vehicles.filter(v => v.status !== 'retired').length;
        const available = db.vehicles.filter(v => v.status === 'available').length;
        const active = db.rentals.filter(r => r.status === 'active').length;
        const revenue = db.payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0);

        const categoryAvailability = db.categories.map(cat => {
          const matchVeh = db.vehicles.filter(v => v.category_id === cat.category_id && v.status !== 'retired');
          return {
            category_name: cat.name,
            total: matchVeh.length,
            available: matchVeh.filter(v => v.status === 'available').length
          };
        });

        return {
          success: true,
          data: { totalVehicles: total, availableVehicles: available, activeRentals: active, revenue, categoryAvailability }
        };
      }
      throw err;
    }
  },

  getRevenueByCategory: async () => {
    try {
      return await request(`${API_BASE}/reports/revenue-by-category`);
    } catch (err) {
      if (err.message === 'CLIENT_MOCK_ACTIVE') {
        const db = getMockDb();
        const data = db.categories.map(cat => {
          const vehIds = db.vehicles.filter(v => v.category_id === cat.category_id).map(v => v.vehicle_id);
          const rentals = db.rentals.filter(r => vehIds.includes(r.vehicle_id));
          const rentIds = rentals.map(r => r.rental_id);
          const rev = db.payments.filter(p => rentIds.includes(p.rental_id) && p.status === 'paid').reduce((s, p) => s + p.amount, 0);
          return { category_name: cat.name, rental_count: rentals.length, revenue: rev };
        });
        return { success: true, data };
      }
      throw err;
    }
  },

  getUtilizationStats: async () => {
    try {
      return await request(`${API_BASE}/reports/utilization`);
    } catch (err) {
      if (err.message === 'CLIENT_MOCK_ACTIVE') {
        const db = getMockDb();
        const data = db.vehicles.filter(v => v.status !== 'retired').map(v => {
          const cat = db.categories.find(c => c.category_id === v.category_id);
          const vRentals = db.rentals.filter(r => r.vehicle_id === v.vehicle_id && r.status !== 'cancelled');
          let days = 0;
          vRentals.forEach(r => {
            const start = new Date(r.start_date);
            const end = r.actual_return_date ? new Date(r.actual_return_date) : new Date(r.end_date);
            days += Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24)) || 1;
          });
          const rentIds = vRentals.map(r => r.rental_id);
          const earnings = db.payments.filter(p => rentIds.includes(p.rental_id) && p.status === 'paid').reduce((s, p) => s + p.amount, 0);

          return {
            vehicle_id: v.vehicle_id, make: v.make, model: v.model, license_plate: v.license_plate,
            category_name: cat ? cat.name : 'N/A', current_status: v.status, total_rentals: vRentals.length,
            total_rental_days: days, total_revenue_generated: earnings
          };
        });
        return { success: true, data };
      }
      throw err;
    }
  },

  getExportUrl: () => {
    if (useClientMock) {
      // Mock client export file generation
      const db = getMockDb();
      const summary = db.vehicles.map(v => `${v.make} ${v.model} (${v.license_plate}) - Status: ${v.status}, Mileage: ${v.mileage}km`).join('\n');
      const blob = new Blob([`VEHICLE FLEET SUMMARY REPORT\nGenerated: ${new Date().toLocaleString()}\n\n` + summary], { type: 'text/plain' });
      return URL.createObjectURL(blob);
    }
    return `${API_BASE}/reports/export`;
  }
};

window.api = api;
