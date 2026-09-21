from typing import Optional
from datetime import datetime, timezone
import uuid

from sqlmodel import SQLModel, Field
from app.models.enums import UserStatus, ThemePreference


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(SQLModel, table=True):
    """Core user entity. Designed for PostgreSQL but works with any SQLModel-compatible DB."""

    __tablename__ = "users"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    name: str = Field(max_length=128)
    email: str = Field(unique=True, index=True, max_length=256)
    password_hash: str = Field(exclude=True)  # never expose in responses
    avatar_url: Optional[str] = Field(default=None, max_length=512)
    status: UserStatus = Field(default=UserStatus.active)
    theme: ThemePreference = Field(default=ThemePreference.system)
    timezone: str = Field(default="UTC", max_length=64)
    preferences: Optional[str] = Field(default=None)  # JSON string for future use
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)
