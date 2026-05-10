@echo off
echo ====================================
echo   Joyphone ERP - Local Web Server
echo ====================================
echo.
echo Starting server...
echo Server akan berjalan di: http://localhost:8000
echo.
echo Tekan Ctrl+C untuk menghentikan server
echo.

REM Buka browser otomatis setelah 2 detik
start "" "http://localhost:8000/index.html"

REM Jalankan Python HTTP server
python -m http.server 8000

pause
