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
    invite_code: Optional[str] = Field(default=None, max_length=64, index=True)
    settings: Optional[str] = Field(default=None)  # JSON string
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)


class EnterpriseCustomRole(SQLModel, table=True):
    """Custom roles/cargos created within an enterprise."""

    __tablename__ = "enterprise_custom_roles"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    enterprise_id: str = Field(foreign_key="enterprises.id", index=True)
    name: str = Field(max_length=64)
    description: Optional[str] = Field(default=None, max_length=256)
    color: str = Field(default="#6366f1", max_length=32)
    permissions: Optional[str] = Field(default=None)  # JSON string
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
    custom_role_id: Optional[str] = Field(default=None, foreign_key="enterprise_custom_roles.id")
    job_title: Optional[str] = Field(default=None, max_length=128)
    status: MemberStatus = Field(default=MemberStatus.active)
    joined_at: datetime = Field(default_factory=utcnow)


class EnterpriseInvitation(SQLModel, table=True):
    """Pending or accepted invitations to join an enterprise."""

    __tablename__ = "enterprise_invitations"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    enterprise_id: str = Field(foreign_key="enterprises.id", index=True)
    email: str = Field(max_length=256, index=True)
    role: EnterpriseRole = Field(default=EnterpriseRole.member)
    custom_role_id: Optional[str] = Field(default=None)
    job_title: Optional[str] = Field(default=None, max_length=128)
    invited_by: str = Field(foreign_key="users.id")
    status: str = Field(default="pending", max_length=32)  # pending, accepted, cancelled
    token: str = Field(default_factory=lambda: str(uuid.uuid4()), unique=True, index=True)
    created_at: datetime = Field(default_factory=utcnow)

