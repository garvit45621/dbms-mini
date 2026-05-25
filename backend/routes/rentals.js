const express = require('express');
const router = express.Router();
const db = require('../config/db');
const authMiddleware = require('../middleware/authMiddleware');

// Helper to calculate days between dates
function getDaysDifference(start, end) {
  const diffTime = Math.abs(new Date(end) - new Date(start));
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays === 0 ? 1 : diffDays;
}

// @route   GET /api/rentals/active
// @desc    Get active rentals list (for return selection)
router.get('/active', async (req, res) => {
  try {
    if (db.getIsMock()) {
      const activeRentals = db.mockDb.rentals
        .filter(r => r.status === 'active')
        .map(r => {
          const customer = db.mockDb.customers.find(c => c.customer_id === r.customer_id);
          const vehicle = db.mockDb.vehicles.find(v => v.vehicle_id === r.vehicle_id);
          return {
            rental_id: r.rental_id,
            start_date: r.start_date,
            end_date: r.end_date,
            customer_name: customer ? `${customer.first_name} ${customer.last_name}` : 'Unknown',
            vehicle_info: vehicle ? `${vehicle.make} ${vehicle.model}` : 'Unknown',
            license_plate: vehicle ? vehicle.license_plate : 'N/A'
          };
        });
      return res.json({ success: true, data: activeRentals });
    } else {
      const [rows] = await db.getPool().execute(
        `SELECT rental_id, start_date, end_date, customer_name, vehicle_info, license_plate 
         FROM vw_rental_details 
         WHERE rental_status = 'active'
         ORDER BY rental_id DESC`
      );
      res.json({ success: true, data: rows });
    }
  } catch (err) {
    console.error('Get Active Rentals Error:', err);
    res.status(500).json({ success: false, message: 'Server error fetching active rentals.' });
  }
});

// @route   GET /api/rentals/recent
// @desc    Get recent rentals (for dashboard)
router.get('/recent', async (req, res) => {
  try {
    if (db.getIsMock()) {
      const recent = db.mockDb.rentals
        .slice()
        .sort((a, b) => new Date(b.booking_date) - new Date(a.booking_date))
        .slice(0, 5)
        .map(r => {
          const customer = db.mockDb.customers.find(c => c.customer_id === r.customer_id);
          const vehicle = db.mockDb.vehicles.find(v => v.vehicle_id === r.vehicle_id);
          const invoice = db.mockDb.invoices.find(i => i.rental_id === r.rental_id);
          return {
            rental_id: r.rental_id,
            booking_date: r.booking_date,
            customer_name: customer ? `${customer.first_name} ${customer.last_name}` : 'Unknown',
            vehicle_info: vehicle ? `${vehicle.make} ${vehicle.model}` : 'Unknown',
            total_cost: r.total_cost,
            status: r.status,
            invoice_status: invoice ? invoice.status : 'unpaid'
          };
        });
      return res.json({ success: true, data: recent });
    } else {
      const [rows] = await db.getPool().execute(
        `SELECT rental_id, booking_date, customer_name, vehicle_info, base_total_cost AS total_cost, rental_status AS status, invoice_status 
         FROM vw_rental_details 
         ORDER BY booking_date DESC 
         LIMIT 5`
      );
      res.json({ success: true, data: rows });
    }
  } catch (err) {
    console.error('Get Recent Rentals Error:', err);
    res.status(500).json({ success: false, message: 'Server error fetching recent rentals.' });
  }
});

