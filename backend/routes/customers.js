const express = require('express');
const router = express.Router();
const db = require('../config/db');
const authMiddleware = require('../middleware/authMiddleware');

// @route   GET /api/customers
// @desc    Get customers list with search and pagination
router.get('/', async (req, res) => {
  const { search, page = 1, limit = 8 } = req.query;
  const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

  try {
    if (db.getIsMock()) {
      let filtered = [...db.mockDb.customers];

      if (search) {
        const query = search.toLowerCase();
        filtered = filtered.filter(c => 
          c.first_name.toLowerCase().includes(query) ||
          c.last_name.toLowerCase().includes(query) ||
          c.email.toLowerCase().includes(query) ||
          c.phone.toLowerCase().includes(query) ||
          c.license_number.toLowerCase().includes(query)
        );
      }

      const result = filtered.slice(offset, offset + parseInt(limit, 10));

      return res.json({
        success: true,
        data: result,
        pagination: {
          total: filtered.length,
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          pages: Math.ceil(filtered.length / parseInt(limit, 10))
        }
      });
    } else {
      let query = 'SELECT * FROM customers WHERE 1=1';
      const params = [];

      if (search) {
        query += ' AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR phone LIKE ? OR license_number LIKE ?)';
        const pattern = `%${search}%`;
        params.push(pattern, pattern, pattern, pattern, pattern);
      }

      // Count total rows
      const countQuery = `SELECT COUNT(*) as total FROM (${query}) AS subquery`;
      const [countRows] = await db.getPool().execute(countQuery, params);
      const total = countRows[0].total;

      query += ' ORDER BY customer_id DESC LIMIT ? OFFSET ?';
      params.push(parseInt(limit, 10), offset);

      const [rows] = await db.getPool().execute(query, params);

      res.json({
        success: true,
        data: rows,
        pagination: {
          total,
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          pages: Math.ceil(total / parseInt(limit, 10))
        }
      });
    }
  } catch (err) {
    console.error('Get Customers Error:', err);
    res.status(500).json({ success: false, message: 'Server error retrieving customers.' });
  }
});

// @route   GET /api/customers/:id
// @desc    Get detailed customer profile with rental history
router.get('/:id', async (req, res) => {
  const customerId = parseInt(req.params.id, 10);

  try {
    if (db.getIsMock()) {
      const customer = db.mockDb.customers.find(c => c.customer_id === customerId);
      if (!customer) {
        return res.status(404).json({ success: false, message: 'Customer not found.' });
      }

      // Get rental history for this customer
      const history = db.mockDb.rentals
        .filter(r => r.customer_id === customerId)
        .map(r => {
          const vehicle = db.mockDb.vehicles.find(v => v.vehicle_id === r.vehicle_id);
          const invoice = db.mockDb.invoices.find(i => i.rental_id === r.rental_id);
          return {
            rental_id: r.rental_id,
            booking_date: r.booking_date,
            start_date: r.start_date,
            end_date: r.end_date,
            actual_return_date: r.actual_return_date,
            total_cost: r.total_cost,
            status: r.status,
            vehicle_info: vehicle ? `${vehicle.make} ${vehicle.model}` : 'Unknown Vehicle',
            license_plate: vehicle ? vehicle.license_plate : 'N/A',
            invoice_status: invoice ? invoice.status : 'N/A'
          };
        })
        .sort((a, b) => new Date(b.booking_date) - new Date(a.booking_date));

      return res.json({
        success: true,
        customer,
        history
      });
    } else {
      // Get customer profile from MySQL
      const [customerRows] = await db.getPool().execute('SELECT * FROM customers WHERE customer_id = ?', [customerId]);
      if (customerRows.length === 0) {
        return res.status(404).json({ success: false, message: 'Customer not found.' });
      }

      // Get customer history from View
      const [historyRows] = await db.getPool().execute(
        `SELECT 
          rental_id, booking_date, start_date, end_date, actual_return_date, 
          rental_status AS status, base_total_cost AS total_cost, vehicle_info, license_plate, invoice_status
         FROM vw_rental_details 
         WHERE customer_id = ? 
         ORDER BY booking_date DESC`,
        [customerId]
      );

      res.json({
        success: true,
        customer: customerRows[0],
        history: historyRows
      });
    }
  } catch (err) {
    console.error('Get Customer Profile Error:', err);
    res.status(500).json({ success: false, message: 'Server error retrieving customer profile.' });
  }
});

