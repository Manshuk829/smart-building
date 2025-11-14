#!/bin/bash

# Flask Image Processor Deployment Script
# This script deploys the Flask image processor server

echo "🚀 Deploying Flask Image Processor..."

# Set environment variables
export MAIN_WEBSITE_URL="https://smart-building-7906.onrender.com"
export FLASK_PORT=5000
export FLASK_DEBUG=false

# Install dependencies
echo "📦 Installing dependencies..."
pip install -r requirements_flask.txt

# Start Flask server
echo "🔧 Starting Flask server on port $FLASK_PORT..."
echo "📡 Main website URL: $MAIN_WEBSITE_URL"

# For production, use gunicorn
if [ "$1" = "production" ]; then
    echo "🏭 Starting in production mode with Gunicorn..."
    gunicorn --bind 0.0.0.0:$FLASK_PORT --workers 4 --timeout 30 flask_image_processor:app
else
    echo "🔧 Starting in development mode..."
    python flask_image_processor.py
fi
