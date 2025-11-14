#!/bin/bash

# 🏢 Smart Building Security System - Complete Setup Script
# This script sets up the entire system including Flask server and Docker

echo "🚀 Setting up Smart Building Security System..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================${NC}"
}

# Check if running on Windows (Git Bash)
if [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
    IS_WINDOWS=true
    print_warning "Detected Windows environment"
else
    IS_WINDOWS=false
fi

# 1. Install Node.js dependencies
print_header "Installing Node.js Dependencies"
if [ -f "package.json" ]; then
    print_status "Installing Node.js packages..."
    npm install
    if [ $? -eq 0 ]; then
        print_status "✅ Node.js dependencies installed successfully"
    else
        print_error "❌ Failed to install Node.js dependencies"
        exit 1
    fi
else
    print_error "package.json not found!"
    exit 1
fi

# 2. Check Python installation
print_header "Checking Python Installation"
if command -v python3 &> /dev/null; then
    PYTHON_CMD="python3"
    print_status "✅ Python3 found"
elif command -v python &> /dev/null; then
    PYTHON_CMD="python"
    print_status "✅ Python found"
else
    print_error "❌ Python not found! Please install Python 3.8+"
    exit 1
fi

# 3. Install Python dependencies for Flask
print_header "Installing Python Dependencies"
if [ -f "requirements_flask.txt" ]; then
    print_status "Installing Python packages for Flask server..."
    
    # Create virtual environment if it doesn't exist
    if [ ! -d "venv" ]; then
        print_status "Creating Python virtual environment..."
        $PYTHON_CMD -m venv venv
    fi
    
    # Activate virtual environment
    if [ "$IS_WINDOWS" = true ]; then
        source venv/Scripts/activate
    else
        source venv/bin/activate
    fi
    
    # Install requirements
    pip install -r requirements_flask.txt
    
    if [ $? -eq 0 ]; then
        print_status "✅ Python dependencies installed successfully"
    else
        print_warning "⚠️ Some Python packages might have failed to install"
        print_warning "This is normal for face-recognition and dlib on some systems"
        print_warning "The system will work with basic OpenCV functionality"
    fi
else
    print_error "requirements_flask.txt not found!"
    exit 1
fi

# 4. Check Docker installation
print_header "Checking Docker Installation"
if command -v docker &> /dev/null; then
    print_status "✅ Docker found"
    DOCKER_AVAILABLE=true
    
    # Check if Docker is running
    if docker info &> /dev/null; then
        print_status "✅ Docker is running"
    else
        print_warning "⚠️ Docker is installed but not running"
        print_warning "Start Docker Desktop and run this script again for containerized deployment"
        DOCKER_AVAILABLE=false
    fi
else
    print_warning "⚠️ Docker not found"
    print_warning "Install Docker for containerized deployment"
    DOCKER_AVAILABLE=false
fi

# 5. Create environment files
print_header "Creating Environment Files"
if [ ! -f ".env" ]; then
    print_status "Creating .env file..."
    cat > .env << EOF
# Smart Building Security System Environment Variables
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb://localhost:27017/smart_building
JWT_SECRET=your_jwt_secret_here_change_this
SESSION_SECRET=your_session_secret_here_change_this

# Flask Server Configuration
FLASK_SERVER_URL=http://localhost:5000
MAIN_WEBSITE_URL=http://localhost:3000

# MQTT Configuration
MQTT_BROKER_URL=mqtt://localhost:1883
MQTT_USERNAME=
MQTT_PASSWORD=

# Email Configuration (for alerts)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# ESP32-CAM Configuration
ESP32_CAM_GATE_1_URL=http://192.168.1.100/capture
ESP32_CAM_GATE_2_URL=http://192.168.1.101/capture
ESP32_CAM_GATE_3_URL=http://192.168.1.102/capture
ESP32_CAM_GATE_4_URL=http://192.168.1.103/capture
EOF
    print_status "✅ .env file created"
    print_warning "⚠️ Please update the .env file with your actual configuration"
else
    print_status "✅ .env file already exists"
fi

# 6. Create startup scripts
print_header "Creating Startup Scripts"

# Main website startup script
cat > start_website.sh << 'EOF'
#!/bin/bash
echo "🚀 Starting Smart Building Security Website..."
export NODE_ENV=production
npm start
EOF

# Flask server startup script
cat > start_flask.sh << 'EOF'
#!/bin/bash
echo "🐍 Starting Flask Image Processing Server..."
if [ -d "venv" ]; then
    source venv/bin/activate
fi
export FLASK_APP=flask_image_processor.py
export FLASK_ENV=production
python flask_image_processor.py
EOF

# Windows batch files
cat > start_website.bat << 'EOF'
@echo off
echo 🚀 Starting Smart Building Security Website...
set NODE_ENV=production
npm start
EOF

cat > start_flask.bat << 'EOF'
@echo off
echo 🐍 Starting Flask Image Processing Server...
if exist venv\Scripts\activate.bat (
    call venv\Scripts\activate.bat
)
set FLASK_APP=flask_image_processor.py
set FLASK_ENV=production
python flask_image_processor.py
EOF

# Make scripts executable (Unix/Linux)
chmod +x start_website.sh start_flask.sh

print_status "✅ Startup scripts created"

# 7. Docker setup (if available)
if [ "$DOCKER_AVAILABLE" = true ]; then
    print_header "Setting up Docker"
    
    # Build Flask Docker image
    print_status "Building Flask server Docker image..."
    docker build -f Dockerfile.flask -t smart-building-flask .
    
    if [ $? -eq 0 ]; then
        print_status "✅ Flask Docker image built successfully"
    else
        print_warning "⚠️ Failed to build Flask Docker image"
    fi
    
    # Create Docker Compose file
    cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  flask-server:
    build:
      context: .
      dockerfile: Dockerfile.flask
    ports:
      - "5000:5000"
    environment:
      - MAIN_WEBSITE_URL=http://host.docker.internal:3000
    volumes:
      - ./face_data:/app/face_data
    restart: unless-stopped

  mongodb:
    image: mongo:latest
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
    restart: unless-stopped

volumes:
  mongodb_data:
EOF
    
    print_status "✅ Docker Compose file created"
fi

# 8. Create directories
print_header "Creating Required Directories"
mkdir -p face_data
mkdir -p logs
mkdir -p uploads
print_status "✅ Required directories created"

# 9. Final instructions
print_header "Setup Complete! 🎉"
echo ""
print_status "Your Smart Building Security System is ready!"
echo ""
print_status "📋 Next Steps:"
echo "1. Update the .env file with your actual configuration"
echo "2. Start MongoDB (if not using Docker)"
echo "3. Run the system:"
echo ""
if [ "$IS_WINDOWS" = true ]; then
    echo "   Windows:"
    echo "   - Main Website: start_website.bat"
    echo "   - Flask Server: start_flask.bat"
else
    echo "   Linux/Mac:"
    echo "   - Main Website: ./start_website.sh"
    echo "   - Flask Server: ./start_flask.sh"
fi

if [ "$DOCKER_AVAILABLE" = true ]; then
    echo ""
    echo "   Docker:"
    echo "   - docker-compose up -d"
fi

echo ""
print_status "🌐 Access Points:"
echo "   - Main Website: http://localhost:3000"
echo "   - Flask Server: http://localhost:5000"
echo "   - Face Training: http://localhost:3000/face-training"
echo "   - Evacuation Routes: http://localhost:3000/evacuation"
echo ""
print_status "📚 Documentation:"
echo "   - ESP32-CAM Integration: ESP32_CAM_Integration.md"
echo "   - Flask Server API: Check flask_image_processor.py"
echo ""
print_warning "⚠️ Remember to:"
echo "   - Configure your ESP32-CAM IP addresses in .env"
echo "   - Set up MQTT broker if using MQTT"
echo "   - Train faces using the Face Training page"
echo "   - Update ML data endpoints for your friend's system"
echo ""
print_status "🎯 Happy monitoring! Your smart building is now secure!"
