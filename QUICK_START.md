# 🚀 Quick Start Guide

## Installation

### 1. Install Node.js Dependencies
```bash
cd Website
npm install
```

This will install all required packages including:
- express, mongoose, socket.io, mqtt
- axios (for Flask server communication)
- All other dependencies

### 2. Install Python Dependencies (for Flask)
```bash
pip install flask opencv-python numpy requests
```

### 3. Environment Setup
Create a `.env` file in the Website directory:
```env
MONGODB_URI=your_mongodb_connection_string
SESSION_SECRET=your_session_secret
MQTT_BROKER_URL=mqtt://your_mqtt_broker:1883
FLASK_SERVER_URL=http://localhost:5000
MAIN_WEBSITE_URL=https://smart-building-7906.onrender.com
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
```

## Running the System

### Option 1: Run Both Servers Separately

**Terminal 1 - Flask Server:**
```bash
cd Website
python flask_image_processor.py
```

**Terminal 2 - Node.js Server:**
```bash
cd Website
npm start
```

### Option 2: Use Batch Scripts (Windows)
```bash
start_complete_system.bat
```

## Testing Features

### 1. Face Training
1. Navigate to: `http://localhost:3000/face-training`
2. Click "Start Camera"
3. Capture a photo
4. Enter person name
5. Click "Train Face"
6. ✅ Should work without "failed to fetch" error

### 2. ML Alerts
1. Navigate to: `http://localhost:3000/alerts`
2. View real-time ML predictions
3. Alerts are generated automatically from sensor data
4. Filter by type (AI, ML, Critical, etc.)

### 3. Evacuation Routes
1. Navigate to: `http://localhost:3000/evacuation`
2. View optimal evacuation paths for each floor
3. Routes are calculated using Dijkstra's algorithm
4. Hazards are automatically avoided

### 4. Dashboard
1. Navigate to: `http://localhost:3000/dashboard`
2. View real-time sensor data
3. Gas readings should show values (not N/A)
4. All 4 flame sensor nodes per floor displayed

### 5. Charts
1. Navigate to: `http://localhost:3000/charts`
2. View historical data visualization
3. Charts work even with non-continuous data
4. Real-time updates via Socket.IO

### 6. Live Monitoring
1. Navigate to: `http://localhost:3000/live`
2. View ESP32-CAM feeds
3. Gates show online/offline status correctly
4. Face recognition shows known person names

## API Testing

### Test Face Training API
```bash
curl -X POST http://localhost:3000/api/train-face \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Person",
    "image": "data:image/jpeg;base64,...",
    "confidence_threshold": 0.8
  }'
```

### Test ML Prediction
```bash
curl -X POST http://localhost:3000/api/ml-predict \
  -H "Content-Type: application/json" \
  -d '{
    "floor": 1,
    "sensorData": {
      "temp": 45,
      "gas": 350,
      "flame": 0
    }
  }'
```

### Test Evacuation Route
```bash
curl "http://localhost:3000/api/evacuation-route?floor=1&x=8&y=7"
```

## Troubleshooting

### Face Training Still Shows "Failed to Fetch"
1. Check if Flask server is running: `http://localhost:5000/health`
2. Verify `FLASK_SERVER_URL` in environment
3. Check Node.js server logs for proxy errors

### ML Alerts Not Showing
1. Ensure sensor data is being received via MQTT
2. Check browser console for errors
3. Verify Socket.IO connection

### Gas Readings Still Show N/A
1. Check if gas sensor data is being sent via MQTT
2. Verify database has gas sensor entries
3. Check dashboard page source for data

### Charts Not Loading
1. Check browser console for JavaScript errors
2. Verify Socket.IO connection
3. Check if sensor data exists in database

## Production Deployment

### Render.com Setup
1. Set environment variables in Render dashboard
2. Deploy Node.js app
3. Deploy Flask app separately (or use Render's Python service)
4. Update `FLASK_SERVER_URL` to production URL

### MongoDB Atlas
1. Create cluster
2. Get connection string
3. Add to `MONGODB_URI` environment variable

### MQTT Broker
1. Use cloud MQTT broker (HiveMQ, Mosquitto Cloud, etc.)
2. Update `MQTT_BROKER_URL` environment variable

## Support

For issues or questions:
1. Check `ML_FEATURES.md` for ML documentation
2. Check `UPGRADE_SUMMARY.md` for all changes
3. Review server logs for errors
4. Check browser console for frontend errors

---

**System Version**: 2.0.0
**Last Updated**: 2025

