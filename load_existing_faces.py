#!/usr/bin/env python3
"""
Load existing face data from face_data directory into the Flask server
"""

import os
import cv2
import numpy as np
import base64
import json
from pathlib import Path

def load_existing_faces():
    """Load existing face images and create training data"""
    face_data_dir = Path("face_data")
    known_faces = {}
    
    if not face_data_dir.exists():
        print("❌ face_data directory not found")
        return {}
    
    print("🔄 Loading existing face data...")
    
    for person_dir in face_data_dir.iterdir():
        if person_dir.is_dir():
            person_name = person_dir.name
            print(f"📁 Processing {person_name}...")
            
            face_encodings = []
            image_count = 0
            
            # Process all images in the person's directory
            for image_file in person_dir.iterdir():
                if image_file.suffix.lower() in ['.jpg', '.jpeg', '.png', '.bmp']:
                    try:
                        # Load image
                        image = cv2.imread(str(image_file))
                        if image is None:
                            continue
                        
                        # Convert to grayscale for face detection
                        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
                        
                        # Detect faces
                        face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
                        faces = face_cascade.detectMultiScale(gray, 1.1, 5)
                        
                        if len(faces) > 0:
                            # Extract face features (simplified version)
                            x, y, w, h = faces[0]
                            face_roi = gray[y:y+h, x:x+w]
                            
                            # Resize to standard size
                            face_resized = cv2.resize(face_roi, (100, 100))
                            
                            # Extract basic features
                            features = []
                            
                            # Histogram features
                            hist = cv2.calcHist([face_resized], [0], None, [32], [0, 256])
                            features.extend(hist.flatten())
                            
                            # Edge features
                            edges = cv2.Canny(face_resized, 50, 150)
                            edge_hist = cv2.calcHist([edges], [0], None, [16], [0, 256])
                            features.extend(edge_hist.flatten())
                            
                            face_encodings.append(np.array(features, dtype=np.float32))
                            image_count += 1
                            
                            print(f"  ✅ Processed {image_file.name}")
                        else:
                            print(f"  ⚠️ No face detected in {image_file.name}")
                            
                    except Exception as e:
                        print(f"  ❌ Error processing {image_file.name}: {e}")
            
            if face_encodings:
                known_faces[person_name.lower().replace(' ', '_')] = {
                    "name": person_name,
                    "confidence_threshold": 0.8,
                    "face_encodings": face_encodings
                }
                print(f"  🎯 {person_name}: {len(face_encodings)} face encodings created")
            else:
                print(f"  ❌ No valid faces found for {person_name}")
    
    return known_faces

def save_known_faces(known_faces):
    """Save known faces to a JSON file"""
    try:
        # Convert numpy arrays to lists for JSON serialization
        serializable_faces = {}
        for person_id, data in known_faces.items():
            serializable_faces[person_id] = {
                "name": data["name"],
                "confidence_threshold": data["confidence_threshold"],
                "face_encodings": [encoding.tolist() for encoding in data["face_encodings"]]
            }
        
        with open("known_faces.json", "w") as f:
            json.dump(serializable_faces, f, indent=2)
        
        print(f"💾 Saved {len(known_faces)} known faces to known_faces.json")
        return True
        
    except Exception as e:
        print(f"❌ Error saving known faces: {e}")
        return False

if __name__ == "__main__":
    print("🎯 Smart Building Security - Face Data Loader")
    print("=" * 50)
    
    # Load existing faces
    known_faces = load_existing_faces()
    
    if known_faces:
        # Save to JSON file
        if save_known_faces(known_faces):
            print("\n✅ Face data loading completed successfully!")
            print(f"📊 Total people loaded: {len(known_faces)}")
            for person_id, data in known_faces.items():
                print(f"  - {data['name']}: {len(data['face_encodings'])} encodings")
        else:
            print("\n❌ Failed to save face data")
    else:
        print("\n❌ No face data found or processed")
    
    print("\n🚀 You can now start the Flask server with pre-loaded faces!")
