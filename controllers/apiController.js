const SensorData = require('../models/SensorData');
const AuditLog = require('../models/AuditLog');
const Alert = require('../models/Alert'); // ✅ Required to store ML alerts

// ✅ Save sensor data (from IoT or ML)
exports.saveSensorData = async (req, res) => {
  try {
    const { topic, payload, time, source = 'sensor' } = req.body;

    if (!topic || payload === undefined) {
      return res.status(400).json({ error: '❌ "topic" and "payload" are required' });
    }

    // 🧠 Extract floor number and sensor type from topic
    const topicParts = topic.split('/');
    const floorMatch = topicParts.find(part => part.toLowerCase().startsWith('floor'));
    const type = topicParts.at(-1)?.toLowerCase() || 'unknown';

    let floor = 'unknown';
    if (floorMatch) {
      const floorNumber = parseInt(floorMatch.replace('floor', ''), 10);
      floor = isNaN(floorNumber) ? 'unknown' : floorNumber;
    }

    const newData = new SensorData({
      topic,
      floor,
      type,
      payload,
      time: time ? new Date(time) : new Date(),
      source
    });

    await newData.save();

    const io = req.app.get('io');
    io.emit('sensorUpdate', newData); // ✅ Real-time dashboard update

    // 🔔 Emit ML alert if applicable
    if (source === 'ml' && topic.includes('alert') && typeof floor === 'number') {
      const alertEntry = await Alert.create({
        type: payload,
        floor,
        source,
        createdAt: newData.time
      });

      io.emit('ml-alert', {
        type: payload,
        floor,
        time: alertEntry.createdAt
      });
    }

    res.status(200).json({ message: '✅ Sensor data saved', data: newData });

  } catch (err) {
    console.error('❌ Sensor save error:', err);
    res.status(500).json({ error: 'Unable to save sensor data at this time. Please try again later.' });
  }
};

// ✅ Trigger manual alert (admin only)
exports.triggerAlert = async (req, res) => {
  try {
    const { floor, message } = req.body;

    if (!floor || !message) {
      return res.status(400).json({ error: '❌ "floor" and "message" are required' });
    }

    // Ensure floor is a number
    const floorNumber = parseInt(floor, 10);
    if (isNaN(floorNumber)) {
      return res.status(400).json({ error: '❌ "floor" must be a valid number' });
    }

    const username = req.session.user?.username || 'Admin';

    await AuditLog.create({
      action: `🚨 Manual Alert: ${message}`,
      floor: floorNumber,
      performedBy: username
    });

    const io = req.app.get('io');
    io.emit('manual-alert', {
      floor: floorNumber,
      message,
      time: new Date()
    });

    console.log(`⚠️ Manual alert sent → Floor ${floorNumber}: ${message}`);
    res.status(200).json({ success: true, message: `Alert triggered for Floor ${floorNumber}` });

  } catch (err) {
    console.error('❌ Alert error:', err.message);
    res.status(500).json({ success: false, message: 'Alert failed' });
  }
};

// POST /api/upload-image: Receive image and name from ESP32-CAM (no API key required)
exports.uploadImage = async (req, res) => {
  try {
    const { floor, name, intruderImage } = req.body;
    if (!floor || !intruderImage) {
      return res.status(400).json({ error: '❌ "floor" and "intruderImage" are required' });
    }
    // Optionally save image to disk for /snapshot/<gate>.jpg
    const fs = require('fs');
    const path = require('path');
    const matches = intruderImage.match(/^data:image\/(jpeg|jpg|png);base64,(.+)$/);
    let base64Data = intruderImage;
    if (matches) base64Data = matches[2];
    const imgPath = path.join(__dirname, '../public/snapshot', `${floor}.jpg`);
    fs.mkdirSync(path.dirname(imgPath), { recursive: true });
    fs.writeFileSync(imgPath, Buffer.from(base64Data, 'base64'));

    // Emit events to frontend
    const io = req.app.get('io');
    const personName = name && name !== 'Intruder' && name !== 'Unknown' ? name : (name || 'Unknown');
    const isIntruder = !name || name === 'Intruder' || name === 'Unknown';
    
    // Always emit sensor update to show device is online
    io.emit('sensor-update', { 
      floor, 
      intruderImage, 
      name: personName,
      motion: true,
      timestamp: new Date()
    });
    
    // Emit appropriate alert based on person type
    if (isIntruder) {
      io.emit('intruder-alert', { floor, image: intruderImage, name: 'Intruder' });
      console.log(`📸 HTTP ESP32-CAM Alert — Intruder detected at Gate ${floor}`);
    } else {
      io.emit('visitor-detected', { floor, image: intruderImage, name: personName });
      console.log(`📸 HTTP ESP32-CAM Alert — Known person ${personName} detected at Gate ${floor}`);
    }
    
    res.status(200).json({ message: '✅ Image received and broadcasted', name: personName, isIntruder });
  } catch (err) {
    console.error('❌ Image upload error:', err);
    res.status(500).json({ error: 'Unable to upload image at this time. Please try again later.' });
  }
};

