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
    
    // Quality assessment
    let quality = 'low';
    if (imageSize > 50000) quality = 'high';
    else if (imageSize > 20000) quality = 'medium';
    
    // Simulate face detection with more realistic logic
    // In production, integrate with:
    // - AWS Rekognition
    // - Google Cloud Vision API
    // - Azure Computer Vision
    // - OpenCV with face detection models
    
    let hasFace = false;
    let confidence = 0;
    
    // More sophisticated face detection simulation
    if (quality === 'high' && imageSize > 30000) {
      // Higher quality images are more likely to contain faces
      hasFace = Math.random() > 0.7; // 30% chance for high quality
      confidence = hasFace ? Math.floor(Math.random() * 30 + 70) : 0; // 70-100% confidence
    } else if (quality === 'medium') {
      hasFace = Math.random() > 0.8; // 20% chance for medium quality
      confidence = hasFace ? Math.floor(Math.random() * 40 + 50) : 0; // 50-90% confidence
    } else {
      // Low quality images rarely contain detectable faces
      hasFace = Math.random() > 0.95; // 5% chance for low quality
      confidence = hasFace ? Math.floor(Math.random() * 50 + 30) : 0; // 30-80% confidence
    }
    
    const recommendations = [];
    if (!hasFace && quality === 'low') {
      recommendations.push('Image quality too low for reliable face detection');
    }
    if (hasFace && confidence < 70) {
      recommendations.push('Face detected but confidence is low - manual review recommended');
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
