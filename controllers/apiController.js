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
    io.emit('sensor-update', { floor, intruderImage, name: name || 'Unknown' });
    io.emit('intruder-alert', { floor, image: intruderImage, name: name || 'Unknown' });
    console.log(`📸 HTTP ESP32-CAM Alert — ${name || 'Unknown'} at Gate ${floor}`);
    res.status(200).json({ message: '✅ Image received and broadcasted' });
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
