from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi import WebSocket
import os

from app.core.config import settings
from app.api.routes import auth, tasks, enterprises, dashboard, reports, users, social
from app.websocket.handlers import handle_chat_websocket
from app.utils.seed import run_seed


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup: seed development data."""
    # Create uploads directory for local storage first
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    await run_seed()
    yield
    # Shutdown: nothing to clean up for in-memory storage


app = FastAPI(
    title="TaskFlow API",
    description="Full-stack task management and collaboration platform",
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Static files (uploads) ────────────────────────────────────────────────────
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# ── REST API Routes ───────────────────────────────────────────────────────────
API_PREFIX = "/api/v1"

app.include_router(auth.router, prefix=API_PREFIX)
app.include_router(users.router, prefix=API_PREFIX)
app.include_router(tasks.router, prefix=API_PREFIX)
app.include_router(enterprises.router, prefix=API_PREFIX)
app.include_router(dashboard.router, prefix=API_PREFIX)
app.include_router(reports.router, prefix=API_PREFIX)
app.include_router(social.router, prefix=API_PREFIX)



# ── WebSocket ─────────────────────────────────────────────────────────────────
@app.websocket("/ws/enterprises/{enterprise_id}/chat/{chat_id}")
async def chat_websocket(
    websocket: WebSocket,
    enterprise_id: str,
    chat_id: str,
    token: str,
) -> None:
    """WebSocket endpoint for real-time enterprise chat."""
    await handle_chat_websocket(websocket, enterprise_id, chat_id, token)


# ── Health Check ─────────────────────────────────────────────────────────────
@app.get("/health", tags=["health"])
async def health_check() -> dict:
    return {"status": "healthy", "version": settings.APP_VERSION}


@app.get("/", tags=["root"])
async def root() -> dict:
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs": "/docs",
    }
