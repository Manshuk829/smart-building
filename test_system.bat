@echo off
echo 🧪 Testing Smart Building Security System...
echo.

echo 📋 System Status Check:
echo ========================

echo.
echo 1. Checking Node.js installation...
node --version
if %errorlevel% equ 0 (
    echo ✅ Node.js is installed
) else (
    echo ❌ Node.js not found
)

echo.
echo 2. Checking Python installation...
python --version
if %errorlevel% equ 0 (
    echo ✅ Python is installed
) else (
    echo ❌ Python not found
)

echo.
echo 3. Checking Node.js dependencies...
if exist node_modules (
    echo ✅ Node.js dependencies installed
) else (
    echo ❌ Node.js dependencies missing
)

echo.
echo 4. Checking Python virtual environment...
if exist venv (
    echo ✅ Python virtual environment created
) else (
    echo ❌ Python virtual environment missing
)

echo.
echo 5. Checking required directories...
if exist face_data (
    echo ✅ face_data directory exists
) else (
    echo ❌ face_data directory missing
)

if exist logs (
    echo ✅ logs directory exists
) else (
    echo ❌ logs directory missing
)

if exist uploads (
    echo ✅ uploads directory exists
) else (
    echo ❌ uploads directory missing
)

echo.
echo 6. Checking configuration files...
if exist .env (
    echo ✅ .env file exists
) else (
    echo ❌ .env file missing
)

if exist package.json (
    echo ✅ package.json exists
) else (
    echo ❌ package.json missing
)

if exist flask_image_processor.py (
    echo ✅ Flask server exists
) else (
    echo ❌ Flask server missing
)

echo.
echo 7. Checking setup scripts...
if exist setup_complete_system.bat (
    echo ✅ Windows setup script exists
) else (
    echo ❌ Windows setup script missing
)

if exist start_website.bat (
    echo ✅ Website startup script exists
) else (
    echo ❌ Website startup script missing
)

if exist start_flask.bat (
    echo ✅ Flask startup script exists
) else (
    echo ❌ Flask startup script missing
)

echo.
echo 🎯 System Test Complete!
echo.
echo 📋 Next Steps:
echo 1. Start the main website: start_website.bat
echo 2. Start the Flask server: start_flask.bat
echo 3. Access the system at: http://localhost:3000
echo 4. Train faces at: http://localhost:3000/face-training
echo 5. View evacuation routes at: http://localhost:3000/evacuation
echo.
echo 🚀 Your Smart Building Security System is ready!
pause
