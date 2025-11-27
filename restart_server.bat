@echo off
echo 🛑 Stopping any running node processes...
taskkill /F /IM node.exe >nul 2>&1
echo.
echo 🚀 Starting Smart Building Server...
echo.
cd /d "%~dp0"
npm start
pause
