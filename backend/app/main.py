import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers.upload import router as upload_router
from app.routers.stats import router as stats_router
from app.routers.instagram import router as instagram_router
from app.routers.wellbeing import router as wellbeing_router

app = FastAPI(title="WatchLens API")

FRONTEND_URL = os.getenv("FRONTEND_URL", "")

_origins = ["http://localhost:5173", "http://localhost:5174"]
if FRONTEND_URL:
    _origins.append(FRONTEND_URL)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload_router)
app.include_router(stats_router)
app.include_router(instagram_router)
app.include_router(wellbeing_router)

@app.get("/health")
def health():
    return {"status": "ok"}
