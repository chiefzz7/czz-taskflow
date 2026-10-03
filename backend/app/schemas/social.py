from typing import Optional, List
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


class EditRequest(BaseModel):
    """Solicitacao de edicao em um post."""
    edit_notes: str = Field(min_length=1, max_length=2000)
    edit_example_url: Optional[str] = None


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
    needs_edit: bool = False
    edit_notes: Optional[str] = None
    edit_example_url: Optional[str] = None
    edit_requested_by_id: Optional[str] = None
    edit_requested_by_name: Optional[str] = None
    approved_by_id: Optional[str] = None
    approved_by_name: Optional[str] = None
    approved_at: Optional[datetime] = None
    workspace: WorkspaceType
    enterprise_id: Optional[str] = None
    creator_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# --- Social Settings ----------------------------------------------------------

class SocialSettingsUpdate(BaseModel):
    """Atualizacao de configuracoes de redes sociais da empresa."""
    can_move_to_producao: Optional[List[str]] = None   # lista de custom_role_ids; None = qualquer um
    can_move_to_revisao: Optional[List[str]] = None
    can_approve: Optional[List[str]] = None
    can_mark_posted: Optional[List[str]] = None
    can_request_edit: Optional[List[str]] = None
    active_platforms: Optional[List[str]] = None


class SocialSettingsRead(BaseModel):
    enterprise_id: str
    can_move_to_producao: Optional[List[str]] = None
    can_move_to_revisao: Optional[List[str]] = None
    can_approve: Optional[List[str]] = None
    can_mark_posted: Optional[List[str]] = None
    can_request_edit: Optional[List[str]] = None
    active_platforms: Optional[List[str]] = None

    class Config:
        from_attributes = True
