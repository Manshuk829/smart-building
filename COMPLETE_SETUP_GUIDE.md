# 🏢 Smart Building Security System - Complete Setup Guide

## 🎯 Overview

This is a comprehensive smart building security system that includes:
- **ESP32-CAM Integration** with HTTP image processing
- **Face Recognition & Training** system
- **ML Data Processing** for 4 floors with 4 nodes each
- **Evacuation Route Management** with real-time updates
- **Real-time Monitoring** with Socket.IO
- **Docker Support** for easy deployment

## 🚀 Quick Start

### Windows Users
```bash
# Run the setup script
setup_complete_system.bat
```

### Linux/Mac Users
```bash
# Make script executable and run
chmod +x setup_complete_system.sh
./setup_complete_system.sh
```

## 📋 System Architecture

```
ESP32-CAMs → Flask Server → Node.js Backend → Frontend
     ↓              ↓              ↓           ↓
  HTTP Images → Face Detection → Socket.IO → Real-time UI
     ↓              ↓              ↓           ↓
  Motion Data → ML Processing → Database → Charts/Reports
```

## 🔧 Components

### 1. Main Website (Node.js/Express)
- **Port**: 3000
- **Features**: Dashboard, Live monitoring, Charts, Alerts
- **Database**: MongoDB
- **Real-time**: Socket.IO

### 2. Flask Image Processor
- **Port**: 5000
- **Features**: Face detection, Face recognition, Image analysis
- **Libraries**: OpenCV, face-recognition, dlib

### 3. ESP32-CAM Integration
- **Protocol**: HTTP
- **Endpoints**: `/capture` for images
- **Processing**: Flask server handles all image processing

## 📁 File Structure

```
Website/
├── 🚀 Main Application
│   ├── server.js              # Main server entry point
│   ├── app.js                 # Express app configuration
│   ├── package.json           # Node.js dependencies
│   └── config.js              # Configuration settings
│
├── 🎮 Controllers & API
│   ├── controllers/
│   │   ├── apiController.js   # API endpoints (updated with ML data)
│   │   └── pageController.js  # Page controllers (updated with evacuation)
│   └── routes/
│       ├── apiRoutes.js       # API routes (updated with ML endpoints)
│       └── pageRoutes.js      # Page routes (updated with evacuation page)
│
├── 🎨 Frontend
│   ├── views/
│   │   ├── live.ejs           # Live monitoring page
│   │   ├── evacuation.ejs     # Evacuation routes page (NEW)
│   │   ├── face_training.ejs  # Face training interface (NEW)
│   │   └── partials/navbar.ejs # Navigation (updated)
│   └── public/js/
│       ├── live.js            # Live monitoring JavaScript (updated)
│       └── charts.js          # Charts JavaScript (updated)
│
├── 🐍 Flask Server
│   ├── flask_image_processor.py # Main Flask server (ENHANCED)
│   ├── requirements_flask.txt   # Python dependencies (updated)
│   ├── Dockerfile.flask         # Docker configuration
│   └── deploy_flask.sh          # Deployment script
│
├── 📡 MQTT & Data
│   └── mqtt/
│       └── mqttController.js   # MQTT handling (updated for ESP32-CAM)
│
├── 🐳 Docker & Deployment
│   ├── docker-compose.yml      # Docker Compose (NEW)
│   ├── setup_complete_system.sh # Linux/Mac setup script (NEW)
│   └── setup_complete_system.bat # Windows setup script (NEW)
│
└── 📚 Documentation
    ├── ESP32_CAM_Integration.md # ESP32-CAM integration guide
    └── COMPLETE_SETUP_GUIDE.md  # This file
```

## 🔧 Installation Steps

