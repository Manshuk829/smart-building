@echo off
REM 🏢 Smart Building Security System - Complete Setup Script for Windows
REM This script sets up the entire system including Flask server and Docker

echo 🚀 Setting up Smart Building Security System...

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js not found! Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)
echo ✅ Node.js found

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python not found! Please install Python 3.8+ from https://python.org/
    pause
    exit /b 1
)
echo ✅ Python found

REM 1. Install Node.js dependencies
echo.
echo ================================
echo Installing Node.js Dependencies
echo ================================
if exist package.json (
    echo Installing Node.js packages...
    npm install
    if %errorlevel% equ 0 (
        echo ✅ Node.js dependencies installed successfully
    ) else (
        echo ❌ Failed to install Node.js dependencies
        pause
        exit /b 1
    )
) else (
    echo ❌ package.json not found!
    pause
    exit /b 1
)

REM 2. Install Python dependencies for Flask
echo.
echo ================================
echo Installing Python Dependencies
echo ================================
if exist requirements_flask.txt (
    echo Installing Python packages for Flask server...
    
    REM Create virtual environment if it doesn't exist
    if not exist venv (
        echo Creating Python virtual environment...
        python -m venv venv
    )
    
    REM Activate virtual environment and install requirements
    call venv\Scripts\activate.bat
    pip install -r requirements_flask.txt
    
    if %errorlevel% equ 0 (
        echo ✅ Python dependencies installed successfully
    ) else (
        echo ⚠️ Some Python packages might have failed to install
        echo ⚠️ This is normal for face-recognition and dlib on some systems
        echo ⚠️ The system will work with basic OpenCV functionality
    )
) else (
    echo ❌ requirements_flask.txt not found!
    pause
    exit /b 1
)

REM 3. Check Docker installation
echo.
echo ================================
echo Checking Docker Installation
echo ================================
docker --version >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Docker found
    docker info >nul 2>&1
    if %errorlevel% equ 0 (
        echo ✅ Docker is running
        set DOCKER_AVAILABLE=true
    ) else (
        echo ⚠️ Docker is installed but not running
        echo ⚠️ Start Docker Desktop and run this script again for containerized deployment
        set DOCKER_AVAILABLE=false
    )
) else (
    echo ⚠️ Docker not found
    echo ⚠️ Install Docker for containerized deployment
    set DOCKER_AVAILABLE=false
)

REM 4. Create environment files
echo.
echo ================================
echo Creating Environment Files
echo ================================
if not exist .env (
    echo Creating .env file...
    (
        echo # Smart Building Security System Environment Variables
        echo NODE_ENV=production
        echo PORT=3000
        echo MONGODB_URI=mongodb://localhost:27017/smart_building
        echo JWT_SECRET=your_jwt_secret_here_change_this
        echo SESSION_SECRET=your_session_secret_here_change_this
        echo.
        echo # Flask Server Configuration
        echo FLASK_SERVER_URL=http://localhost:5000
        echo MAIN_WEBSITE_URL=http://localhost:3000
        echo.
        echo # MQTT Configuration
        echo MQTT_BROKER_URL=mqtt://localhost:1883
        echo MQTT_USERNAME=
        echo MQTT_PASSWORD=
        echo.
        echo # Email Configuration ^(for alerts^)
        echo EMAIL_HOST=smtp.gmail.com
        echo EMAIL_PORT=587
        echo EMAIL_USER=your_email@gmail.com
        echo EMAIL_PASS=your_app_password
        echo.
        echo # ESP32-CAM Configuration
        echo ESP32_CAM_GATE_1_URL=http://192.168.1.100/capture
        echo ESP32_CAM_GATE_2_URL=http://192.168.1.101/capture
        echo ESP32_CAM_GATE_3_URL=http://192.168.1.102/capture
        echo ESP32_CAM_GATE_4_URL=http://192.168.1.103/capture
    ) > .env
    echo ✅ .env file created
    echo ⚠️ Please update the .env file with your actual configuration
) else (
    echo ✅ .env file already exists
)

REM 5. Create startup scripts
echo.
echo ================================
echo Creating Startup Scripts
echo ================================

REM Main website startup script
(
    echo @echo off
    echo echo 🚀 Starting Smart Building Security Website...
    echo set NODE_ENV=production
    echo npm start
) > start_website.bat

REM Flask server startup script
(
    echo @echo off
    echo echo 🐍 Starting Flask Image Processing Server...
    echo if exist venv\Scripts\activate.bat ^(
    echo     call venv\Scripts\activate.bat
    echo ^)
    echo set FLASK_APP=flask_image_processor.py
    echo set FLASK_ENV=production
    echo python flask_image_processor.py
) > start_flask.bat

echo ✅ Startup scripts created

REM 6. Docker setup (if available)
if "%DOCKER_AVAILABLE%"=="true" (
    echo.
    echo ================================
    echo Setting up Docker
    echo ================================
    
    echo Building Flask server Docker image...
    docker build -f Dockerfile.flask -t smart-building-flask .
    
    if %errorlevel% equ 0 (
        echo ✅ Flask Docker image built successfully
    ) else (
        echo ⚠️ Failed to build Flask Docker image
    )
    
    REM Create Docker Compose file
    (
        echo version: '3.8'
        echo.
        echo services:
        echo   flask-server:
        echo     build:
        echo       context: .
        echo       dockerfile: Dockerfile.flask
        echo     ports:
        echo       - "5000:5000"
        echo     environment:
        echo       - MAIN_WEBSITE_URL=http://host.docker.internal:3000
        echo     volumes:
        echo       - ./face_data:/app/face_data
        echo     restart: unless-stopped
        echo.
        echo   mongodb:
        echo     image: mongo:latest
        echo     ports:
        echo       - "27017:27017"
        echo     volumes:
        echo       - mongodb_data:/data/db
        echo     restart: unless-stopped
        echo.
        echo volumes:
        echo   mongodb_data:
    ) > docker-compose.yml
    
    echo ✅ Docker Compose file created
)

REM 7. Create directories
echo.
echo ================================
echo Creating Required Directories
echo ================================
if not exist face_data mkdir face_data
if not exist logs mkdir logs
if not exist uploads mkdir uploads
echo ✅ Required directories created

REM 8. Final instructions
echo.
echo ================================
echo Setup Complete! 🎉
echo ================================
echo.
echo Your Smart Building Security System is ready!
echo.
echo 📋 Next Steps:
echo 1. Update the .env file with your actual configuration
echo 2. Start MongoDB (if not using Docker)
echo 3. Run the system:
echo.
echo    Windows:
echo    - Main Website: start_website.bat
echo    - Flask Server: start_flask.bat
if "%DOCKER_AVAILABLE%"=="true" (
    echo.
    echo    Docker:
    echo    - docker-compose up -d
)
echo.
echo 🌐 Access Points:
echo    - Main Website: http://localhost:3000
echo    - Flask Server: http://localhost:5000
echo    - Face Training: http://localhost:3000/face-training
echo    - Evacuation Routes: http://localhost:3000/evacuation
echo.
echo 📚 Documentation:
echo    - ESP32-CAM Integration: ESP32_CAM_Integration.md
echo    - Flask Server API: Check flask_image_processor.py
echo.
echo ⚠️ Remember to:
echo    - Configure your ESP32-CAM IP addresses in .env
echo    - Set up MQTT broker if using MQTT
echo    - Train faces using the Face Training page
echo    - Update ML data endpoints for your friend's system
echo.
echo 🎯 Happy monitoring! Your smart building is now secure!
echo.
pause
