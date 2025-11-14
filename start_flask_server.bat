@echo off
echo Starting Flask Image Processing Server...
echo.

REM Check if Python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo Python is not installed or not in PATH
    echo Please install Python and try again
    pause
    exit /b 1
)

REM Check if virtual environment exists
if not exist "venv\Scripts\activate.bat" (
    echo Creating virtual environment...
    python -m venv venv
    if errorlevel 1 (
        echo Failed to create virtual environment
        pause
        exit /b 1
    )
)

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate.bat

REM Install requirements if needed
if not exist "venv\Lib\site-packages\flask" (
    echo Installing Flask requirements...
    pip install -r requirements_flask.txt
    if errorlevel 1 (
        echo Failed to install requirements
        pause
        exit /b 1
    )
)

REM Start Flask server
echo Starting Flask server on port 5000...
echo Press Ctrl+C to stop the server
echo.
python flask_image_processor.py

pause
