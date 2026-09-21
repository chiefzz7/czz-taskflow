from typing import Optional
from datetime import datetime, timezone
import uuid

from sqlmodel import SQLModel, Field
from app.models.enums import EnterpriseRole, MemberStatus


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Enterprise(SQLModel, table=True):
    """Enterprise (organization) entity."""

    __tablename__ = "enterprises"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    name: str = Field(max_length=128)
    description: Optional[str] = Field(default=None)
    logo_url: Optional[str] = Field(default=None, max_length=512)
    owner_id: str = Field(foreign_key="users.id")
    settings: Optional[str] = Field(default=None)  # JSON string
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)


class EnterpriseMember(SQLModel, table=True):
    """
    Membership join table — enterprise-specific role is stored here,
    NOT on the User model. This keeps User clean and supports multi-enterprise memberships.
    """

    __tablename__ = "enterprise_members"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    enterprise_id: str = Field(foreign_key="enterprises.id", index=True)
    user_id: str = Field(foreign_key="users.id", index=True)
    role: EnterpriseRole = Field(default=EnterpriseRole.member)
    status: MemberStatus = Field(default=MemberStatus.active)
    joined_at: datetime = Field(default_factory=utcnow)
