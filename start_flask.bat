Y@echo off
echo 🐍 Starting Flask Image Processing Server...
echo.
echo 📍 Flask server will run at: http://localhost:5000
echo 🔗 API endpoints available for ESP32-CAM integration
echo.
echo Press Ctrl+C to stop the server
echo.
if exist venv\Scripts\activate.bat (
    call venv\Scripts\activate.bat
)
set FLASK_APP=flask_image_processor.py
set FLASK_ENV=production
python flask_image_processor.py
