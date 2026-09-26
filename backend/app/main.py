from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi import WebSocket
import os

from app.core.config import settings
from app.core.database import create_db_and_tables
from app.api.routes import auth, tasks, enterprises, dashboard, reports, users, social, chat
from app.websocket.handlers import handle_chat_websocket
from app.utils.seed import run_seed
# Import all models so SQLModel.metadata knows about them and creates all tables
import app.models.password_reset  # noqa: F401
import app.models.chat  # noqa: F401


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup: create tables and seed development data."""
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    create_db_and_tables()  # Ensures all tables exist (including new ones like password_reset_tokens)
    await run_seed()
    yield
    # Shutdown: nothing to clean up


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
    allow_origin_regex=r"^https?://.*",
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
app.include_router(chat.router, prefix=API_PREFIX)



# ── WebSocket ─────────────────────────────────────────────────────────────────
@app.websocket("/ws/chat/{chat_id}")
async def universal_chat_websocket(
    websocket: WebSocket,
    chat_id: str,
    token: str,
) -> None:
    """Universal WebSocket endpoint for real-time chat (enterprise or personal)."""
    await handle_chat_websocket(websocket, chat_id=chat_id, token=token)


@app.websocket("/ws/enterprises/{enterprise_id}/chat/{chat_id}")
async def enterprise_chat_websocket(
    websocket: WebSocket,
    enterprise_id: str,
    chat_id: str,
    token: str,
) -> None:
    """WebSocket endpoint for real-time enterprise chat."""
    await handle_chat_websocket(websocket, chat_id=chat_id, token=token, enterprise_id=enterprise_id)



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
