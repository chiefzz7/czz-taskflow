from typing import Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr

from app.models.enums import UserStatus, ThemePreference


class UserRead(BaseModel):
    """Public-safe user representation — no password_hash."""
    id: str
    name: str
    email: str
    avatar_url: Optional[str]
    status: UserStatus
    theme: ThemePreference
    timezone: str
    created_at: datetime

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    name: Optional[str] = None
    avatar_url: Optional[str] = None
    timezone: Optional[str] = None


class UserPreferencesUpdate(BaseModel):
    theme: Optional[ThemePreference] = None
    timezone: Optional[str] = None
