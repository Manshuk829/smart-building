@echo off
echo ========================================
echo Smart Building Security System - Fixes
echo ========================================
echo.

echo [1/5] Running system health check...
node system_health_check.js
if errorlevel 1 (
    echo ❌ Health check failed
    pause
    exit /b 1
)

echo.
echo [2/5] Checking Flask server status...
curl -s http://localhost:5000/health >nul 2>&1
if errorlevel 1 (
    echo ⚠️  Flask server not running - starting it...
    start "Flask Server" cmd /k "cd /d %~dp0 && call venv\Scripts\activate.bat && python flask_image_processor.py"
    timeout /t 3 /nobreak >nul
) else (
    echo ✅ Flask server is running
)

echo.
echo [3/5] Checking main website status...
curl -s http://localhost:3000 >nul 2>&1
if errorlevel 1 (
    echo ⚠️  Main website not running - starting it...
    start "Main Website" cmd /k "cd /d %~dp0 && npm start"
    timeout /t 3 /nobreak >nul
) else (
    echo ✅ Main website is running
)

echo.
echo [4/5] Testing face recognition system...
echo Testing Flask server endpoints...
curl -s http://localhost:5000/health
echo.
curl -s http://localhost:5000/known-faces
echo.

echo.
echo [5/5] System Status Summary:
echo ============================
echo Flask Server: http://localhost:5000
echo Main Website: http://localhost:3000
echo Face Training: http://localhost:3000/face-training
echo Live Monitoring: http://localhost:3000/live
echo Charts: http://localhost:3000/charts
echo.

echo 🎯 Key Fixes Applied:
echo ====================
echo ✅ Face recognition thresholds lowered for better detection
echo ✅ Gate status handling improved
echo ✅ Face training error handling enhanced
echo ✅ Flame sensor data processing fixed
echo ✅ Charts page real-time updates fixed
echo ✅ System health monitoring added
echo.

echo 📋 Next Steps:
echo ==============
echo 1. Test face recognition with ESP32 CAM images
echo 2. Check gate status on live page
echo 3. Test face training functionality
echo 4. Verify flame sensor data on dashboard
echo 5. Check charts page for real-time data
echo.

echo Press any key to open the main website...
pause >nul
start http://localhost:3000

echo.
echo System fixes completed! 🚀
pause
