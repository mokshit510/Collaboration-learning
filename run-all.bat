@echo off
setlocal
cd /d "%~dp0"

echo =================================================================
echo   PRAMAAN: Multi-Service Launcher
echo =================================================================

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0run-all.ps1" %*

if errorlevel 1 (
    echo.
    echo [ERROR] PRAMAAN launcher encountered an error.
    pause
    exit /b %errorlevel%
)

:: If double-clicked from Windows File Explorer, pause so the summary is readable
echo %cmdcmdline% | findstr /i /c:"%~nx0" >nul
if not errorlevel 1 (
    echo.
    echo Press any key to close this launcher summary window...
    pause >nul
)
