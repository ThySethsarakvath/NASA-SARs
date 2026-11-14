@echo off
setlocal
cd /d "%~dp0"
echo Starting Cambodia frontend at http://127.0.0.1:5173/
echo Keep this window open while using the site. Press Ctrl+C to stop.
echo If port 5173 is already in use, the site may already be running.
powershell.exe -NoProfile -File "%~dp0scripts\run.ps1" dev
echo.
echo The frontend server has stopped. Review any error above.
pause
