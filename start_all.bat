@echo off
title ITMS Unified Launcher
echo ========================================================
echo  Launching Intelligent Traffic Management System (ITMS)
echo ========================================================
echo.
echo Starting Backend Service (FastAPI + YOLOv8)...
start "ITMS Backend" cmd /k "cd /d %~dp0backend && .venv\Scripts\python -m uvicorn main:app --host 0.0.0.0 --port 8000"
timeout /t 4 /nobreak >nul

echo Starting Frontend Web Dashboard (React + Vite)...
start "ITMS Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"
timeout /t 2 /nobreak >nul

echo.
echo [SUCCESS] ITMS is running!
echo   - Web Dashboard: http://localhost:5173
echo   - Backend API:   http://localhost:8000
echo   - Interactive API Docs: http://localhost:8000/docs
echo.
pause
