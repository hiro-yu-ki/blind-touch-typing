@echo off
setlocal EnableExtensions
title Shigoto Type Desktop Launcher

set "PROJECT_LAUNCHER="
for /d %%D in ("%USERPROFILE%\product\*") do (
  if exist "%%~fD\launch.ps1" if exist "%%~fD\src\data.ts" set "PROJECT_LAUNCHER=%%~fD\launch.ps1"
)

if not defined PROJECT_LAUNCHER (
  echo [ERROR] The Shigoto Type application folder was not found.
  echo Expected location: somewhere under "%USERPROFILE%\product"
  echo Keep the application folder in place and move only this desktop launcher.
  pause
  exit /b 1
)

powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%PROJECT_LAUNCHER%"
set "RESULT=%ERRORLEVEL%"

if not "%RESULT%"=="0" (
  echo.
  echo [ERROR] Shigoto Type could not start from the desktop launcher.
  echo See the logs folder beside: "%PROJECT_LAUNCHER%"
  pause
  exit /b %RESULT%
)

endlocal
exit /b 0
