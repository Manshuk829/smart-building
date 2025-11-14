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
MAIN_WEBSITE_URL = os.getenv('MAIN_WEBSITE_URL', 'https://smart-building-7906.onrender.com')
API_ENDPOINT = f"{MAIN_WEBSITE_URL}/api/upload-image"
ML_ENDPOINT = f"{MAIN_WEBSITE_URL}/api/ml-data"

# Known faces database (in production, use a proper database)
KNOWN_FACES = {}

# Face training data storage
FACE_TRAINING_DATA = {}
TRAINING_MODE = False

def load_known_faces_from_file():
    """Load known faces from JSON file if it exists"""
    global KNOWN_FACES
    try:
        if os.path.exists("known_faces.json"):
            with open("known_faces.json", "r") as f:
                data = json.load(f)
                # Convert lists back to numpy arrays
                for person_id, person_data in data.items():
                    KNOWN_FACES[person_id] = {
                        "name": person_data["name"],
                        "confidence_threshold": person_data["confidence_threshold"],
                        "face_encodings": [np.array(encoding) for encoding in person_data["face_encodings"]]
                    }
                logger.info(f"Loaded {len(KNOWN_FACES)} known faces from file")
        else:
            logger.info("No known_faces.json file found, starting with empty database")
    except Exception as e:
        logger.error(f"Error loading known faces: {e}")

# Load existing faces on startup
load_known_faces_from_file()

