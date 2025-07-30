const Alert = require('../models/Alert'); // Load Alert model

// GET /alerts - Render recent ML alerts page
exports.getAlertsPage = async (req, res) => {
  try {
    const alerts = await Alert.find()
      .sort({ timestamp: -1 })  // ✅ Use 'timestamp' instead of 'createdAt'
      .limit(50)                // Show latest 50 alerts
      .lean();                  // Improve performance

    res.render('alerts', { alerts: alerts || [] });
  } catch (err) {
    console.error('🔴 [alerts.js] Failed to fetch alerts:', err.message);
    res.status(500).send('Error loading alerts page.');
  }
};
