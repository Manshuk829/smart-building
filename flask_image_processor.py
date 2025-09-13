#!/usr/bin/env python3
"""
Flask Image Processing Server for ESP32-CAM
Handles real-time image processing and sends results to main website
"""

from flask import Flask, request, jsonify
import cv2
import numpy as np
import base64
import requests
import json
import time
import logging
from datetime import datetime
import os
from werkzeug.utils import secure_filename

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

# Configuration
MAIN_WEBSITE_URL = os.getenv('MAIN_WEBSITE_URL', 'http://localhost:3000')
API_ENDPOINT = f"{MAIN_WEBSITE_URL}/api/upload-image"
ML_ENDPOINT = f"{MAIN_WEBSITE_URL}/api/ml-data"

# Known faces database (in production, use a proper database)
KNOWN_FACES = {
    # Add known faces here
    # "person_id": {"name": "John Doe", "confidence_threshold": 0.8}
}

class ImageProcessor:
    def __init__(self):
        # Initialize face detection
        self.face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        self.eye_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_eye.xml')
        
        # Load known faces (in production, load from database)
        self.known_faces = KNOWN_FACES
        
    def process_image(self, image_data, gate_number):
        """Process ESP32-CAM image and return analysis results"""
        try:
            # Decode base64 image
            if image_data.startswith('data:image'):
                image_data = image_data.split(',')[1]
            
            image_bytes = base64.b64decode(image_data)
            nparr = np.frombuffer(image_bytes, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if image is None:
                return {"error": "Invalid image data", "hasFace": False, "confidence": 0}
            
            # Analyze image
            analysis = self.analyze_image(image, gate_number)
            
            return analysis
            
        except Exception as e:
            logger.error(f"Error processing image: {str(e)}")
            return {"error": str(e), "hasFace": False, "confidence": 0}
    
    def analyze_image(self, image, gate_number):
        """Analyze image for faces and threats"""
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Detect faces
        faces = self.face_cascade.detectMultiScale(
            gray, 
            scaleFactor=1.1, 
            minNeighbors=5, 
            minSize=(30, 30)
        )
        
        analysis = {
            "hasFace": len(faces) > 0,
            "faceCount": len(faces),
            "confidence": 0,
            "personName": "Unknown",
            "isIntruder": True,
            "imageQuality": self.assess_image_quality(image),
            "threatLevel": "low",
            "recommendations": []
        }
        
        if len(faces) > 0:
            # Process each face
            for (x, y, w, h) in faces:
                face_roi = gray[y:y+h, x:x+w]
                
                # Detect eyes for better face validation
                eyes = self.eye_cascade.detectMultiScale(face_roi)
                
                # Calculate confidence based on face size and eye detection
                face_area = w * h
                confidence = min(95, max(60, (face_area / 10000) * 100))
                
                if len(eyes) >= 2:  # Both eyes detected
                    confidence += 10
                
                analysis["confidence"] = max(analysis["confidence"], confidence)
                
                # Check if known person (simplified logic)
                person_name = self.identify_person(face_roi, confidence)
                if person_name:
                    analysis["personName"] = person_name
                    analysis["isIntruder"] = False
                    analysis["threatLevel"] = "low"
                else:
                    analysis["personName"] = "Intruder"
                    analysis["isIntruder"] = True
                    analysis["threatLevel"] = "high"
        
        # Assess overall threat level
        analysis["threatLevel"] = self.assess_threat_level(analysis)
        
        # Generate recommendations
        analysis["recommendations"] = self.generate_recommendations(analysis)
        
        return analysis
    
    def identify_person(self, face_roi, confidence):
        """Identify if person is known (simplified)"""
        # In production, use face recognition models like:
        # - face_recognition library
        # - dlib
        # - OpenFace
        # - Custom trained models
        
        # For now, use simple heuristics
        if confidence > 85:
            # Simulate known person detection
            if np.random.random() > 0.7:  # 30% chance of known person
                return f"Known Person {np.random.randint(1, 10)}"
        
        return None
    
    def assess_image_quality(self, image):
        """Assess image quality"""
        # Calculate image sharpness using Laplacian variance
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        
        if laplacian_var > 1000:
            return "high"
        elif laplacian_var > 500:
            return "medium"
        else:
            return "low"
    
    def assess_threat_level(self, analysis):
        """Assess overall threat level"""
        if analysis["isIntruder"] and analysis["confidence"] > 70:
            return "high"
        elif analysis["hasFace"] and analysis["confidence"] > 50:
            return "medium"
        else:
            return "low"
    
    def generate_recommendations(self, analysis):
        """Generate recommendations based on analysis"""
        recommendations = []
        
        if not analysis["hasFace"]:
            recommendations.append("No face detected - check camera positioning")
        elif analysis["confidence"] < 70:
            recommendations.append("Low confidence detection - manual review recommended")
        elif analysis["isIntruder"]:
            recommendations.append("Unknown person detected - security alert")
        else:
            recommendations.append("Known person detected - access granted")
        
        if analysis["imageQuality"] == "low":
            recommendations.append("Image quality is low - improve lighting")
        
        return recommendations

# Initialize image processor
processor = ImageProcessor()

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "service": "image-processor"
    })