### Step 1: Prerequisites
- **Node.js** 16+ (https://nodejs.org/)
- **Python** 3.8+ (https://python.org/)
- **MongoDB** (https://mongodb.com/)
- **Docker** (optional, for containerized deployment)

### Step 2: Clone/Download Files
All files are already in your `Website` directory.

### Step 3: Run Setup Script
Choose your platform:

**Windows:**
```cmd
setup_complete_system.bat
```

**Linux/Mac:**
```bash
chmod +x setup_complete_system.sh
./setup_complete_system.sh
```

### Step 4: Configure Environment
Edit the `.env` file with your settings:
```env
# ESP32-CAM IP addresses
ESP32_CAM_GATE_1_URL=http://192.168.1.100/capture
ESP32_CAM_GATE_2_URL=http://192.168.1.101/capture
ESP32_CAM_GATE_3_URL=http://192.168.1.102/capture
ESP32_CAM_GATE_4_URL=http://192.168.1.103/capture

# Flask Server
FLASK_SERVER_URL=http://localhost:5000
MAIN_WEBSITE_URL=http://localhost:3000

# Database
MONGODB_URI=mongodb://localhost:27017/smart_building
```

## 🚀 Running the System

### Option 1: Manual Start
```bash
# Terminal 1 - Main Website
npm start

# Terminal 2 - Flask Server
python flask_image_processor.py
```

### Option 2: Using Scripts
```bash
# Windows
start_website.bat
start_flask.bat

# Linux/Mac
./start_website.sh
./start_flask.sh
```

### Option 3: Docker (Recommended)
```bash
docker-compose up -d
```

## 🌐 Access Points

- **Main Website**: http://localhost:3000
- **Flask Server**: http://localhost:5000
- **Face Training**: http://localhost:3000/face-training
- **Evacuation Routes**: http://localhost:3000/evacuation
- **Live Monitoring**: http://localhost:3000/live

## 🎯 Key Features

### 1. ESP32-CAM Integration
- **HTTP-based** image capture
- **Real-time** face detection
- **Automatic** intruder detection
- **Known person** recognition

### 2. Face Training System
- **Web-based** training interface
- **Multiple** face encodings per person
- **Confidence** threshold adjustment
- **Real-time** training feedback

### 3. ML Data Processing
- **4 floors** with 4 nodes each
- **Real-time** evacuation route updates
- **Threat level** assessment
- **Emergency** response system

### 4. Evacuation Management
- **Visual** floor plans
- **Real-time** status updates
- **AI confidence** based on data quality
- **Emergency** route optimization

## 🔌 API Endpoints

### Main Website APIs
```
POST /api/upload-image          # ESP32-CAM image upload
POST /api/ml-data              # ML data from friend's system
POST /api/evacuation-update    # Evacuation route updates
GET  /api/ml-status           # ML system status
```

### Flask Server APIs
```
POST /process-image            # Image processing
POST /train-face              # Face training
GET  /known-faces             # List known faces
POST /ml-data                 # ML data processing
POST /evacuation-update       # Evacuation updates
```

## 📱 Pages & Features

### 1. Dashboard (`/dashboard`)
- System overview
- Real-time statistics
- Quick access to all features

### 2. Live Monitoring (`/live`)
- **ESP32-CAM feeds** with status indicators
- **Face recognition** accuracy (0% when offline)
- **Real-time** intruder detection
- **AI analytics** with proper data validation

### 3. Face Training (`/face-training`)
- **Camera interface** for training
- **Person management** system
- **Confidence threshold** adjustment
- **Training progress** tracking

### 4. Evacuation Routes (`/evacuation`)
- **4-floor** building visualization
- **Real-time** threat assessment
- **AI confidence** based on data coverage
- **Emergency** route optimization

### 5. Charts (`/charts`)
- **Data validation** and sample data generation
- **Interactive** charts with zoom
- **Historical** data analysis
- **Export** functionality

## 🔧 Configuration

### ESP32-CAM Setup
1. **Flash** the provided Arduino code
2. **Configure** WiFi credentials
3. **Set** IP addresses in `.env`
4. **Test** camera feeds

### ML Data Integration
Your friend's system should send data to:
```
POST http://localhost:5000/ml-data
Content-Type: application/json

{
  "floor": 1,
  "node": 1,
  "dataType": "evacuation",
  "prediction": "fire_detected",
  "confidence": 0.95,
  "threatLevel": "high"
}
```

### Face Training Process
1. **Access** `/face-training` page
2. **Start** camera
3. **Capture** photos of authorized personnel
4. **Train** faces with names
5. **Set** confidence thresholds
6. **Test** recognition system

## 🐳 Docker Deployment

### Build and Run
```bash
# Build Flask image
docker build -f Dockerfile.flask -t smart-building-flask .

# Run with Docker Compose
docker-compose up -d

# Check status
docker-compose ps
```

### Environment Variables
```env
MAIN_WEBSITE_URL=http://host.docker.internal:3000
FLASK_ENV=production
```

## 🔍 Troubleshooting

### Common Issues

1. **ESP32-CAM shows offline**
   - Check IP addresses in `.env`
   - Verify network connectivity
   - Test camera URLs manually

2. **Face recognition not working**
   - Ensure Flask server is running
   - Check face training data
   - Verify confidence thresholds

3. **Charts not displaying**
   - Check data validation
   - Verify sample data generation
   - Clear browser cache

4. **ML data not updating**
   - Check API endpoints
   - Verify data format
   - Check Socket.IO connections

### Logs
```bash
# Main website logs
npm start

# Flask server logs
python flask_image_processor.py

# Docker logs
docker-compose logs -f
```

## 📊 Performance Optimization

### Flask Server
- **Multi-threading** for concurrent requests
- **Image caching** for faster processing
- **Face encoding** optimization
- **Memory management** for large datasets

### Main Website
- **Socket.IO** connection pooling
- **Database** indexing
- **Image** compression
- **Caching** strategies

## 🔒 Security Considerations

1. **Change** default secrets in `.env`
2. **Use** HTTPS in production
3. **Implement** proper authentication
4. **Secure** ESP32-CAM endpoints
5. **Validate** all input data
6. **Monitor** system logs

## 🚀 Production Deployment

### Environment Setup
```env
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb://your-production-db
JWT_SECRET=your-secure-secret
```

### Process Management
```bash
# Using PM2
npm install -g pm2
pm2 start server.js --name "smart-building"
pm2 start flask_image_processor.py --name "flask-server"
```

### Reverse Proxy (Nginx)
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 📞 Support

For issues or questions:
1. Check the troubleshooting section
2. Review the logs
3. Verify configuration
4. Test individual components

## 🎉 Success!

Your Smart Building Security System is now ready! The system includes:

✅ **ESP32-CAM Integration** with proper status detection  
✅ **Face Recognition** with training system  
✅ **ML Data Processing** for 4 floors/nodes  
✅ **Evacuation Routes** with real-time updates  
✅ **AI Accuracy** based on actual data quality  
✅ **Docker Support** for easy deployment  
✅ **Complete Documentation** and setup scripts  

**Happy monitoring! Your smart building is now secure!** 🏢🔒
