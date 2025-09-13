@echo off
echo 🏢 Starting Complete Smart Building Security System...
echo.
echo This will start both the main website and Flask server
echo.
echo 📍 Main Website: http://localhost:3000
echo 📍 Flask Server: http://localhost:5000
echo.
echo Press Ctrl+C to stop both servers
echo.

REM Start Flask server in background
echo Starting Flask server...
start "Flask Server" cmd /k "cd /d %~dp0 && if exist venv\Scripts\activate.bat (call venv\Scripts\activate.bat) && set FLASK_APP=flask_image_processor.py && set FLASK_ENV=production && python flask_image_processor.py"

REM Wait a moment for Flask to start
timeout /t 3 /nobreak >nul

REM Start main website
echo Starting main website...
set NODE_ENV=production
npm start
