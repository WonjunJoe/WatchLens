#!/bin/bash
trap 'kill 0; exit' SIGINT

echo "🚀 Starting backend + frontend..."

# Backend (venv/bin/python 직접 사용 — activate 스크립트가 깨져있어 우회)
(cd backend && ./venv/bin/python -m uvicorn app.main:app --reload) &

# Frontend
(cd frontend && npm run dev) &

wait
