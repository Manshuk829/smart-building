const Alert = require('../models/Alert'); // Load Alert model

// GET /alerts - Render recent ML alerts
exports.getAlertsPage = async (req, res) => {
  try {
    const alerts = await Alert.find()
      .sort({ createdAt: -1 })
      .limit(50)
      .lean(); // ✅ improves performance

    res.render('alerts', { alerts: alerts || [] }); // ✅ fallback to empty list
  } catch (err) {
    console.error('🔴 [AlertController] Failed to fetch alerts:', err.message);
    res.status(500).send('Error loading alerts page.');
  }
};
