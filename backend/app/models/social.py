from typing import Optional
from datetime import datetime, timezone
import uuid
from enum import Enum

from sqlmodel import SQLModel, Field
from app.models.enums import WorkspaceType


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class SocialPlatform(str, Enum):
    instagram = "instagram"
    tiktok = "tiktok"
    facebook = "facebook"
    linkedin = "linkedin"
    twitter = "twitter"
    youtube = "youtube"
    threads = "threads"


class SocialPostStatus(str, Enum):
    ideia = "ideia"
    em_producao = "em_producao"
    revisao = "revisao"
    pronto = "pronto"
    postado = "postado"


class SocialMediaType(str, Enum):
    image = "image"
    video = "video"
    carousel = "carousel"
    story = "story"
    reels = "reels"


class SocialPost(SQLModel, table=True):
    """Entidade de post e arte para gestao de Redes Sociais."""

    __tablename__ = "social_posts"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    title: str = Field(max_length=256)
    caption: Optional[str] = Field(default=None)

    # Anexo da arte/midia
    media_url: Optional[str] = Field(default=None)
    media_type: SocialMediaType = Field(default=SocialMediaType.image)

    # Workflow e Agendamento
    platform: SocialPlatform = Field(default=SocialPlatform.instagram)
    status: SocialPostStatus = Field(default=SocialPostStatus.ideia)
    scheduled_at: Optional[datetime] = Field(default=None)

    # Atribuicao de Responsabilidade (especifico ou None = todos)
    responsible_id: Optional[str] = Field(default=None, foreign_key="users.id")
    responsible_name: Optional[str] = Field(default=None)

    # Workflow de Edicao / Revisao
    needs_edit: bool = Field(default=False)
    edit_notes: Optional[str] = Field(default=None)
    edit_example_url: Optional[str] = Field(default=None)
    edit_requested_by_id: Optional[str] = Field(default=None, foreign_key="users.id")
    edit_requested_by_name: Optional[str] = Field(default=None)

    # Aprovacao
    approved_by_id: Optional[str] = Field(default=None, foreign_key="users.id")
    approved_by_name: Optional[str] = Field(default=None)
    approved_at: Optional[datetime] = Field(default=None)

    # Workspace e Contexto
    workspace: WorkspaceType = Field(default=WorkspaceType.personal)
    enterprise_id: Optional[str] = Field(default=None, foreign_key="enterprises.id", index=True)
    creator_id: str = Field(foreign_key="users.id", index=True)

    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)


class SocialSettings(SQLModel, table=True):
    """Configuracoes de Redes Sociais por empresa."""

    __tablename__ = "social_settings"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    enterprise_id: str = Field(foreign_key="enterprises.id", unique=True, index=True)

    # Permissoes: JSON array de custom_role_ids. None = qualquer membro pode.
    can_move_to_producao: Optional[str] = Field(default=None)
    can_move_to_revisao: Optional[str] = Field(default=None)
    can_approve: Optional[str] = Field(default=None)
    can_mark_posted: Optional[str] = Field(default=None)
    can_request_edit: Optional[str] = Field(default=None)

    # JSON array de SocialPlatform strings — plataformas ativas
    active_platforms: Optional[str] = Field(default=None)

    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)
