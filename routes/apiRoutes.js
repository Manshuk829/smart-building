// routes/apiRoutes.js

const express = require('express');
const router = express.Router();
const apiController = require('../controllers/apiController');
const { isAdmin } = require('../middleware/authMiddleware');

// ✅ Public API: Receive sensor data from ESP32 or ML pipeline
// Payload: { floor: 2, temperature: 27.5, gas: 310, prediction: "fire" }
router.post('/sensor', apiController.saveSensorData);

// 🔐 Admin API: Manually trigger emergency alert (used by control room)
router.post('/alert', isAdmin, apiController.triggerAlert);

// ✅ Developer sanity check (optional)
if (process.env.NODE_ENV !== 'production') {
  if (typeof apiController.saveSensorData !== 'function') {
    console.warn('⚠️ Warning: saveSensorData is not a function.');
  }
  if (typeof apiController.triggerAlert !== 'function') {
    console.warn('⚠️ Warning: triggerAlert is not a function.');
  }
}

module.exports = router;
