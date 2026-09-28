@echo off
setlocal EnableExtensions
title Stop Shigoto Type

set "STOP_SCRIPT="
for /d %%D in ("%USERPROFILE%\product\*") do (
  if exist "%%~fD\stop.ps1" if exist "%%~fD\src\data.ts" set "STOP_SCRIPT=%%~fD\stop.ps1"
)

if not defined STOP_SCRIPT (
  echo [ERROR] The Shigoto Type application folder was not found.
  pause
  exit /b 1
)

powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%STOP_SCRIPT%"
if errorlevel 1 pause
endlocal
