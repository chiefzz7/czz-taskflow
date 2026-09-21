from typing import List, Optional
from datetime import datetime, timezone
from fastapi import HTTPException, status

from app.models.social import SocialPost, SocialPostStatus
from app.models.enums import WorkspaceType
from app.schemas.social import (
    SocialPostCreate, SocialPostUpdate, SocialPostStatusUpdate,
)
from app.repositories.social_repository import SocialRepository
from app.repositories.enterprise_repository import EnterpriseRepository
from app.repositories.user_repository import UserRepository
from app.services.storage_service import StorageService


class SocialService:
    def __init__(
        self,
        social_repo: SocialRepository,
        enterprise_repo: EnterpriseRepository,
        user_repo: UserRepository,
        storage_service: StorageService,
    ) -> None:
        self.social_repo = social_repo
        self.enterprise_repo = enterprise_repo
        self.user_repo = user_repo
        self.storage_service = storage_service

    async def list_posts(
        self,
        user_id: str,
        workspace: WorkspaceType = WorkspaceType.personal,
        enterprise_id: Optional[str] = None,
    ) -> List[SocialPost]:
        if workspace == WorkspaceType.enterprise and enterprise_id:
            return await self.social_repo.list_by_enterprise(enterprise_id)
        return await self.social_repo.list_by_creator(user_id)

    async def create_post(
        self,
        data: SocialPostCreate,
        user_id: str,
    ) -> SocialPost:
        responsible_name = None
        if data.responsible_id:
            user = await self.user_repo.get_by_id(data.responsible_id)
            if user:
                responsible_name = user.name
        elif data.responsible_name:
            responsible_name = data.responsible_name

        post = SocialPost(
            title=data.title,
            caption=data.caption,
            media_url=data.media_url,
            media_type=data.media_type,
            platform=data.platform,
            status=data.status,
            scheduled_at=data.scheduled_at,
            responsible_id=data.responsible_id,
            responsible_name=responsible_name,
            workspace=data.workspace,
            enterprise_id=data.enterprise_id,
            creator_id=user_id,
        )
        return await self.social_repo.save(post)

    async def get_post(self, post_id: str, user_id: str) -> SocialPost:
        post = await self.social_repo.get_by_id(post_id)
        if not post:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Publicação não encontrada")
        return post

    async def update_post(
        self,
        post_id: str,
        data: SocialPostUpdate,
        user_id: str,
    ) -> SocialPost:
        post = await self.get_post(post_id, user_id)

        update_data = data.model_dump(exclude_unset=True)
        if "responsible_id" in update_data:
            if update_data["responsible_id"]:
                resp_user = await self.user_repo.get_by_id(update_data["responsible_id"])
                post.responsible_name = resp_user.name if resp_user else None
            else:
                post.responsible_name = update_data.get("responsible_name")

        for key, val in update_data.items():
            setattr(post, key, val)

        return await self.social_repo.save(post)

    async def update_status(
        self,
        post_id: str,
        data: SocialPostStatusUpdate,
        user_id: str,
    ) -> SocialPost:
        post = await self.get_post(post_id, user_id)
        post.status = data.status
        return await self.social_repo.save(post)

    async def delete_post(self, post_id: str, user_id: str) -> None:
        post = await self.get_post(post_id, user_id)
        await self.social_repo.delete(post.id)

    async def upload_media(self, file_bytes: bytes, filename: str, content_type: str) -> str:
        """Salva a arte e retorna a URL pública."""
        import uuid
        ext = filename.split(".")[-1] if "." in filename else "png"
        key = f"social/{uuid.uuid4()}.{ext}"
        return await self.storage_service.upload(file_bytes, key, content_type)
