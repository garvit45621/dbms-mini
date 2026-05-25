const express = require('express');
const router = express.Router();
const db = require('../config/db');
const authMiddleware = require('../middleware/authMiddleware');

// @route   GET /api/vehicles
// @desc    Get vehicles list with filters, search, and pagination
router.get('/', async (req, res) => {
  const { category, status, search, page = 1, limit = 8 } = req.query;
  const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

  try {
    if (db.getIsMock()) {
      // Mock Filtering
      let filtered = [...db.mockDb.vehicles];

      if (category) {
        filtered = filtered.filter(v => v.category_id === parseInt(category, 10));
      }
      if (status) {
        filtered = filtered.filter(v => v.status === status);
      }
      if (search) {
        const query = search.toLowerCase();
        filtered = filtered.filter(v => 
          v.make.toLowerCase().includes(query) ||
          v.model.toLowerCase().includes(query) ||
          v.license_plate.toLowerCase().includes(query)
        );
      }

      // Add Category names to vehicles
      const resultVehicles = filtered.slice(offset, offset + parseInt(limit, 10)).map(v => {
        const cat = db.mockDb.categories.find(c => c.category_id === v.category_id);
        return {
          ...v,
          category_name: cat ? cat.name : 'Unknown',
          daily_rate: cat ? cat.daily_rate : 0.00
        };
      });

      return res.json({
        success: true,
        data: resultVehicles,
        pagination: {
          total: filtered.length,
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          pages: Math.ceil(filtered.length / parseInt(limit, 10))
        }
      });
    } else {
      // MySQL Filtering
      let query = `
        SELECT v.*, c.name AS category_name, c.daily_rate, c.late_fee_per_hour
        FROM vehicles v
        JOIN categories c ON v.category_id = c.category_id
        WHERE 1=1
      `;
      const params = [];

      if (category) {
        query += ' AND v.category_id = ?';
        params.push(parseInt(category, 10));
      }
      if (status) {
        query += ' AND v.status = ?';
        params.push(status);
      }
      if (search) {
        query += ' AND (v.make LIKE ? OR v.model LIKE ? OR v.license_plate LIKE ?)';
        const searchPattern = `%${search}%`;
        params.push(searchPattern, searchPattern, searchPattern);
      }

      // Count total rows
      const countQuery = `SELECT COUNT(*) as total FROM (${query}) AS subquery`;
      const [countRows] = await db.getPool().execute(countQuery, params);
      const total = countRows[0].total;

      // Add Limit and Offset
      query += ' ORDER BY v.vehicle_id DESC LIMIT ? OFFSET ?';
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
    console.error('Get Vehicles Error:', err);
    res.status(500).json({ success: false, message: 'Server error retrieving vehicles.' });
  }
});

// @route   GET /api/vehicles/categories
// @desc    Get all categories
router.get('/categories', async (req, res) => {
  try {
    if (db.getIsMock()) {
      return res.json({ success: true, data: db.mockDb.categories });
    } else {
      const [rows] = await db.getPool().execute('SELECT * FROM categories ORDER BY category_id ASC');
      return res.json({ success: true, data: rows });
    }
  } catch (err) {
    console.error('Get Categories Error:', err);
    res.status(500).json({ success: false, message: 'Server error retrieving categories.' });
  }
});

// @route   POST /api/vehicles
// @desc    Add a new vehicle
router.post('/', authMiddleware, async (req, res) => {
  const { make, model, year, license_plate, color, category_id, status = 'available', image_url, mileage, fuel_type, transmission } = req.body;

  // Basic validation
  if (!make || !model || !year || !license_plate || !color || !category_id || mileage === undefined || !fuel_type || !transmission) {
    return res.status(400).json({ success: false, message: 'Please provide all required vehicle details.' });
  }

  try {
    if (db.getIsMock()) {
      // Check for duplicate license plate
      const exists = db.mockDb.vehicles.some(v => v.license_plate.toLowerCase() === license_plate.toLowerCase());
      if (exists) {
        return res.status(400).json({ success: false, message: 'License plate already exists in system.' });
      }

      const newId = db.mockDb.vehicles.length > 0 ? Math.max(...db.mockDb.vehicles.map(v => v.vehicle_id)) + 1 : 1;
      const newVehicle = {
        vehicle_id: newId,
        make,
        model,
        year: parseInt(year, 10),
        license_plate: license_plate.toUpperCase(),
        color,
        category_id: parseInt(category_id, 10),
        status,
        image_url: image_url || 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=600&q=80',
        mileage: parseInt(mileage, 10),
        fuel_type,
        transmission
      };

      db.mockDb.vehicles.push(newVehicle);
      return res.status(201).json({ success: true, message: 'Vehicle added successfully.', data: newVehicle });
    } else {
      // MySQL insert
      // Check for duplicate
      const [duplicate] = await db.getPool().execute('SELECT vehicle_id FROM vehicles WHERE license_plate = ?', [license_plate]);
      if (duplicate.length > 0) {
        return res.status(400).json({ success: false, message: 'License plate already exists in system.' });
      }

      const defaultImage = 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=600&q=80';
      const [result] = await db.getPool().execute(
        `INSERT INTO vehicles (make, model, year, license_plate, color, category_id, status, image_url, mileage, fuel_type, transmission)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
        [make, model, parseInt(year, 10), license_plate.toUpperCase(), color, parseInt(category_id, 10), status, image_url || defaultImage, parseInt(mileage, 10), fuel_type, transmission]
      );

      res.status(201).json({
        success: true,
        message: 'Vehicle added successfully.',
        data: { vehicle_id: result.insertId }
      });
    }
  } catch (err) {
    console.error('Create Vehicle Error:', err);
    res.status(500).json({ success: false, message: 'Server error saving vehicle.' });
  }
});

// @route   PUT /api/vehicles/:id
// @desc    Update vehicle details
router.put('/:id', authMiddleware, async (req, res) => {
  const vehicleId = parseInt(req.params.id, 10);
  const { make, model, year, license_plate, color, category_id, status, image_url, mileage, fuel_type, transmission } = req.body;

  try {
    if (db.getIsMock()) {
      const idx = db.mockDb.vehicles.findIndex(v => v.vehicle_id === vehicleId);
      if (idx === -1) {
        return res.status(404).json({ success: false, message: 'Vehicle not found.' });
      }

      // Check duplicate license plate excluding self
      const exists = db.mockDb.vehicles.some(v => v.vehicle_id !== vehicleId && v.license_plate.toLowerCase() === license_plate.toLowerCase());
      if (exists) {
        return res.status(400).json({ success: false, message: 'License plate already exists.' });
      }

      db.mockDb.vehicles[idx] = {
        ...db.mockDb.vehicles[idx],
        make: make || db.mockDb.vehicles[idx].make,
        model: model || db.mockDb.vehicles[idx].model,
        year: year ? parseInt(year, 10) : db.mockDb.vehicles[idx].year,
        license_plate: license_plate ? license_plate.toUpperCase() : db.mockDb.vehicles[idx].license_plate,
        color: color || db.mockDb.vehicles[idx].color,
        category_id: category_id ? parseInt(category_id, 10) : db.mockDb.vehicles[idx].category_id,
        status: status || db.mockDb.vehicles[idx].status,
        image_url: image_url || db.mockDb.vehicles[idx].image_url,
        mileage: mileage !== undefined ? parseInt(mileage, 10) : db.mockDb.vehicles[idx].mileage,
        fuel_type: fuel_type || db.mockDb.vehicles[idx].fuel_type,
        transmission: transmission || db.mockDb.vehicles[idx].transmission
      };

      return res.json({ success: true, message: 'Vehicle updated successfully.', data: db.mockDb.vehicles[idx] });
    } else {
      // MySQL update
      // Check duplicate
      const [duplicate] = await db.getPool().execute('SELECT vehicle_id FROM vehicles WHERE license_plate = ? AND vehicle_id != ?', [license_plate, vehicleId]);
      if (duplicate.length > 0) {
        return res.status(400).json({ success: false, message: 'License plate already exists.' });
      }

      await db.getPool().execute(
        `UPDATE vehicles 
         SET make = ?, model = ?, year = ?, license_plate = ?, color = ?, category_id = ?, status = ?, image_url = ?, mileage = ?, fuel_type = ?, transmission = ?
         WHERE vehicle_id = ?`,
        [make, model, parseInt(year, 10), license_plate.toUpperCase(), color, parseInt(category_id, 10), status, image_url, parseInt(mileage, 10), fuel_type, transmission, vehicleId]
      );

      res.json({ success: true, message: 'Vehicle updated successfully.' });
    }
  } catch (err) {
    console.error('Update Vehicle Error:', err);
    res.status(500).json({ success: false, message: 'Server error updating vehicle.' });
  }
});

// @route   DELETE /api/vehicles/:id
// @desc    Delete vehicle if not rented
router.delete('/:id', authMiddleware, async (req, res) => {
  const vehicleId = parseInt(req.params.id, 10);

  try {
    if (db.getIsMock()) {
      const idx = db.mockDb.vehicles.findIndex(v => v.vehicle_id === vehicleId);
      if (idx === -1) {
        return res.status(404).json({ success: false, message: 'Vehicle not found.' });
      }

      // Check if vehicle is rented
      const vehicle = db.mockDb.vehicles[idx];
      if (vehicle.status === 'rented') {
        return res.status(400).json({ success: false, message: 'Cannot delete vehicle. It is currently rented.' });
      }

      // Verify if vehicle has any rental history
      const hasRentals = db.mockDb.rentals.some(r => r.vehicle_id === vehicleId);
      if (hasRentals) {
        // Safe action: soft delete/retire
        vehicle.status = 'retired';
        return res.json({ success: true, message: 'Vehicle has rental history. Status changed to "Retired" for data integrity.' });
      }

      // Delete entirely if no rentals
      db.mockDb.vehicles.splice(idx, 1);
      return res.json({ success: true, message: 'Vehicle deleted successfully.' });
    } else {
      // MySQL check
      const [vehicleRows] = await db.getPool().execute('SELECT status FROM vehicles WHERE vehicle_id = ?', [vehicleId]);
      if (vehicleRows.length === 0) {
        return res.status(404).json({ success: false, message: 'Vehicle not found.' });
      }

      if (vehicleRows[0].status === 'rented') {
        return res.status(400).json({ success: false, message: 'Cannot delete vehicle. It is currently rented.' });
      }

      const [rentalRows] = await db.getPool().execute('SELECT rental_id FROM rentals WHERE vehicle_id = ? LIMIT 1', [vehicleId]);
      if (rentalRows.length > 0) {
        // Soft delete: set status to 'retired'
        await db.getPool().execute('UPDATE vehicles SET status = "retired" WHERE vehicle_id = ?', [vehicleId]);
        return res.json({ success: true, message: 'Vehicle has rental history. Status changed to "Retired" for data integrity.' });
      }

      // Hard delete
      await db.getPool().execute('DELETE FROM vehicles WHERE vehicle_id = ?', [vehicleId]);
      res.json({ success: true, message: 'Vehicle deleted successfully.' });
    }
  } catch (err) {
    console.error('Delete Vehicle Error:', err);
    res.status(500).json({ success: false, message: 'Server error deleting vehicle.' });
  }
});

module.exports = router;