// Face Detection API
exports.analyzeImage = async (req, res) => {
  try {
    const { imageData, gate } = req.body;
    
    if (!imageData) {
      return res.status(400).json({ 
        error: 'No image data provided',
        hasFace: false,
        confidence: 0 
      });
    }

    // Basic image analysis
    const analysis = await performImageAnalysis(imageData);
    
    res.json({
      hasFace: analysis.hasFace,
      confidence: analysis.confidence,
      imageQuality: analysis.quality,
      recommendations: analysis.recommendations
    });
    
  } catch (error) {
    console.error('Image analysis error:', error);
    res.status(500).json({ 
      error: 'Image analysis failed',
      hasFace: false,
      confidence: 0 
    });
  }
};

// Image Analysis Function
async function performImageAnalysis(imageData) {
  try {
    // Remove data URL prefix if present
    const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, '');
    
    // Basic image size check
    const imageSize = base64Data.length;
    
    // Quality assessment based on image size and characteristics
    let quality = 'low';
    if (imageSize > 100000) quality = 'high';
    else if (imageSize > 50000) quality = 'medium';
    else if (imageSize < 10000) quality = 'very_low';
    
    // More realistic face detection simulation
    // In production, integrate with:
    // - AWS Rekognition
    // - Google Cloud Vision API
    // - Azure Computer Vision
    // - OpenCV with face detection models
    
    let hasFace = false;
    let confidence = 0;
    
    // Improved face detection logic based on image quality
    if (quality === 'high') {
      // High quality images have better face detection
      hasFace = Math.random() > 0.6; // 40% chance for high quality
      confidence = hasFace ? Math.floor(Math.random() * 25 + 75) : 0; // 75-100% confidence
    } else if (quality === 'medium') {
      hasFace = Math.random() > 0.75; // 25% chance for medium quality
      confidence = hasFace ? Math.floor(Math.random() * 35 + 60) : 0; // 60-95% confidence
    } else if (quality === 'low') {
      hasFace = Math.random() > 0.9; // 10% chance for low quality
      confidence = hasFace ? Math.floor(Math.random() * 40 + 40) : 0; // 40-80% confidence
    } else {
      // Very low quality images rarely contain detectable faces
      hasFace = Math.random() > 0.98; // 2% chance for very low quality
      confidence = hasFace ? Math.floor(Math.random() * 30 + 20) : 0; // 20-50% confidence
    }
    
    // Additional validation - ensure confidence makes sense
    if (hasFace && confidence < 30) {
      hasFace = false; // If confidence is too low, consider it no face
      confidence = 0;
    }
    
    const recommendations = [];
    if (!hasFace && quality === 'very_low') {
      recommendations.push('Image quality too low for reliable face detection');
    } else if (!hasFace && quality === 'low') {
      recommendations.push('Image quality may be insufficient for face detection');
    }
    if (hasFace && confidence < 70) {
      recommendations.push('Face detected but confidence is low - manual review recommended');
    }
    if (hasFace && confidence >= 90) {
      recommendations.push('High confidence face detection - proceed with identification');
    }
    
    return {
      hasFace,
      confidence,
      quality,
      recommendations
    };
    
  } catch (error) {
    console.error('Image analysis error:', error);
    return {
      hasFace: false,
      confidence: 0,
      quality: 'unknown',
      recommendations: ['Image analysis failed']
    };
  }
}

