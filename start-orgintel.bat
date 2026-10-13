@echo off
title ORGINTEL server
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed. Download it from https://nodejs.org and run this file again.
  pause
  exit /b 1
)
if not exist node_modules\nodemailer (
  echo Installing the email library - first run only...
  call npm install --no-audit --no-fund
)
start "" http://localhost:3000
node server.js
pause