// @route   POST /api/customers
// @desc    Add a new customer
router.post('/', authMiddleware, async (req, res) => {
  const { first_name, last_name, email, phone, license_number, status = 'active' } = req.body;

  if (!first_name || !last_name || !email || !phone || !license_number) {
    return res.status(400).json({ success: false, message: 'Please provide all required customer details.' });
  }

  try {
    if (db.getIsMock()) {
      const emailExists = db.mockDb.customers.some(c => c.email.toLowerCase() === email.toLowerCase());
      const licExists = db.mockDb.customers.some(c => c.license_number.toLowerCase() === license_number.toLowerCase());

      if (emailExists) {
        return res.status(400).json({ success: false, message: 'Email address already registered.' });
      }
      if (licExists) {
        return res.status(400).json({ success: false, message: 'License number already registered.' });
      }

      const newId = db.mockDb.customers.length > 0 ? Math.max(...db.mockDb.customers.map(c => c.customer_id)) + 1 : 1;
      const newCustomer = {
        customer_id: newId,
        first_name,
        last_name,
        email,
        phone,
        license_number: license_number.toUpperCase(),
        status,
        created_at: new Date()
      };

      db.mockDb.customers.push(newCustomer);
      return res.status(201).json({ success: true, message: 'Customer registered successfully.', data: newCustomer });
    } else {
      // MySQL check duplicates
      const [emailDup] = await db.getPool().execute('SELECT customer_id FROM customers WHERE email = ?', [email]);
      if (emailDup.length > 0) {
        return res.status(400).json({ success: false, message: 'Email address already registered.' });
      }
      const [licDup] = await db.getPool().execute('SELECT customer_id FROM customers WHERE license_number = ?', [license_number]);
      if (licDup.length > 0) {
        return res.status(400).json({ success: false, message: 'License number already registered.' });
      }

      const [result] = await db.getPool().execute(
        `INSERT INTO customers (first_name, last_name, email, phone, license_number, status)
         VALUES (?, ?, ?, ?, ?, ?)` ,
        [first_name, last_name, email, phone, license_number.toUpperCase(), status]
      );

      res.status(201).json({
        success: true,
        message: 'Customer registered successfully.',
        data: { customer_id: result.insertId }
      });
    }
  } catch (err) {
    console.error('Create Customer Error:', err);
    res.status(500).json({ success: false, message: 'Server error registering customer.' });
  }
});