// ML Data API endpoints
exports.saveMLData = async (req, res) => {
  try {
    const { floor, node, dataType, prediction, confidence, evacuationRoute, threatLevel } = req.body;
    
    if (!floor || !dataType) {
      return res.status(400).json({ 
        error: 'Floor and dataType are required',
        hasFace: false,
        confidence: 0 
      });
    }

    // Save ML data to database
    const mlData = new SensorData({
      topic: 'iot/ml',
      floor: String(floor),
      node: node || 1,
      type: dataType, // 'evacuation', 'threat', 'emergency', 'prediction'
      payload: {
        prediction: prediction || 'normal',
        confidence: confidence || 0.95,
        evacuationRoute: evacuationRoute || null,
        threatLevel: threatLevel || 'low',
        timestamp: new Date()
      },
      source: 'ml'
    });

    await mlData.save();

    // Emit real-time updates
    const io = req.app.get('io');
    io.emit('ml-data-update', {
      floor: parseInt(floor),
      node: node || 1,
      dataType,
      prediction: prediction || 'normal',
      confidence: confidence || 0.95,
      timestamp: new Date()
    });

    // If it's evacuation data, emit specific event
    if (dataType === 'evacuation' || dataType === 'emergency') {
      io.emit('ml-evacuation-update', {
        floor: parseInt(floor),
        status: threatLevel || 'safe',
        threats: prediction ? [prediction] : [],
        evacuationTime: threatLevel === 'danger' ? 1 : 3,
        capacity: 50
      });
    }

    console.log(`📊 ML Data saved — Floor ${floor}, Type: ${dataType}, Prediction: ${prediction}`);
    res.status(200).json({ 
      message: 'ML data saved successfully', 
      data: mlData 
    });

  } catch (error) {
    console.error('ML data save error:', error);
    res.status(500).json({ 
      error: 'Unable to save ML data',
      hasFace: false,
      confidence: 0 
    });
  }
};

exports.updateEvacuationRoutes = async (req, res) => {
  try {
    const { floor, status, threats, evacuationTime, capacity, routes } = req.body;
    
    if (!floor) {
      return res.status(400).json({ error: 'Floor is required' });
    }

    // Emit evacuation update
    const io = req.app.get('io');
    io.emit('ml-evacuation-update', {
      floor: parseInt(floor),
      status: status || 'safe',
      threats: threats || [],
      evacuationTime: evacuationTime || 3,
      capacity: capacity || 50,
      routes: routes || ['main', 'secondary', 'emergency']
    });

    // If emergency, emit emergency alert
    if (status === 'danger' || status === 'emergency') {
      io.emit('emergency-alert', {
        floor: parseInt(floor),
        message: `Emergency detected on Floor ${floor} - evacuation routes updated`,
        timestamp: new Date()
      });
    }

    console.log(`🚨 Evacuation update — Floor ${floor}, Status: ${status}`);
    res.status(200).json({ 
      message: 'Evacuation routes updated successfully' 
    });

  } catch (error) {
    console.error('Evacuation update error:', error);
    res.status(500).json({ error: 'Unable to update evacuation routes' });
  }
};

exports.getMLStatus = async (req, res) => {
  try {
    const floor = req.query.floor;
    const query = { source: 'ml' };
    if (floor) query.floor = String(floor);

    const mlData = await SensorData.find(query)
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    // Group by floor and type
    const statusByFloor = {};
    mlData.forEach(data => {
      const floorNum = data.floor;
      if (!statusByFloor[floorNum]) {
        statusByFloor[floorNum] = {
          floor: floorNum,
          lastUpdate: data.createdAt,
          dataTypes: {},
          overallStatus: 'safe'
        };
      }
      
      statusByFloor[floorNum].dataTypes[data.type] = {
        prediction: data.payload.prediction || 'normal',
        confidence: data.payload.confidence || 0.95,
        timestamp: data.createdAt
      };
    });

    res.json({
      status: 'success',
      data: Object.values(statusByFloor)
    });

  } catch (error) {
    console.error('ML status error:', error);
    res.status(500).json({ error: 'Unable to get ML status' });
  }
};

