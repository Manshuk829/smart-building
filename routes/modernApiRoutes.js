/**
 * Modern API Routes
 * GraphQL, Real-Time ML, Edge AI endpoints
 */

const express = require('express');
const router = express.Router();
const { schema } = require('../services/graphQLService');
// Note: For GraphQL, use Apollo Server or express-graphql
// For now, we'll provide a REST endpoint that can be upgraded to GraphQL

// Real-Time ML Processing
router.post('/ml/realtime-predict', async (req, res) => {
  try {
    const realTimeML = req.app.get('realTimeML');
    if (!realTimeML) {
      return res.status(503).json({ error: 'Real-Time ML service not available' });
    }

    const { data } = req.body;
    const prediction = await realTimeML.processStream(data);
    
    res.json({
      status: 'success',
      prediction,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Real-time ML prediction error:', error);
    res.status(500).json({ error: 'Prediction failed', details: error.message });
  }
});

// Edge AI Processing
router.post('/edge-ai/process', async (req, res) => {
  try {
    const edgeAI = req.app.get('edgeAI');
    if (!edgeAI) {
      return res.status(503).json({ error: 'Edge AI service not available' });
    }

    const { data, modelType } = req.body;
    const result = await edgeAI.processAtEdge(data, modelType || 'threat-detection');
    
    res.json({
      status: 'success',
      result,
      processedAt: 'edge',
      latency: result.latency
    });
  } catch (error) {
    console.error('Edge AI processing error:', error);
    res.status(500).json({ error: 'Edge processing failed', details: error.message });
  }
});

// Real-Time Analytics
router.get('/analytics/realtime', (req, res) => {
  try {
    const analytics = req.app.get('realTimeAnalytics');
    if (!analytics) {
      return res.status(503).json({ error: 'Analytics service not available' });
    }

    const metrics = analytics.getMetrics();
    res.json({
      status: 'success',
      metrics,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Analytics failed', details: error.message });
  }
});

// Streaming Service Stats
router.get('/streaming/stats', (req, res) => {
  try {
    const streaming = req.app.get('streamingService');
    if (!streaming) {
      return res.status(503).json({ error: 'Streaming service not available' });
    }

    const stats = streaming.getStats();
    res.json({
      status: 'success',
      stats,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Streaming stats error:', error);
    res.status(500).json({ error: 'Stats failed', details: error.message });
  }
});

// Edge AI Statistics
router.get('/edge-ai/stats', (req, res) => {
  try {
    const edgeAI = req.app.get('edgeAI');
    if (!edgeAI) {
      return res.status(503).json({ error: 'Edge AI service not available' });
    }

    const stats = edgeAI.getStats();
    res.json({
      status: 'success',
      stats,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Edge AI stats error:', error);
    res.status(500).json({ error: 'Stats failed', details: error.message });
  }
});

module.exports = router;

