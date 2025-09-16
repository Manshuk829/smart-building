@echo off
echo 🏢 Starting Smart Building Security System...
echo.

echo 🐍 Starting Flask Image Processing Server...
start "Flask Server" cmd /k "cd /d %~dp0 && python flask_image_processor.py"

echo ⏳ Waiting for Flask server to start...
timeout /t 5 /nobreak >nul

echo 🌐 Starting Main Website...
start "Main Website" cmd /k "cd /d %~dp0 && npm start"

echo.
echo ✅ Both servers are starting!
echo.
echo 📍 Access Points:
echo    - Main Website: http://localhost:3000
echo    - Flask Server: http://localhost:5000
echo    - Face Training: http://localhost:3000/face-training
echo    - Evacuation Routes: http://localhost:3000/evacuation
echo.
echo 🎯 Your face data has been loaded:
echo    - Deepanjan: 1 face encoding
echo    - Manshuk: 3 face encodings  
echo    - Mehul: 1 face encoding
echo    - Swarnendu: 4 face encodings
echo.
echo 🚀 System is ready! Check the terminal windows for server status.
pause