// @route   PUT /api/customers/:id
// @desc    Update customer details
router.put('/:id', authMiddleware, async (req, res) => {
  const customerId = parseInt(req.params.id, 10);
  const { first_name, last_name, email, phone, license_number, status } = req.body;

  try {
    if (db.getIsMock()) {
      const idx = db.mockDb.customers.findIndex(c => c.customer_id === customerId);
      if (idx === -1) {
        return res.status(404).json({ success: false, message: 'Customer not found.' });
      }

      // Check duplicates excluding self
      const emailExists = db.mockDb.customers.some(c => c.customer_id !== customerId && c.email.toLowerCase() === email.toLowerCase());
      const licExists = db.mockDb.customers.some(c => c.customer_id !== customerId && c.license_number.toLowerCase() === license_number.toLowerCase());

      if (emailExists) {
        return res.status(400).json({ success: false, message: 'Email address already registered by another customer.' });
      }
      if (licExists) {
        return res.status(400).json({ success: false, message: 'License number already registered by another customer.' });
      }

      db.mockDb.customers[idx] = {
        ...db.mockDb.customers[idx],
        first_name: first_name || db.mockDb.customers[idx].first_name,
        last_name: last_name || db.mockDb.customers[idx].last_name,
        email: email || db.mockDb.customers[idx].email,
        phone: phone || db.mockDb.customers[idx].phone,
        license_number: license_number ? license_number.toUpperCase() : db.mockDb.customers[idx].license_number,
        status: status || db.mockDb.customers[idx].status
      };

      return res.json({ success: true, message: 'Customer profile updated successfully.', data: db.mockDb.customers[idx] });
    } else {
      // MySQL check duplicates
      const [emailDup] = await db.getPool().execute('SELECT customer_id FROM customers WHERE email = ? AND customer_id != ?', [email, customerId]);
      if (emailDup.length > 0) {
        return res.status(400).json({ success: false, message: 'Email address already registered.' });
      }
      const [licDup] = await db.getPool().execute('SELECT customer_id FROM customers WHERE license_number = ? AND customer_id != ?', [license_number, customerId]);
      if (licDup.length > 0) {
        return res.status(400).json({ success: false, message: 'License number already registered.' });
      }

      await db.getPool().execute(
        `UPDATE customers 
         SET first_name = ?, last_name = ?, email = ?, phone = ?, license_number = ?, status = ?
         WHERE customer_id = ?`,
        [first_name, last_name, email, phone, license_number.toUpperCase(), status, customerId]
      );

      res.json({ success: true, message: 'Customer profile updated successfully.' });
    }
  } catch (err) {
    console.error('Update Customer Error:', err);
    res.status(500).json({ success: false, message: 'Server error updating customer profile.' });
  }
});

// @route   DELETE /api/customers/:id
// @desc    Delete a customer if they have no active rentals, or suspend them
router.delete('/:id', authMiddleware, async (req, res) => {
  const customerId = parseInt(req.params.id, 10);

  try {
    if (db.getIsMock()) {
      const idx = db.mockDb.customers.findIndex(c => c.customer_id === customerId);
      if (idx === -1) {
        return res.status(404).json({ success: false, message: 'Customer not found.' });
      }

      // Check if they have active rentals
      const hasActive = db.mockDb.rentals.some(r => r.customer_id === customerId && r.status === 'active');
      if (hasActive) {
        return res.status(400).json({ success: false, message: 'Cannot delete customer. They currently have active rentals.' });
      }

      // Check if customer has any transaction/rental history
      const hasHistory = db.mockDb.rentals.some(r => r.customer_id === customerId);
      if (hasHistory) {
        // Suspend/soft delete
        db.mockDb.customers[idx].status = 'suspended';
        return res.json({ success: true, message: 'Customer has history. Status changed to "Suspended" for data integrity.' });
      }

      db.mockDb.customers.splice(idx, 1);
      return res.json({ success: true, message: 'Customer deleted successfully.' });
    } else {
      // MySQL checks
      const [activeRows] = await db.getPool().execute('SELECT rental_id FROM rentals WHERE customer_id = ? AND status = "active" LIMIT 1', [customerId]);
      if (activeRows.length > 0) {
        return res.status(400).json({ success: false, message: 'Cannot delete customer. They currently have active rentals.' });
      }

      const [historyRows] = await db.getPool().execute('SELECT rental_id FROM rentals WHERE customer_id = ? LIMIT 1', [customerId]);
      if (historyRows.length > 0) {
        // Soft delete/Suspend
        await db.getPool().execute('UPDATE customers SET status = "suspended" WHERE customer_id = ?', [customerId]);
        return res.json({ success: true, message: 'Customer has history. Status changed to "Suspended" for data integrity.' });
      }

      // Hard delete
      await db.getPool().execute('DELETE FROM customers WHERE customer_id = ?', [customerId]);
      res.json({ success: true, message: 'Customer deleted successfully.' });
    }
  } catch (err) {
    console.error('Delete Customer Error:', err);
    res.status(500).json({ success: false, message: 'Server error deleting customer.' });
  }
});

module.exports = router;
