from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import create_tables
from routers import health, day_plan, home, health_doctors, health_medications, goals
from auth import jwt as auth_jwt


@asynccontextmanager
async def lifespan(app: FastAPI):
    await create_tables()
    yield


app = FastAPI(lifespan=lifespan)

origins = [
    "https://iris.goeloria.de",
    "http://localhost:5173",
    "http://localhost:3000",
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
app.include_router(health_doctors.router)
app.include_router(health_medications.router)
app.include_router(goals.router)


@app.get("/api/health-check")
def health_check():
    return {"status": "ok"}
