#!/bin/bash
trap 'kill 0; exit' SIGINT

echo "🚀 Starting backend + frontend..."

# Backend
(cd backend && source venv/bin/activate && uvicorn app.main:app --reload) &

# Frontend
(cd frontend && npm run dev) &

wait
