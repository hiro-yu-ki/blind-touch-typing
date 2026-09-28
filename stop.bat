@echo off
setlocal
title Stop Shigoto Type
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0stop.ps1"
if errorlevel 1 pause
endlocal
