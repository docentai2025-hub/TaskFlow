@echo off
setlocal
cd /d "%~dp0"

echo ===================================================
echo  Starting TaskFlow...
echo ===================================================

where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Error: Node.js is not found in your PATH.
    echo Please install Node.js 22.13 or newer from https://nodejs.org/
    pause
    exit /b 1
)

echo Starting TaskFlow server...
node server.js
if %ERRORLEVEL% neq 0 (
    pause
)

