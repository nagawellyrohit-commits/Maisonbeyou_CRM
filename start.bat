@echo off
pushd "%~dp0"
title Maison BeYou CRM Launcher
echo ========================================================
echo           Starting Maison BeYou CRM
echo ========================================================
echo.
echo 1. Starting Backend API Server (Port 5001)...
start "Maison BeYou Backend" cmd /k "cd /d ""%~dp0"" && node server/index.js"

timeout /t 2 /nobreak >nul

echo 2. Starting Frontend Development Server (Port 5173)...
start "Maison BeYou Frontend" cmd /k "cd /d ""%~dp0"" && node ./node_modules/vite/bin/vite.js"

timeout /t 2 /nobreak >nul

echo 3. Opening CRM in default browser...
start http://localhost:5173

echo.
echo ========================================================
echo  Maison BeYou CRM is up and running!
echo  URL: http://localhost:5173
echo.
echo  Default Credentials:
echo   - Admin:     admin@maisonbeyou.com     / admin123
echo   - Reception: reception@maisonbeyou.com / reception123
echo ========================================================
pause
popd
