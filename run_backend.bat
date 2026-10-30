@echo off
title ITMS AI Backend Server
cd backend
echo =======================================================
echo Starting FastAPI ITMS AI Backend on http://localhost:8005
echo =======================================================
.venv\Scripts\python -m uvicorn main:app --host 0.0.0.0 --port 8005
pause