// @route   GET /api/rentals/calculate-late
// @desc    Estimate late hours and late fee for a return occurring now
router.get('/calculate-late', async (req, res) => {
  const { rental_id } = req.query;

  if (!rental_id) {
    return res.status(400).json({ success: false, message: 'Rental ID parameter is required.' });
  }

  try {
    if (db.getIsMock()) {
      const rental = db.mockDb.rentals.find(r => r.rental_id === parseInt(rental_id, 10));
      if (!rental) {
        return res.status(404).json({ success: false, message: 'Rental record not found.' });
      }

      const vehicle = db.mockDb.vehicles.find(v => v.vehicle_id === rental.vehicle_id);
      const category = db.mockDb.categories.find(c => c.category_id === vehicle.category_id);

      const endDate = new Date(rental.end_date);
      const now = new Date();
      const diffMs = now - endDate;
      let lateHours = 0;
      let lateFee = 0.00;

      if (diffMs > 0) {
        lateHours = Math.ceil(diffMs / (1000 * 60 * 60));
        lateFee = lateHours * category.late_fee_per_hour;
      }

      return res.json({
        success: true,
        data: {
          late_hours: lateHours,
          late_fee: parseFloat(lateFee.toFixed(2)),
          deposit_amount: category.deposit_amount,
          current_mileage: vehicle.mileage
        }
      });
    } else {
      const [rows] = await db.getPool().execute(
        `SELECT r.end_date, cat.late_fee_per_hour, cat.deposit_amount, v.mileage as current_mileage
         FROM rentals r
         JOIN vehicles v ON r.vehicle_id = v.vehicle_id
         JOIN categories cat ON v.category_id = cat.category_id
         WHERE r.rental_id = ? AND r.status = 'active'`,
        [rental_id]
      );

      if (rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Active rental record not found.' });
      }

      const { end_date, late_fee_per_hour, deposit_amount, current_mileage } = rows[0];
      const endDate = new Date(end_date);
      const now = new Date();
      const diffMs = now - endDate;
      let lateHours = 0;
      let lateFee = 0.00;

      if (diffMs > 0) {
        lateHours = Math.ceil(diffMs / (1000 * 60 * 60));
        lateFee = lateHours * parseFloat(late_fee_per_hour);
      }

      res.json({
        success: true,
        data: {
          late_hours: lateHours,
          late_fee: parseFloat(lateFee.toFixed(2)),
          deposit_amount: parseFloat(deposit_amount),
          current_mileage
        }
      });
    }
  } catch (err) {
    console.error('Calculate Late Fees Error:', err);
    res.status(500).json({ success: false, message: 'Server error estimating late fees.' });
  }
});

