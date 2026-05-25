const express = require('express');
const router = express.Router();
const db = require('../config/db');
const authMiddleware = require('../middleware/authMiddleware');

// @route   GET /api/reports/dashboard-stats
// @desc    Get dashboard metrics (Total Vehicles, Available Vehicles, Active Rentals, Revenue)
router.get('/dashboard-stats', async (req, res) => {
  try {
    if (db.getIsMock()) {
      const totalVehicles = db.mockDb.vehicles.filter(v => v.status !== 'retired').length;
      const availableVehicles = db.mockDb.vehicles.filter(v => v.status === 'available').length;
      const activeRentals = db.mockDb.rentals.filter(r => r.status === 'active').length;

      // Sum of all paid payments
      const revenue = db.mockDb.payments
        .filter(p => p.status === 'paid')
        .reduce((sum, p) => sum + p.amount, 0);

      // Vehicle utilization list (for dashboard sidebar)
      const categoryAvailability = db.mockDb.categories.map(cat => {
        const catVehicles = db.mockDb.vehicles.filter(v => v.category_id === cat.category_id && v.status !== 'retired');
        const availableCat = catVehicles.filter(v => v.status === 'available').length;
        return {
          category_name: cat.name,
          total: catVehicles.length,
          available: availableCat
        };
      });

      return res.json({
        success: true,
        data: {
          totalVehicles,
          availableVehicles,
          activeRentals,
          revenue: parseFloat(revenue.toFixed(2)),
          categoryAvailability
        }
      });
    } else {
      const pool = db.getPool();

      // Execute dashboard queries
      const [vehicleCount] = await pool.execute('SELECT COUNT(*) as total FROM vehicles WHERE status != "retired"');
      const [availCount] = await pool.execute('SELECT COUNT(*) as total FROM vehicles WHERE status = "available"');
      const [activeCount] = await pool.execute('SELECT COUNT(*) as total FROM rentals WHERE status = "active"');
      const [revCount] = await pool.execute('SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = "paid"');

      // Category summary
      const [catStats] = await pool.execute(`
        SELECT 
          c.name AS category_name,
          COUNT(v.vehicle_id) AS total,
          SUM(CASE WHEN v.status = 'available' THEN 1 ELSE 0 END) AS available
        FROM categories c
        LEFT JOIN vehicles v ON c.category_id = v.category_id AND v.status != 'retired'
        GROUP BY c.category_id, c.name
      `);

      res.json({
        success: true,
        data: {
          totalVehicles: vehicleCount[0].total,
          availableVehicles: availCount[0].total,
          activeRentals: activeCount[0].total,
          revenue: parseFloat(revCount[0].total),
          categoryAvailability: catStats
        }
      });
    }
  } catch (err) {
    console.error('Get Dashboard Stats Error:', err);
    res.status(500).json({ success: false, message: 'Server error retrieving statistics.' });
  }
});

// @route   GET /api/reports/revenue-by-category
// @desc    Get revenue distribution details by category
router.get('/revenue-by-category', async (req, res) => {
  try {
    if (db.getIsMock()) {
      const stats = db.mockDb.categories.map(cat => {
        // Find vehicles in this category
        const vehicleIds = db.mockDb.vehicles
          .filter(v => v.category_id === cat.category_id)
          .map(v => v.vehicle_id);

        // Find rentals for these vehicles
        const rentalIds = db.mockDb.rentals
          .filter(r => vehicleIds.includes(r.vehicle_id) && r.status !== 'cancelled')
          .map(r => r.rental_id);

        // Sum payments
        const categoryRev = db.mockDb.payments
          .filter(p => rentalIds.includes(p.rental_id) && p.status === 'paid')
          .reduce((sum, p) => sum + p.amount, 0);

        return {
          category_name: cat.name,
          rental_count: rentalIds.length,
          revenue: parseFloat(categoryRev.toFixed(2))
        };
      });

      return res.json({ success: true, data: stats });
    } else {
      // Execute category revenue query
      const [rows] = await db.getPool().execute(`
        SELECT 
          cat.name AS category_name,
          COUNT(DISTINCT r.rental_id) AS rental_count,
          COALESCE(SUM(p.amount), 0) AS revenue
        FROM categories cat
        LEFT JOIN vehicles v ON cat.category_id = v.category_id
        LEFT JOIN rentals r ON v.vehicle_id = r.vehicle_id AND r.status != 'cancelled'
        LEFT JOIN payments p ON r.rental_id = p.rental_id AND p.status = 'paid'
        GROUP BY cat.category_id, cat.name
        ORDER BY revenue DESC
      `);
      res.json({ success: true, data: rows });
    }
  } catch (err) {
    console.error('Get Revenue Reports Error:', err);
    res.status(500).json({ success: false, message: 'Server error fetching revenue analytics.' });
  }
});

