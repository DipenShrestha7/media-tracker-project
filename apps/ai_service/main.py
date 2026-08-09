# app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes import router as api_router

app = FastAPI(
    title="Nexus AI Chatbot Service",
    version="1.0.0",
    description="Backend API for Nexus Personal Media Tracker AI",
)
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://localhost:8001",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")


@app.get("/")
async def root():
    return {"service": "Nexus AI Engine", "status": "online"}


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "Nexus AI Engine"}
