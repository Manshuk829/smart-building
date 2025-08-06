// controllers/alerts.js

const Alert = require('../models/Alert'); // Load Alert model

// 🔔 GET /alerts - Render recent ML alerts page
exports.getAlertsPage = async (req, res) => {
  try {
    const alerts = await Alert.find()
      .sort({ timestamp: -1 })  // Sort by most recent alerts
      .limit(50)                // Limit to 50 recent alerts
      .lean();                  // Return plain JS objects for performance

    res.render('alerts', { alerts: alerts || [], error: null });
  } catch (err) {
    console.error('🔴 [alertsController] Error loading alerts:', err);
    res.render('alerts', { alerts: [], error: 'Unable to load alerts at this time. Please try again later.' });
  }
};
