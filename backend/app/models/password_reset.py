from datetime import datetime, timezone, timedelta
import uuid

from sqlmodel import SQLModel, Field


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def expiry_15min() -> datetime:
    return datetime.now(timezone.utc) + timedelta(minutes=15)


class PasswordResetToken(SQLModel, table=True):
    """Token for password reset flow. Expires in 15 minutes and can only be used once."""

    __tablename__ = "password_reset_tokens"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    user_id: str = Field(index=True)
    token: str = Field(unique=True, index=True)
    expires_at: datetime = Field(default_factory=expiry_15min)
    used: bool = Field(default=False)
    created_at: datetime = Field(default_factory=utcnow)
