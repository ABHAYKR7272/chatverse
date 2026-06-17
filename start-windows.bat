@echo off
echo Starting CHATRIX v2.0...
echo.

cd server
start "CHATRIX Server" cmd /k "node index.js"
timeout /t 2 /nobreak > nul

cd ..\client\chatrix-ui
start "CHATRIX Client" cmd /k "npm run dev"

echo.
echo Server:  http://localhost:3001
echo App:     http://localhost:5173
echo.
echo Close the two opened windows to stop CHATRIX.
pause
