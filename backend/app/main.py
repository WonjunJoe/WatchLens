# backend/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers.upload import router as upload_router
from app.routers.stats import router as stats_router

app = FastAPI(title="WatchLens API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload_router)
app.include_router(stats_router)

@app.get("/health")
def health():
    return {"status": "ok"}
