@echo off
REM Nova Remote - double-click to start on Windows.
cd /d "%~dp0"
title Nova Remote
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed on this PC.
  echo Install the LTS version from https://nodejs.org, then double-click Start Nova Remote again.
  start "" https://nodejs.org
  pause
  exit /b 1
)
if not exist node_modules\serialport if not exist .install-tried (
  echo First run: installing the serial port library...
  call npm install --omit=dev --no-audit --no-fund
  if errorlevel 1 echo Could not install it now. Using the built-in serial tools instead.
  type nul > .install-tried
)
node server.js %*
pause
