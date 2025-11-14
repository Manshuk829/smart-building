@echo off
echo ========================================
echo Smart Building Security System Startup
echo ========================================
echo.

REM Check if Python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo Python is not installed or not in PATH
    echo Please install Python and try again
    pause
    exit /b 1
)

REM Check if Node.js is available
node --version >nul 2>&1
if errorlevel 1 (
    echo Node.js is not installed or not in PATH
    echo Please install Node.js and try again
    pause
    exit /b 1
)

echo Starting both Flask server and main website...
echo.

REM Start Flask server in background
echo [1/2] Starting Flask Image Processing Server...
start "Flask Server" cmd /k "cd /d %~dp0 && call venv\Scripts\activate.bat && python flask_image_processor.py"

REM Wait a moment for Flask to start
timeout /t 3 /nobreak >nul

REM Start main website
echo [2/2] Starting Main Website Server...
echo.
echo Both servers are starting...
echo - Flask server: http://localhost:5000
echo - Main website: http://localhost:3000
echo.
echo Press any key to open the main website in your browser...
pause >nul

REM Open browser
start http://localhost:3000

echo.
echo ========================================
echo System Status:
echo ========================================
echo Flask Server: Starting on port 5000
echo Main Website: Starting on port 3000
echo.
echo To stop the system:
echo 1. Close this window
echo 2. Close the Flask server window
echo.
echo The system is now running!
echo.

REM Start the main website (this will block)
npm start
