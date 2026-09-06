@echo off
setlocal
cd /d "%~dp0"
if not exist ".venv\Scripts\python.exe" py -m venv .venv
if errorlevel 1 goto :error
".venv\Scripts\python.exe" -m pip install -r requirements.txt --disable-pip-version-check
if errorlevel 1 goto :error
".venv\Scripts\python.exe" -m playwright install chromium
if errorlevel 1 goto :error
start "reporter.io" /b ".venv\Scripts\python.exe" app.py
timeout /t 2 /nobreak >nul
start "" http://127.0.0.1:5055
exit /b 0
:error
echo Setup failed. Make sure Python 3.10 or newer is installed.
pause
exit /b 1
