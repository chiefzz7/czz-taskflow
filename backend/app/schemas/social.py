from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field
from app.models.social import SocialPlatform, SocialPostStatus, SocialMediaType
from app.models.enums import WorkspaceType


class SocialPostCreate(BaseModel):
    title: str = Field(min_length=1, max_length=256)
    caption: Optional[str] = None
    media_url: Optional[str] = None
    media_type: SocialMediaType = SocialMediaType.image
    platform: SocialPlatform = SocialPlatform.instagram
    status: SocialPostStatus = SocialPostStatus.ideia
    scheduled_at: Optional[datetime] = None
    responsible_id: Optional[str] = None
    responsible_name: Optional[str] = None
    workspace: WorkspaceType = WorkspaceType.personal
    enterprise_id: Optional[str] = None


class SocialPostUpdate(BaseModel):
    title: Optional[str] = None
    caption: Optional[str] = None
    media_url: Optional[str] = None
    media_type: Optional[SocialMediaType] = None
    platform: Optional[SocialPlatform] = None
    status: Optional[SocialPostStatus] = None
    scheduled_at: Optional[datetime] = None
    responsible_id: Optional[str] = None
    responsible_name: Optional[str] = None


class SocialPostStatusUpdate(BaseModel):
    status: SocialPostStatus


class SocialPostRead(BaseModel):
    id: str
    title: str
    caption: Optional[str] = None
    media_url: Optional[str] = None
    media_type: SocialMediaType
    platform: SocialPlatform
    status: SocialPostStatus
    scheduled_at: Optional[datetime] = None
    responsible_id: Optional[str] = None
    responsible_name: Optional[str] = None
    workspace: WorkspaceType
    enterprise_id: Optional[str] = None
    creator_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