// @route   POST /api/rentals/book
// @desc    Create a new booking and auto-generate invoice (using stored procedure)
router.post('/book', authMiddleware, async (req, res) => {
  const { customer_id, vehicle_id, start_date, end_date, discount = 0.00 } = req.body;

  if (!customer_id || !vehicle_id || !start_date || !end_date) {
    return res.status(400).json({ success: false, message: 'All booking fields are required.' });
  }

  try {
    if (db.getIsMock()) {
      // Simulator for sp_create_booking
      const customer = db.mockDb.customers.find(c => c.customer_id === parseInt(customer_id, 10));
      const vehicle = db.mockDb.vehicles.find(v => v.vehicle_id === parseInt(vehicle_id, 10));

      if (!customer) return res.status(404).json({ success: false, message: 'Customer profile does not exist.' });
      if (customer.status !== 'active') return res.status(400).json({ success: false, message: 'Customer is suspended or inactive.' });
      if (!vehicle) return res.status(404).json({ success: false, message: 'Vehicle does not exist.' });
      if (vehicle.status !== 'available') return res.status(400).json({ success: false, message: 'Vehicle is currently not available.' });

      const category = db.mockDb.categories.find(c => c.category_id === vehicle.category_id);
      const days = getDaysDifference(start_date, end_date);
      const subtotal = (category.daily_rate * days) + category.deposit_amount;
      const tax = parseFloat((subtotal * 0.12).toFixed(2)); // 12% sales tax
      const disc = parseFloat(parseFloat(discount).toFixed(2));
      const total = parseFloat((subtotal + tax - disc).toFixed(2));

      // Push Rental
      const rentalId = db.mockDb.rentals.length > 0 ? Math.max(...db.mockDb.rentals.map(r => r.rental_id)) + 1 : 1;
      const newRental = {
        rental_id: rentalId,
        customer_id: parseInt(customer_id, 10),
        vehicle_id: parseInt(vehicle_id, 10),
        booking_date: new Date(),
        start_date: new Date(start_date),
        end_date: new Date(end_date),
        actual_return_date: null,
        total_cost: total,
        status: 'active',
        created_by_admin_id: req.user.admin_id
      };
      db.mockDb.rentals.push(newRental);

      // Create Invoice
      const invoiceId = db.mockDb.invoices.length > 0 ? Math.max(...db.mockDb.invoices.map(i => i.invoice_id)) + 1 : 1;
      const invoiceNumber = `INV-${new Date().getFullYear()}-${String(rentalId).padStart(5, '0')}`;
      const newInvoice = {
        invoice_id: invoiceId,
        rental_id: rentalId,
        invoice_number: invoiceNumber,
        issue_date: new Date(),
        due_date: new Date(start_date),
        subtotal,
        tax_amount: tax,
        discount_amount: disc,
        total_amount: total,
        status: 'unpaid'
      };
      db.mockDb.invoices.push(newInvoice);

      // Trigger action: update vehicle status
      vehicle.status = 'rented';

      return res.status(201).json({
        success: true,
        message: 'Rental booked successfully!',
        rental_id: rentalId,
        invoice: newInvoice
      });
    } else {
      // Call MySQL Stored Procedure
      const pool = db.getPool();
      const conn = await pool.getConnection();

      try {
        await conn.query('SET @out_rental_id = 0;');
        await conn.query(
          'CALL sp_create_booking(?, ?, ?, ?, ?, ?, @out_rental_id)',
          [
            parseInt(customer_id, 10),
            parseInt(vehicle_id, 10),
            start_date,
            end_date,
            req.user.admin_id,
            parseFloat(discount)
          ]
        );

        const [outRows] = await conn.query('SELECT @out_rental_id AS rental_id');
        const rentalId = outRows[0].rental_id;

        // Fetch the generated invoice
        const [invoiceRows] = await conn.execute(
          'SELECT * FROM invoices WHERE rental_id = ?',
          [rentalId]
        );

        res.status(201).json({
          success: true,
          message: 'Rental booked successfully!',
          rental_id: rentalId,
          invoice: invoiceRows[0]
        });
      } finally {
        conn.release();
      }
    }
  } catch (err) {
    console.error('Book Rental Error:', err);
    res.status(500).json({ success: false, message: err.message || 'Server error processing booking.' });
  }
});

