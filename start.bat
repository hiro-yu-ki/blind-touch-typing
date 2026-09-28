@echo off
setlocal
title Shigoto Type Launcher

set "APP_ROOT=%~dp0"
set "LAUNCHER=%APP_ROOT%launch.ps1"

if not exist "%LAUNCHER%" (
  echo [ERROR] launch.ps1 was not found.
  echo Keep start.bat inside the application folder.
  pause
  exit /b 1
)

powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%LAUNCHER%"
set "RESULT=%ERRORLEVEL%"

if not "%RESULT%"=="0" (
  echo.
  echo [ERROR] Shigoto Type could not start.
  echo Diagnostic log: "%APP_ROOT%logs\launcher.log"
  echo.
  if exist "%APP_ROOT%logs\launcher.log" type "%APP_ROOT%logs\launcher.log"
  echo.
  pause
  exit /b %RESULT%
)

endlocal
exit /b 0
