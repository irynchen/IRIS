from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .database import run_create_tables
from .routers import health, day_plan, home
from .auth import jwt as auth_jwt

app = FastAPI()

origins = [
    "https://iris.goeloria.de",
    "http://localhost:5173",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_jwt.router)
app.include_router(health.router)
app.include_router(day_plan.router)
app.include_router(home.router)

@app.on_event("startup")
def startup_event():
    # create tables on startup
    run_create_tables()

@app.get("/api/health-check")
def health_check():
    return {"status": "ok"}
