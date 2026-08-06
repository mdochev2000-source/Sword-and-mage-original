@echo off
chcp 65001 >nul
title sword and MAGE
cd /d "%~dp0docs"

rem --- намираме Python (за малкия локален сървър) ---
set "PY="
where python >nul 2>&1 && set "PY=python"
if not defined PY where py >nul 2>&1 && set "PY=py"
if not defined PY if exist "E:\APP\PYTHON\python.exe" set "PY=E:\APP\PYTHON\python.exe"

if not defined PY (
  echo Python не е намерен — отварям играта направо от файла.
  start "" "%~dp0bezdna-online.html"
  exit /b
)

rem --- ако сървърът вече върви, само отваряме играта ---
netstat -ano | findstr /r /c:":8123 .*LISTENING" >nul 2>&1
if %errorlevel%==0 (
  start "" "http://localhost:8123/"
  exit /b
)

echo Пускам играта на http://localhost:8123/
start "sword and MAGE server" /min "%PY%" -m http.server 8123 --bind 127.0.0.1
timeout /t 2 /nobreak >nul
start "" "http://localhost:8123/"
exit /b
