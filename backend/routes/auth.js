const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const authMiddleware = require('../middleware/authMiddleware');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey_vehiclerentalsystem_2026';

// @route   POST /api/auth/login
// @desc    Authenticate admin/staff & get token
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Please provide both username and password.' });
  }

  try {
    let admin = null;

    if (db.getIsMock()) {
      // Mock lookup
      admin = db.mockDb.admins.find(a => a.username === username && a.status === 'active');
    } else {
      // MySQL lookup
      const [rows] = await db.getPool().execute(
        'SELECT * FROM admins WHERE username = ? AND status = "active"',
        [username]
      );
      if (rows.length > 0) {
        admin = rows[0];
      }
    }

    if (!admin) {
      return res.status(401).json({ success: false, message: 'Invalid credentials or inactive account.' });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, admin.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    // Sign Token
    const payload = {
      admin_id: admin.admin_id,
      username: admin.username,
      name: admin.name,
      role: admin.role
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '12h' });

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        admin_id: admin.admin_id,
        username: admin.username,
        name: admin.name,
        role: admin.role
      }
    });

  } catch (err) {
    console.error('Auth Login Error:', err);
    res.status(500).json({ success: false, message: 'Server error during authentication.' });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user profile from token
router.get('/me', authMiddleware, async (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

module.exports = router;
