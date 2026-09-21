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


class EnterpriseRead(BaseModel):
    id: str
    name: str
    description: Optional[str]
    logo_url: Optional[str]
    owner_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class MemberRead(BaseModel):
    id: str
    enterprise_id: str
    user_id: str
    role: EnterpriseRole
    status: MemberStatus
    joined_at: datetime
    user: Optional[UserRead] = None

    class Config:
        from_attributes = True


class MemberInvite(BaseModel):
    user_id: str
    role: EnterpriseRole = EnterpriseRole.member


class MemberRoleUpdate(BaseModel):
    role: EnterpriseRole
