// routes/apiRoutes.js

const express = require('express');
const router = express.Router();
const apiController = require('../controllers/apiController');
const { isAdmin } = require('../middleware/authMiddleware');

// 📡 Save sensor data (used by devices or ML service)
router.post('/sensor', apiController.saveSensorData);

// 🚨 Trigger manual alert (only admin)
router.post('/alert', isAdmin, apiController.triggerAlert);

module.exports = router;
