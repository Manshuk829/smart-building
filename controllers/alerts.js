// controllers/alerts.js

const Alert = require('../models/Alert'); // Load Alert model

// 🔔 GET /alerts - Render recent ML alerts page
exports.getAlertsPage = async (req, res) => {
  try {
    const alerts = await Alert.find()
      .sort({ createdAt: -1 })  // Sort by most recent alerts
      .limit(100)                // Limit to 100 recent alerts
      .lean();                  // Return plain JS objects for performance

    // Transform alerts for frontend
    const transformedAlerts = alerts.map(alert => ({
      id: alert._id.toString(),
      type: alert.alertType || alert.type || 'unknown',
      severity: alert.severity || 'info',
      floor: alert.floor || 1,
      message: alert.message || 'Alert detected',
      timestamp: alert.createdAt || alert.timestamp || new Date(),
      source: alert.alertType === 'ml' ? 'ml' : 'system',
      confidence: 85, // Default confidence
      acknowledged: false,
      resolved: false
    }));

    res.render('alerts', { 
      alerts: transformedAlerts || [], 
      error: null,
      initialAlerts: transformedAlerts // Pass to frontend for initial render
    });
  } catch (err) {
    console.error('🔴 [alertsController] Error loading alerts:', err);
    res.render('alerts', { 
      alerts: [], 
      initialAlerts: [],
      error: 'Unable to load alerts at this time. Please try again later.' 
    });
  }
};