def save_known_faces_to_file():
    """Save known faces to JSON file"""
    try:
        # Convert numpy arrays to lists for JSON serialization
        serializable_faces = {}
        for person_id, data in KNOWN_FACES.items():
            serializable_faces[person_id] = {
                "name": data["name"],
                "confidence_threshold": data["confidence_threshold"],
                "face_encodings": [encoding.tolist() for encoding in data["face_encodings"]]
            }
        
        with open("known_faces.json", "w") as f:
            json.dump(serializable_faces, f, indent=2)
        
        logger.info(f"Saved {len(KNOWN_FACES)} known faces to known_faces.json")
        return True
        
    except Exception as e:
        logger.error(f"Error saving known faces: {e}")
        return False

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
        """Identify if person is known using trained data"""
        if not KNOWN_FACES or confidence < 40:  # Further lowered threshold for better detection
            logger.info(f"Face detection confidence too low ({confidence}) or no known faces")
            return None
        
        # Simple face matching based on face features
        # In production, use proper face recognition libraries
        face_features = self.extract_face_features(face_roi)
        
        best_match = None
        best_confidence = 0
        
        for person_id, person_data in KNOWN_FACES.items():
            if 'face_encodings' in person_data and person_data['face_encodings']:
                # Calculate similarity with stored encodings
                similarity = self.calculate_face_similarity(face_features, person_data['face_encodings'])
                
                # Use a more lenient threshold for matching
                threshold = person_data.get('confidence_threshold', 0.5)  # Further lowered from 0.6
                
                if similarity > threshold and similarity > best_confidence:
                    best_match = person_data['name']
                    best_confidence = similarity
                    
                logger.info(f"Checking {person_data['name']}: similarity={similarity:.3f}, threshold={threshold}, best={best_match}")
        
        logger.info(f"Best match: {best_match} with confidence {best_confidence:.3f} (threshold: 0.5)")
        # Return match if confidence is above threshold
        if best_confidence > 0.5:
            logger.info(f"✅ Person identified: {best_match}")
            return best_match
        else:
            logger.info(f"❌ No match found (best confidence: {best_confidence:.3f} < 0.5)")
            return None
    
    def extract_face_features(self, face_roi):
        """Extract features from face ROI for comparison"""
        # Simple feature extraction - in production use proper face encodings
        gray = cv2.cvtColor(face_roi, cv2.COLOR_BGR2GRAY) if len(face_roi.shape) == 3 else face_roi
        
        # Resize to standard size
        face_resized = cv2.resize(gray, (100, 100))
        
        # Extract basic features (histogram, edges, etc.)
        features = []
        
        # Histogram features
        hist = cv2.calcHist([face_resized], [0], None, [32], [0, 256])
        features.extend(hist.flatten())
        
        # Edge features
        edges = cv2.Canny(face_resized, 50, 150)
        edge_hist = cv2.calcHist([edges], [0], None, [16], [0, 256])
        features.extend(edge_hist.flatten())
        
        return np.array(features, dtype=np.float32)
    
    def calculate_face_similarity(self, features1, stored_encodings):
        """Calculate similarity between face features"""
        if not stored_encodings:
            return 0
        
        similarities = []
        for encoding in stored_encodings:
            # Calculate cosine similarity
            dot_product = np.dot(features1, encoding)
            norm1 = np.linalg.norm(features1)
            norm2 = np.linalg.norm(encoding)
            
            if norm1 > 0 and norm2 > 0:
                cosine_similarity = dot_product / (norm1 * norm2)
                
                # Also calculate Euclidean distance similarity
                euclidean_distance = np.linalg.norm(features1 - encoding)
                euclidean_similarity = 1 / (1 + euclidean_distance / 1000)  # Normalize
                
                # Combine both similarities for better accuracy
                combined_similarity = (cosine_similarity + euclidean_similarity) / 2
                similarities.append(combined_similarity)
        
        return max(similarities) if similarities else 0
    
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
        
        # Send results to main website with proper name handling
        # If person is identified, use their name; otherwise use "Intruder"
        person_name = analysis["personName"] if not analysis["isIntruder"] else "Intruder"
        send_to_main_website(analysis, gate_number, floor, image_data, person_name)
        
        return jsonify({
            "status": "success",
            "analysis": analysis,
            "gate": gate_number,
            "floor": floor,
            "personName": person_name,
            "timestamp": datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error in process_image: {str(e)}")
        return jsonify({"error": str(e)}), 500

def send_to_main_website(analysis, gate_number, floor, image_data, person_name=None):
    """Send analysis results to main website"""
    try:
        # Use provided person_name or fall back to analysis
        final_name = person_name if person_name else analysis["personName"]
        is_intruder = final_name == "Intruder" or final_name == "Unknown" or analysis["isIntruder"]
        
        # Prepare data for main website
        payload = {
            "floor": floor,
            "gate": gate_number,
            "intruderImage": image_data,  # Always send image for display
            "name": final_name,  # Use the identified name or "Intruder"
            "confidence": analysis["confidence"],
            "isIntruder": is_intruder,
            "threatLevel": analysis["threatLevel"],
            "imageQuality": analysis["imageQuality"],
            "recommendations": analysis["recommendations"],
            "timestamp": datetime.now().isoformat(),
            "hasFace": analysis["hasFace"],
            "faceCount": analysis["faceCount"]
        }
        
        # Send to main website
        response = requests.post(API_ENDPOINT, json=payload, timeout=10)
        
        if response.status_code == 200:
            logger.info(f"Successfully sent analysis to main website for Gate {gate_number} - {final_name}")
            
            # Also send ML data update for evacuation system
            if analysis["isIntruder"]:
                ml_payload = {
                    "floor": floor,
                    "node": gate_number,
                    "dataType": "intruder_detection",
                    "prediction": "intruder",
                    "confidence": analysis["confidence"] / 100,  # Convert to 0-1 scale
                    "threatLevel": analysis["threatLevel"]
                }
                
                ml_response = requests.post(ML_ENDPOINT, json=ml_payload, timeout=10)
                if ml_response.status_code == 200:
                    logger.info(f"Successfully sent ML data for intruder detection on Floor {floor}")
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

@app.route('/train-face', methods=['POST'])
def train_face():
    """Train face recognition with new person data"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        person_name = data.get('name')
        image_data = data.get('image')
        
        if not person_name or not image_data:
            return jsonify({"error": "Name and image are required"}), 400
        
        # Decode image
        if image_data.startswith('data:image'):
            image_data = image_data.split(',')[1]
        
        image_bytes = base64.b64decode(image_data)
        nparr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if image is None:
            return jsonify({"error": "Invalid image data"}), 400
        
        # Detect face
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        faces = processor.face_cascade.detectMultiScale(gray, 1.1, 5)
        
        if len(faces) == 0:
            return jsonify({"error": "No face detected in image"}), 400
        
        # Extract face features
        x, y, w, h = faces[0]
        face_roi = gray[y:y+h, x:x+w]
        face_features = processor.extract_face_features(face_roi)
        
        # Store in known faces database
        person_id = person_name.lower().replace(' ', '_')
        
        if person_id not in KNOWN_FACES:
            KNOWN_FACES[person_id] = {
                "name": person_name,
                "confidence_threshold": 0.8,
                "face_encodings": []
            }
        
        KNOWN_FACES[person_id]["face_encodings"].append(face_features)
        
        # Limit to 5 encodings per person
        if len(KNOWN_FACES[person_id]["face_encodings"]) > 5:
            KNOWN_FACES[person_id]["face_encodings"] = KNOWN_FACES[person_id]["face_encodings"][-5:]
        
        logger.info(f"Trained face for {person_name} - {len(KNOWN_FACES[person_id]['face_encodings'])} encodings")
        
        # Save updated known faces to file
        save_known_faces_to_file()
        
        return jsonify({
            "status": "success",
            "message": f"Face trained for {person_name}",
            "person_id": person_id,
            "encodings_count": len(KNOWN_FACES[person_id]["face_encodings"])
        })
        
    except Exception as e:
        logger.error(f"Error training face: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/known-faces', methods=['GET'])
def get_known_faces():
    """Get list of known faces"""
    try:
        faces_list = []
        for person_id, data in KNOWN_FACES.items():
            faces_list.append({
                "id": person_id,
                "name": data["name"],
                "encodings_count": len(data.get("face_encodings", [])),
                "confidence_threshold": data.get("confidence_threshold", 0.8)
            })
        
        return jsonify({
            "status": "success",
            "faces": faces_list,
            "total_faces": len(faces_list)
        })
        
    except Exception as e:
        logger.error(f"Error getting known faces: {str(e)}")
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
