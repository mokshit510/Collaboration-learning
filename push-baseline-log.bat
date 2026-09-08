@echo off
setlocal
cd /d "%~dp0"
git push -u origin BASELINE > push_out.log 2>&1
echo EXITCODE: %ERRORLEVEL% >> push_out.log
