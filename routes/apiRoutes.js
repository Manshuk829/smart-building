const express = require('express');
const router = express.Router();
const apiController = require('../controllers/apiController');
const { isAdmin } = require('../middleware/authMiddleware');

router.post('/sensor', apiController.saveSensorData);
router.post('/alert', isAdmin, apiController.triggerAlert);

module.exports = router;
