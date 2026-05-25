const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend assets statically
app.use(express.static(path.join(__dirname, '../frontend')));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/vehicles', require('./routes/vehicles'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/rentals', require('./routes/rentals'));
app.use('/api/reports', require('./routes/reports'));

// Fallback to index.html for Single Page routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Start Server
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`========================================================================`);
    console.log(` VEHICLE RENTAL MANAGEMENT SYSTEM SERVER RUNNING ON PORT ${PORT}`);
    console.log(` API Endpoint: http://localhost:${PORT}/api`);
    console.log(` User Panel:  http://localhost:${PORT}`);
    console.log(`========================================================================`);
  });
}

module.exports = app;