// @route   GET /api/reports/utilization
// @desc    Get detailed fleet utilization stats
router.get('/utilization', async (req, res) => {
  try {
    if (db.getIsMock()) {
      // Generate utilization stats from mock data
      const stats = db.mockDb.vehicles
        .filter(v => v.status !== 'retired')
        .map(v => {
          const cat = db.mockDb.categories.find(c => c.category_id === v.category_id);
          const rentals = db.mockDb.rentals.filter(r => r.vehicle_id === v.vehicle_id && r.status !== 'cancelled');

          // Sum total active days
          let totalDays = 0;
          rentals.forEach(r => {
            const end = r.actual_return_date ? new Date(r.actual_return_date) : new Date(r.end_date);
            const diffTime = Math.abs(end - new Date(r.start_date));
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            totalDays += diffDays === 0 ? 1 : diffDays;
          });

          // Earnings
          const rentalIds = rentals.map(r => r.rental_id);
          const rev = db.mockDb.payments
            .filter(p => rentalIds.includes(p.rental_id) && p.status === 'paid')
            .reduce((sum, p) => sum + p.amount, 0);

          return {
            vehicle_id: v.vehicle_id,
            make: v.make,
            model: v.model,
            license_plate: v.license_plate,
            category_name: cat ? cat.name : 'Unknown',
            current_status: v.status,
            total_rentals: rentals.length,
            total_rental_days: totalDays,
            total_revenue_generated: parseFloat(rev.toFixed(2))
          };
        });

      return res.json({ success: true, data: stats });
    } else {
      // Use View: vw_vehicle_utilization
      const [rows] = await db.getPool().execute(
        `SELECT * FROM vw_vehicle_utilization 
         WHERE current_status != 'retired' 
         ORDER BY total_revenue_generated DESC`
      );
      res.json({ success: true, data: rows });
    }
  } catch (err) {
    console.error('Get Utilization Reports Error:', err);
    res.status(500).json({ success: false, message: 'Server error retrieving utilization stats.' });
  }
});

// @route   GET /api/reports/export
// @desc    Export a quick textual summary (or CSV payload)
router.get('/export', async (req, res) => {
  try {
    let dataSummary = [];

    if (db.getIsMock()) {
      dataSummary = db.mockDb.vehicles
        .filter(v => v.status !== 'retired')
        .map(v => `${v.make} ${v.model} (${v.license_plate}) - Status: ${v.status}, Mileage: ${v.mileage}km`);
    } else {
      const [rows] = await db.getPool().execute('SELECT make, model, license_plate, status, mileage FROM vehicles WHERE status != "retired"');
      dataSummary = rows.map(r => `${r.make} ${r.model} (${r.license_plate}) - Status: ${r.status}, Mileage: ${r.mileage}km`);
    }

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', 'attachment; filename="fleet_summary.txt"');
    res.send(`VEHICLE RENTAL MANAGEMENT SYSTEM - FLEET STATUS EXPORT\nGenerated at: ${new Date().toLocaleString()}\n\n` + dataSummary.join('\n'));
  } catch (err) {
    console.error('Export Report Error:', err);
    res.status(500).json({ success: false, message: 'Server error exporting reports.' });
  }
});

module.exports = router;