// @route   POST /api/rentals/return
// @desc    Process a vehicle return (using stored procedure)
router.post('/return', authMiddleware, async (req, res) => {
  const { rental_id, mileage_in, fuel_level, damage_notes, damage_charges = 0.00, additional_charges = 0.00 } = req.body;

  if (!rental_id || mileage_in === undefined || !fuel_level) {
    return res.status(400).json({ success: false, message: 'Rental ID, return mileage, and fuel level are required.' });
  }

  try {
    if (db.getIsMock()) {
      // Simulator for sp_process_return
      const rental = db.mockDb.rentals.find(r => r.rental_id === parseInt(rental_id, 10));
      if (!rental || rental.status !== 'active') {
        return res.status(404).json({ success: false, message: 'Active rental not found.' });
      }

      const vehicle = db.mockDb.vehicles.find(v => v.vehicle_id === rental.vehicle_id);
      if (parseInt(mileage_in, 10) < vehicle.mileage) {
        return res.status(400).json({ success: false, message: 'Return mileage cannot be lower than the starting mileage.' });
      }

      const category = db.mockDb.categories.find(c => c.category_id === vehicle.category_id);
      const endDate = new Date(rental.end_date);
      const now = new Date();
      const diffMs = now - endDate;
      let lateHours = 0;
      let lateFee = 0.00;

      if (diffMs > 0) {
        lateHours = Math.ceil(diffMs / (1000 * 60 * 60));
        lateFee = parseFloat((lateHours * category.late_fee_per_hour).toFixed(2));
      }

      const dmgChg = parseFloat(parseFloat(damage_charges).toFixed(2));
      const addChg = parseFloat(parseFloat(additional_charges).toFixed(2));
      let finalAmount = parseFloat((lateFee + dmgChg + addChg).toFixed(2));
      let totalRefund = 0.00;

      const deposit = category.deposit_amount;
      if (deposit >= finalAmount) {
        totalRefund = parseFloat((deposit - finalAmount).toFixed(2));
        finalAmount = 0.00;
      } else {
        totalRefund = 0.00;
        finalAmount = parseFloat((finalAmount - deposit).toFixed(2));
      }

      // Add Return log
      const returnId = db.mockDb.returns.length > 0 ? Math.max(...db.mockDb.returns.map(ret => ret.return_id)) + 1 : 1;
      const returnLog = {
        return_id: returnId,
        rental_id: rental.rental_id,
        return_date: now,
        mileage_in: parseInt(mileage_in, 10),
        fuel_level_in: fuel_level,
        damage_notes: damage_notes || null,
        late_hours: lateHours,
        late_fee: lateFee,
        damage_charges: dmgChg,
        additional_charges: addChg,
        total_refund_deducted: totalRefund,
        final_amount_paid: finalAmount,
        processed_by_admin_id: req.user.admin_id
      };
      db.mockDb.returns.push(returnLog);

      // Trigger actions: Update invoice status
      const invoice = db.mockDb.invoices.find(i => i.rental_id === rental.rental_id);
      if (invoice) {
        invoice.status = 'paid';
        invoice.total_amount = parseFloat((invoice.total_amount + finalAmount).toFixed(2));
      }

      // Record final payment if finalAmount > 0
      if (finalAmount > 0) {
        const paymentId = db.mockDb.payments.length > 0 ? Math.max(...db.mockDb.payments.map(p => p.payment_id)) + 1 : 1;
        db.mockDb.payments.push({
          payment_id: paymentId,
          rental_id: rental.rental_id,
          payment_date: now,
          amount: finalAmount,
          payment_method: 'cash',
          status: 'paid',
          transaction_reference: `RET_PAY_${returnId}`
        });
      }

      // Update vehicle & rental states (mimics triggers)
      vehicle.mileage = parseInt(mileage_in, 10);
      if (damage_notes && damage_notes.trim().length > 0) {
        vehicle.status = 'maintenance';
      } else {
        vehicle.status = 'available';
      }

      rental.status = 'completed';
      rental.actual_return_date = now;

      return res.json({
        success: true,
        message: 'Vehicle returned successfully!',
        data: returnLog
      });
    } else {
      // Call MySQL Stored Procedure
      const pool = db.getPool();
      const conn = await pool.getConnection();

      try {
        await conn.query('SET @out_return_id = 0;');
        await conn.query(
          'CALL sp_process_return(?, ?, ?, ?, ?, ?, ?, @out_return_id)',
          [
            parseInt(rental_id, 10),
            parseInt(mileage_in, 10),
            fuel_level,
            damage_notes || null,
            parseFloat(damage_charges),
            parseFloat(additional_charges),
            req.user.admin_id
          ]
        );

        const [outRows] = await conn.query('SELECT @out_return_id AS return_id');
        const returnId = outRows[0].return_id;

        // Fetch details
        const [returnDetails] = await conn.execute(
          'SELECT * FROM returns WHERE return_id = ?',
          [returnId]
        );

        res.json({
          success: true,
          message: 'Vehicle returned successfully!',
          data: returnDetails[0]
        });
      } finally {
        conn.release();
      }
    }
  } catch (err) {
    console.error('Process Return Error:', err);
    res.status(500).json({ success: false, message: err.message || 'Server error processing return.' });
  }
});

