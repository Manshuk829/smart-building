const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { isAdmin } = require('../middleware/authMiddleware');

router.get('/users', isAdmin, adminController.listUsers);
router.post('/users/:id/promote', isAdmin, adminController.promoteUser);
router.post('/users/:id/demote', isAdmin, adminController.demoteUser);
router.post('/users/:id/delete', isAdmin, adminController.deleteUser);
router.get('/logs', isAdmin, adminController.viewLogs);
router.get('/logs/download', isAdmin, adminController.downloadLogs);

module.exports = router;