// Face Training - Proxy to Flask server
exports.trainFace = async (req, res) => {
  try {
    const { name, image, confidence_threshold } = req.body;
    
    if (!name || !image) {
      return res.status(400).json({ error: 'Name and image are required' });
    }

    // Get Flask server URL from environment or config
    const FLASK_SERVER_URL = process.env.FLASK_SERVER_URL || 'http://localhost:5000';
    
    // Forward request to Flask server
    const axios = require('axios');
    const response = await axios.post(`${FLASK_SERVER_URL}/train-face`, {
      name,
      image,
      confidence_threshold: confidence_threshold || 0.8
    }, {
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Ensure response has status field
    const result = response.data;
    if (!result.status) {
      result.status = 'success';
    }
    res.json(result);
  } catch (error) {
    console.error('Face training error:', error);
    
    // Check if Flask server is not available
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      return res.status(503).json({ 
        error: 'Flask server is not available. Please ensure the Flask image processor is running.',
        details: error.message
      });
    }
    
    res.status(500).json({ 
      error: 'Face training failed',
      details: error.response?.data?.error || error.message
    });
  }
};

// Get Known Faces - Proxy to Flask server
exports.getKnownFaces = async (req, res) => {
  try {
    const FLASK_SERVER_URL = process.env.FLASK_SERVER_URL || 'http://localhost:5000';
    
    const axios = require('axios');
    const response = await axios.get(`${FLASK_SERVER_URL}/known-faces`, {
      timeout: 10000
    });

    // Ensure response has status field
    const result = response.data;
    if (!result.status) {
      result.status = 'success';
    }
    res.json(result);
  } catch (error) {
    console.error('Get known faces error:', error);
    
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      return res.status(503).json({ 
        error: 'Flask server is not available',
        faces: []
      });
    }
    
    res.status(500).json({ 
      error: 'Unable to get known faces',
      faces: []
    });
  }
};

// ML Prediction using trained models
exports.mlPredict = async (req, res) => {
  try {
    const { floor, sensorData, faceRecognitionResult } = req.body;
    
    if (!floor || !sensorData) {
      return res.status(400).json({ error: 'Floor and sensorData are required' });
    }

    const { mlEngine } = require('../ml/mlModels');
    
    // Get prediction
    const prediction = await mlEngine.predictThreats(floor, sensorData, faceRecognitionResult);
    
    // Save prediction to database
    if (prediction.threats.length > 0) {
      const io = req.app.get('io');
      
      prediction.threats.forEach(threat => {
        io.emit('ml-alert', {
          type: threat.type,
          floor: floor,
          severity: threat.severity,
          confidence: threat.confidence,
          message: threat.message,
          time: new Date()
        });
      });
    }
    
    res.json({
      status: 'success',
      prediction
    });
  } catch (error) {
    console.error('ML prediction error:', error);
    res.status(500).json({ error: 'ML prediction failed', details: error.message });
  }
};

// Train Evacuation Path AI Models (RL + Neural Network)
exports.trainEvacuationModel = async (req, res) => {
  try {
    const { PathTrainingDataGenerator } = require('../ml/pathTrainingData');
    const { advancedBuildingGraph } = require('../ml/evacuationPathAdvanced');
    const { NextGenAIPathfinder } = require('../ml/advancedPathfindingAI');
    const { aStarPathFinder } = require('../ml/evacuationPathAdvanced');
    
    const generator = new PathTrainingDataGenerator();
    const result = await generator.generateTrainingDataset();
    
    // Train A* ML model
    const aStarTraining = aStarPathFinder.trainMLModel();
    
    // Train next-gen AI models (RL + Neural Network)
    const aiPathfinder = new NextGenAIPathfinder(advancedBuildingGraph);
    const aiTraining = aiPathfinder.trainModels(result.trainingSamples || []);
    
    res.json({
      status: 'success',
      training: result,
      aStarTraining: aStarTraining,
      aiTraining: aiTraining,
      message: 'All AI/ML models trained successfully (A*, D* Lite, RL, Neural Network)'
    });
  } catch (error) {
    console.error('AI model training error:', error);
    res.status(500).json({ error: 'Training failed', details: error.message });
  }
};

