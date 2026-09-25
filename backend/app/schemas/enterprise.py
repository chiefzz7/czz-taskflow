from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel

from app.models.enums import EnterpriseRole, MemberStatus
from app.schemas.user import UserRead


class EnterpriseCreate(BaseModel):
    name: str
    description: Optional[str] = None
    logo_url: Optional[str] = None


class EnterpriseUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    logo_url: Optional[str] = None


class EnterpriseCustomRoleCreate(BaseModel):
    name: str
    description: Optional[str] = None
    color: str = "#6366f1"
    permissions: Optional[str] = None


class EnterpriseCustomRoleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    permissions: Optional[str] = None


class EnterpriseCustomRoleRead(BaseModel):
    id: str
    enterprise_id: str
    name: str
    description: Optional[str] = None
    color: str
    permissions: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class EnterpriseRead(BaseModel):
    id: str
    name: str
    description: Optional[str]
    logo_url: Optional[str]
    owner_id: str
    invite_code: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class MemberRead(BaseModel):
    id: str
    enterprise_id: str
    user_id: str
    role: EnterpriseRole
    custom_role_id: Optional[str] = None
    job_title: Optional[str] = None
    custom_role: Optional[EnterpriseCustomRoleRead] = None
    status: MemberStatus
    joined_at: datetime
    user: Optional[UserRead] = None

    class Config:
        from_attributes = True


class MemberInvite(BaseModel):
    user_id: Optional[str] = None
    email: Optional[str] = None
    role: EnterpriseRole = EnterpriseRole.member
    custom_role_id: Optional[str] = None
    job_title: Optional[str] = None


class MemberRoleUpdate(BaseModel):
    role: Optional[EnterpriseRole] = None
    custom_role_id: Optional[str] = None
    job_title: Optional[str] = None
    status: Optional[MemberStatus] = None


class EnterpriseInvitationRead(BaseModel):
    id: str
    enterprise_id: str
    email: str
    role: EnterpriseRole
    custom_role_id: Optional[str] = None
    job_title: Optional[str] = None
    custom_role: Optional[EnterpriseCustomRoleRead] = None
    status: str
    token: str
    created_at: datetime

    class Config:
        from_attributes = True


class JoinEnterpriseRequest(BaseModel):
    invite_code: str


class InviteCodeResponse(BaseModel):
    invite_code: str
    invite_link: str
