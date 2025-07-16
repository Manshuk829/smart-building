// routes/apiRoutes.js

const express = require('express');
const router = express.Router();
const apiController = require('../controllers/apiController');
const { isAdmin } = require('../middleware/authMiddleware');

// ✅ Public Route: Receive sensor data from devices or ML pipeline
// Example payload: { floor: 2, temperature: 27.5, gas: 310, prediction: "fire" }
router.post('/sensor', apiController.saveSensorData);

// 🔐 Protected Route: Manually trigger alert for a floor (admin only)
router.post('/alert', isAdmin, apiController.triggerAlert);

module.exports = router;
