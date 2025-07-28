const Alert = require('../models/Alert'); // Load Alert model

// GET /alerts - Render recent ML alerts page
exports.getAlertsPage = async (req, res) => {
  try {
    const alerts = await Alert.find()
      .sort({ createdAt: -1 }) // Newest first
      .limit(50)               // Limit to latest 50 alerts
      .lean();                 // Use lean for better performance

    // Render 'alerts' view with alerts data, fallback to empty array
    res.render('alerts', { alerts: alerts || [] });
  } catch (err) {
    console.error('🔴 [alerts.js] Failed to fetch alerts:', err.message);
    res.status(500).send('Error loading alerts page.');
  }
};