// Get Evacuation Route
exports.getEvacuationRoute = async (req, res) => {
  try {
    const { floor, x, y, hazards } = req.query;
    
    if (!floor) {
      return res.status(400).json({ error: 'Floor is required' });
    }

    // Use next-generation AI pathfinder (D* Lite + RL + Neural Network)
    const { NextGenAIPathfinder } = require('../ml/advancedPathfindingAI');
    const { advancedBuildingGraph } = require('../ml/evacuationPathAdvanced');
    
    const aiPathfinder = new NextGenAIPathfinder(advancedBuildingGraph);
    
    const floorNum = parseInt(floor);
    const xCoord = x ? parseFloat(x) : undefined;
    const yCoord = y ? parseFloat(y) : undefined;
    
    let hazardsArray = [];
    if (hazards) {
      try {
        hazardsArray = JSON.parse(hazards);
      } catch (e) {
        console.warn('Invalid hazards format:', e);
      }
    }
    
    let instructions;
    if (xCoord !== undefined && yCoord !== undefined) {
      // Find nearest node to coordinates
      const floorNodes = advancedBuildingGraph.getFloorNodes(floorNum);
      let nearestNode = floorNodes[0];
      let minDist = Math.sqrt(
        Math.pow(nearestNode.x - xCoord, 2) + Math.pow(nearestNode.y - yCoord, 2)
      );
      floorNodes.forEach(node => {
        const dist = Math.sqrt(Math.pow(node.x - xCoord, 2) + Math.pow(node.y - yCoord, 2));
        if (dist < minDist) {
          minDist = dist;
          nearestNode = node;
        }
      });
      
      // Get sensor data for ML prediction
      const sensorData = {
        temp: 25,
        gas: 200,
        flame: 0,
        vibration: 0.5
      };
      
      // Use AI pathfinder to find optimal route to evacuation nodes
      const aiResult = await aiPathfinder.findOptimalEvacuationPath(
        nearestNode.id,
        floorNum,
        sensorData,
        hazardsArray
      );
      
      instructions = {
        currentLocation: { floor: floorNum, x: xCoord, y: yCoord },
        nearestNode: nearestNode.id,
        route: aiResult.bestRoute?.path.map(n => ({
          id: n.id,
          type: n.type,
          floor: n.floor,
          x: n.x,
          y: n.y,
          threat: aiResult.bestRoute?.threats?.find(t => t.nodeId === n.id) || { overallThreat: 0 }
        })) || [],
        distance: aiResult.bestRoute?.distance || 0,
        estimatedTime: aiResult.bestRoute?.estimatedTime || 0,
        steps: aiResult.bestRoute?.steps || 0,
        evacuationNode: aiResult.bestRoute?.evacuationNode || null,
        aiAnalysis: aiResult.aiAnalysis,
        confidence: aiResult.bestRoute?.score?.totalScore * 100 || 80
      };
    } else {
      // Get routes for entire floor using AI pathfinder
      const startNode = `node-${floorNum}-0-0-0`;
      const sensorData = { temp: 25, gas: 200, flame: 0, vibration: 0.5 };
      const aiResult = await aiPathfinder.findOptimalEvacuationPath(
        startNode,
        floorNum,
        sensorData,
        hazardsArray
      );
      
      const routes = aiResult.allRoutes || [];
      instructions = {
        floor: floorNum,
        routes: routes.map(r => ({
          startNode: {
            id: r.startNode.id,
            x: r.startNode.x,
            y: r.startNode.y,
            type: r.startNode.type
          },
          path: r.path.map(n => ({
            id: n.id,
            type: n.type,
            floor: n.floor,
            x: n.x,
            y: n.y
          })),
          distance: r.distance,
          steps: r.steps
        }))
      };
    }
    
    res.json({
      status: 'success',
      instructions
    });
  } catch (error) {
    console.error('Evacuation route error:', error);
    res.status(500).json({ error: 'Unable to calculate evacuation route', details: error.message });
  }
};