@app.route('/process-image', methods=['POST'])
def process_image():
    """Main endpoint for processing ESP32-CAM images"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        image_data = data.get('image')
        gate_number = data.get('gate', 1)
        floor = data.get('floor', gate_number)
        
        if not image_data:
            return jsonify({"error": "No image data provided"}), 400
        
        logger.info(f"Processing image from Gate {gate_number}, Floor {floor}")
        
        # Process image
        analysis = processor.process_image(image_data, gate_number)
        
        if "error" in analysis:
            return jsonify(analysis), 400
        
        # Send results to main website
        send_to_main_website(analysis, gate_number, floor, image_data)
        
        return jsonify({
            "status": "success",
            "analysis": analysis,
            "gate": gate_number,
            "floor": floor,
            "timestamp": datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error in process_image: {str(e)}")
        return jsonify({"error": str(e)}), 500

def send_to_main_website(analysis, gate_number, floor, image_data):
    """Send analysis results to main website"""
    try:
        # Prepare data for main website
        payload = {
            "floor": floor,
            "gate": gate_number,
            "intruderImage": image_data,
            "name": analysis["personName"],
            "confidence": analysis["confidence"],
            "isIntruder": analysis["isIntruder"],
            "threatLevel": analysis["threatLevel"],
            "imageQuality": analysis["imageQuality"],
            "recommendations": analysis["recommendations"],
            "timestamp": datetime.now().isoformat()
        }
        
        # Send to main website
        response = requests.post(API_ENDPOINT, json=payload, timeout=10)
        
        if response.status_code == 200:
            logger.info(f"Successfully sent analysis to main website for Gate {gate_number}")
        else:
            logger.error(f"Failed to send to main website: {response.status_code}")
            
    except Exception as e:
        logger.error(f"Error sending to main website: {str(e)}")

@app.route('/ml-data', methods=['POST'])
def receive_ml_data():
    """Receive ML data from your friend's system"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        # Forward ML data to main website
        ml_payload = {
            "floor": data.get('floor'),
            "node": data.get('node', 1),
            "dataType": data.get('dataType', 'prediction'),
            "prediction": data.get('prediction', 'normal'),
            "confidence": data.get('confidence', 0.95),
            "evacuationRoute": data.get('evacuationRoute'),
            "threatLevel": data.get('threatLevel', 'low')
        }
        
        # Send to main website ML endpoint
        response = requests.post(ML_ENDPOINT, json=ml_payload, timeout=10)
        
        if response.status_code == 200:
            logger.info(f"Successfully forwarded ML data for Floor {data.get('floor')}")
            return jsonify({"status": "success", "message": "ML data forwarded"})
        else:
            logger.error(f"Failed to forward ML data: {response.status_code}")
            return jsonify({"error": "Failed to forward ML data"}), 500
            
    except Exception as e:
        logger.error(f"Error processing ML data: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/evacuation-update', methods=['POST'])
def update_evacuation():
    """Update evacuation routes based on ML analysis"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        # Forward evacuation update to main website
        evac_payload = {
            "floor": data.get('floor'),
            "status": data.get('status', 'safe'),
            "threats": data.get('threats', []),
            "evacuationTime": data.get('evacuationTime', 3),
            "capacity": data.get('capacity', 50),
            "routes": data.get('routes', ['main', 'secondary', 'emergency'])
        }
        
        # Send to main website evacuation endpoint
        response = requests.post(f"{MAIN_WEBSITE_URL}/api/evacuation-update", json=evac_payload, timeout=10)
        
        if response.status_code == 200:
            logger.info(f"Successfully updated evacuation for Floor {data.get('floor')}")
            return jsonify({"status": "success", "message": "Evacuation updated"})
        else:
            logger.error(f"Failed to update evacuation: {response.status_code}")
            return jsonify({"error": "Failed to update evacuation"}), 500
            
    except Exception as e:
        logger.error(f"Error updating evacuation: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    # Run Flask server
    port = int(os.getenv('FLASK_PORT', 5000))
    debug = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'
    
    logger.info(f"Starting Flask Image Processor on port {port}")
    logger.info(f"Main website URL: {MAIN_WEBSITE_URL}")
    
    app.run(host='0.0.0.0', port=port, debug=debug, threaded=True)
