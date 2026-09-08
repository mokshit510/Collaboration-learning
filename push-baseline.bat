@echo off
setlocal
cd /d "%~dp0"

echo =============================================================
echo   PRAMAAN: Pushing BASELINE branch to GitHub
echo   Remote: https://github.com/mokshit510/Collaboration-learning
echo =============================================================
echo.

git push -u origin BASELINE

if errorlevel 1 (
    echo.
    echo =============================================================
    echo   [ERROR] Push failed or was cancelled.
    echo   If prompted, please sign in with your GitHub account.
    echo =============================================================
) else (
    echo.
    echo =============================================================
    echo   [SUCCESS] Branch BASELINE successfully pushed to origin!
    echo =============================================================
)

echo.
pause