// @route   GET /api/rentals/:id/invoice
// @desc    Get detailed invoice and pricing breakdown for a rental
router.get('/:id/invoice', async (req, res) => {
  const rentalId = parseInt(req.params.id, 10);

  try {
    if (db.getIsMock()) {
      const invoice = db.mockDb.invoices.find(i => i.rental_id === rentalId);
      const rental = db.mockDb.rentals.find(r => r.rental_id === rentalId);
      if (!invoice || !rental) {
        return res.status(404).json({ success: false, message: 'Invoice details not found.' });
      }

      const customer = db.mockDb.customers.find(c => c.customer_id === rental.customer_id);
      const vehicle = db.mockDb.vehicles.find(v => v.vehicle_id === rental.vehicle_id);
      const category = db.mockDb.categories.find(c => c.category_id === vehicle.category_id);
      const returnLog = db.mockDb.returns.find(ret => ret.rental_id === rentalId);

      return res.json({
        success: true,
        data: {
          invoice_number: invoice.invoice_number,
          issue_date: invoice.issue_date,
          due_date: invoice.due_date,
          subtotal: invoice.subtotal,
          tax_amount: invoice.tax_amount,
          discount_amount: invoice.discount_amount,
          total_amount: invoice.total_amount,
          invoice_status: invoice.status,
          customer_name: customer ? `${customer.first_name} ${customer.last_name}` : 'Unknown',
          customer_email: customer ? customer.email : 'N/A',
          customer_phone: customer ? customer.phone : 'N/A',
          vehicle_info: vehicle ? `${vehicle.make} ${vehicle.model}` : 'Unknown',
          license_plate: vehicle ? vehicle.license_plate : 'N/A',
          daily_rate: category ? category.daily_rate : 0.00,
          deposit_amount: category ? category.deposit_amount : 0.00,
          rental_days: getDaysDifference(rental.start_date, rental.end_date),
          return_info: returnLog ? {
            return_date: returnLog.return_date,
            late_hours: returnLog.late_hours,
            late_fee: returnLog.late_fee,
            damage_charges: returnLog.damage_charges,
            additional_charges: returnLog.additional_charges,
            total_refund_deducted: returnLog.total_refund_deducted,
            final_amount_paid: returnLog.final_amount_paid
          } : null
        }
      });
    } else {
      // MySQL Invoice details fetch
      const [invoiceRows] = await db.getPool().execute(
        `SELECT 
          inv.invoice_number, inv.issue_date, inv.due_date, inv.subtotal, inv.tax_amount, 
          inv.discount_amount, inv.total_amount, inv.status AS invoice_status,
          customer_name, customer_email, customer_phone, vehicle_info, license_plate, 
          daily_rate, deposit_amount, start_date, end_date,
          return_id, late_hours, late_fee, damage_charges, additional_charges, total_refund_deducted, final_amount_paid, actual_return_date
        FROM vw_rental_details d
        JOIN invoices inv ON d.rental_id = inv.rental_id
        LEFT JOIN returns ret ON d.rental_id = ret.rental_id
        WHERE d.rental_id = ?`,
        [rentalId]
      );

      if (invoiceRows.length === 0) {
        return res.status(404).json({ success: false, message: 'Invoice details not found.' });
      }

      const row = invoiceRows[0];
      const rentalDays = getDaysDifference(row.start_date, row.end_date);

      res.json({
        success: true,
        data: {
          invoice_number: row.invoice_number,
          issue_date: row.issue_date,
          due_date: row.due_date,
          subtotal: parseFloat(row.subtotal),
          tax_amount: parseFloat(row.tax_amount),
          discount_amount: parseFloat(row.discount_amount),
          total_amount: parseFloat(row.total_amount),
          invoice_status: row.invoice_status,
          customer_name: row.customer_name,
          customer_email: row.customer_email,
          customer_phone: row.customer_phone,
          vehicle_info: row.vehicle_info,
          license_plate: row.license_plate,
          daily_rate: parseFloat(row.daily_rate),
          deposit_amount: parseFloat(row.deposit_amount),
          rental_days,
          return_info: row.return_id ? {
            return_date: row.actual_return_date,
            late_hours: row.late_hours,
            late_fee: parseFloat(row.late_fee),
            damage_charges: parseFloat(row.damage_charges),
            additional_charges: parseFloat(row.additional_charges),
            total_refund_deducted: parseFloat(row.total_refund_deducted),
            final_amount_paid: parseFloat(row.final_amount_paid)
          } : null
        }
      });
    }
  } catch (err) {
    console.error('Get Invoice Error:', err);
    res.status(500).json({ success: false, message: 'Server error retrieving invoice.' });
  }
});

module.exports = router;
