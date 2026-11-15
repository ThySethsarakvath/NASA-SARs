@echo off
setlocal
cd /d "%~dp0"
echo Starting Cambodia frontend for sharing on your local network.
echo Share the Network URL printed by Vite, not 127.0.0.1.
echo Keep this window open. Press Ctrl+C to stop sharing.
echo If port 5173 is already in use, stop the existing frontend server first.
powershell.exe -NoProfile -File "%~dp0scripts\run.ps1" dev-lan
echo.
echo The frontend server has stopped. Review any error above.
pause
