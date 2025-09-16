# ESP32-CAM Integration Guide

## Overview
This guide explains how to integrate ESP32-CAM with the Flask image processor and main website.

## Architecture

```
ESP32-CAM → Flask Server → Main Website → Frontend
     ↓           ↓              ↓           ↓
  HTTP POST   Image Proc.   Socket.IO   Real-time UI
```

## ESP32-CAM Code (Arduino)

```cpp
#include "esp_camera.h"
#include <WiFi.h>
#include <HTTPClient.h>
#include <base64.h>

// WiFi credentials
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// Flask server URL
const char* flask_server = "http://YOUR_FLASK_SERVER:5000/process-image";

// Camera configuration
#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    33
#define XCLK_GPIO_NUM      0
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27
#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM        5
#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22

void setup() {
  Serial.begin(115200);
  
  // Initialize camera
  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;
  config.pin_d0 = Y2_GPIO_NUM;
  config.pin_d1 = Y3_GPIO_NUM;
  config.pin_d2 = Y4_GPIO_NUM;
  config.pin_d3 = Y5_GPIO_NUM;
  config.pin_d4 = Y6_GPIO_NUM;
  config.pin_d5 = Y7_GPIO_NUM;
  config.pin_d6 = Y8_GPIO_NUM;
  config.pin_d7 = Y9_GPIO_NUM;
  config.pin_xclk = XCLK_GPIO_NUM;
  config.pin_pclk = PCLK_GPIO_NUM;
  config.pin_vsync = VSYNC_GPIO_NUM;
  config.pin_href = HREF_GPIO_NUM;
  config.pin_sscb_sda = SIOD_GPIO_NUM;
  config.pin_sscb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;
  
  // Frame size and quality
  if(psramFound()){
    config.frame_size = FRAMESIZE_UXGA;
    config.jpeg_quality = 10;
    config.fb_count = 2;
  } else {
    config.frame_size = FRAMESIZE_SVGA;
    config.jpeg_quality = 12;
    config.fb_count = 1;
  }

  // Initialize camera
  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("Camera init failed with error 0x%x", err);
    return;
  }

  // Connect to WiFi
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.println("Connecting to WiFi...");
  }
  Serial.println("WiFi connected!");
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());
}

void loop() {
  // Capture image
  camera_fb_t * fb = esp_camera_fb_get();
  if (!fb) {
    Serial.println("Camera capture failed");
    return;
  }

  // Convert to base64
  String imageBase64 = base64::encode(fb->buf, fb->len);
  String imageData = "data:image/jpeg;base64," + imageBase64;

  // Send to Flask server
  sendImageToFlask(imageData, 1); // Gate 1

  // Free memory
  esp_camera_fb_return(fb);
  
  // Wait before next capture
  delay(5000); // 5 seconds
}

void sendImageToFlask(String imageData, int gateNumber) {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(flask_server);
    http.addHeader("Content-Type", "application/json");
    
    // Create JSON payload
    String jsonPayload = "{";
    jsonPayload += "\"image\":\"" + imageData + "\",";
    jsonPayload += "\"gate\":" + String(gateNumber) + ",";
    jsonPayload += "\"floor\":" + String(gateNumber);
    jsonPayload += "}";
    
    int httpResponseCode = http.POST(jsonPayload);
    
    if (httpResponseCode > 0) {
      String response = http.getString();
      Serial.println("Response: " + response);
    } else {
      Serial.println("Error sending image: " + String(httpResponseCode));
    }
    
    http.end();
  }
}
```

## Flask Server Deployment

### Local Development
```bash
cd Website
pip install -r requirements_flask.txt
python flask_image_processor.py
```

### Production Deployment (Render.com)
1. Create new Web Service on Render
2. Connect your GitHub repository
3. Set build command: `pip install -r requirements_flask.txt`
4. Set start command: `gunicorn --bind 0.0.0.0:$PORT --workers 4 flask_image_processor:app`
5. Set environment variables:
   - `MAIN_WEBSITE_URL`: https://smart-building-7906.onrender.com
   - `FLASK_PORT`: $PORT

### Docker Deployment
```bash
# Build Docker image
docker build -f Dockerfile.flask -t flask-image-processor .

# Run container
docker run -p 5000:5000 -e MAIN_WEBSITE_URL=https://smart-building-7906.onrender.com flask-image-processor
```

## API Endpoints

### Flask Server Endpoints

1. **POST /process-image**
   - Processes ESP32-CAM images
   - Returns face detection and analysis
   - Forwards results to main website

2. **POST /ml-data**
   - Receives ML data from your friend's system
   - Forwards to main website ML endpoint

3. **POST /evacuation-update**
   - Updates evacuation routes
   - Forwards to main website evacuation endpoint

4. **GET /health**
   - Health check endpoint

### Main Website Endpoints

1. **POST /api/upload-image**
   - Receives processed image data from Flask server
   - Updates frontend in real-time

2. **POST /api/ml-data**
   - Receives ML data from Flask server
   - Updates evacuation routes and alerts

3. **POST /api/evacuation-update**
   - Updates evacuation routes
   - Triggers emergency alerts

## Data Flow

### ESP32-CAM Image Processing
```
ESP32-CAM captures image
    ↓
Converts to base64
    ↓
Sends HTTP POST to Flask server
    ↓
Flask processes image (OpenCV)
    ↓
Detects faces and identifies person
    ↓
Sends results to main website
    ↓
Main website updates frontend via Socket.IO
    ↓
User sees real-time updates
```

### ML Data Processing
```
Friend's ML system analyzes data
    ↓
Sends HTTP POST to Flask server
    ↓
Flask forwards to main website
    ↓
Main website updates evacuation routes
    ↓
Frontend shows updated routes
```

## Configuration

### Environment Variables
- `MAIN_WEBSITE_URL`: URL of your main website
- `FLASK_PORT`: Port for Flask server (default: 5000)
- `FLASK_DEBUG`: Debug mode (true/false)

### ESP32-CAM Settings
- Update `flask_server` URL in Arduino code
- Set correct WiFi credentials
- Adjust camera quality and frame size as needed

## Performance Optimization

1. **Image Quality**: Balance between quality and processing speed
2. **Frame Rate**: Adjust capture interval based on needs
3. **Flask Workers**: Use multiple workers for concurrent processing
4. **Caching**: Cache known faces for faster recognition
5. **Compression**: Use appropriate JPEG quality settings

## Troubleshooting

### Common Issues
1. **Camera not initializing**: Check GPIO connections
2. **WiFi connection failed**: Verify credentials and signal strength
3. **Flask server timeout**: Increase timeout settings
4. **Image processing errors**: Check image format and size

### Debug Mode
Enable debug mode to see detailed logs:
```bash
export FLASK_DEBUG=true
python flask_image_processor.py
```

## Security Considerations

1. **HTTPS**: Use HTTPS in production
2. **Authentication**: Add API keys if needed
3. **Rate Limiting**: Implement rate limiting for API endpoints
4. **Input Validation**: Validate all incoming data
5. **Error Handling**: Don't expose sensitive information in errors
