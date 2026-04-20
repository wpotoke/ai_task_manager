@echo off
cd /d %~dp0backend
set PYTHONPATH=.
..\venv\Scripts\uvicorn.exe app.main:app --host 0.0.0.0 --port 8001 --reload
