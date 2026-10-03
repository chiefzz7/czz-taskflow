from typing import List, Optional
from datetime import datetime, timezone
import json
from fastapi import HTTPException, status

from app.models.social import SocialPost, SocialPostStatus, SocialSettings
from app.models.enums import WorkspaceType
from app.schemas.social import (
    SocialPostCreate, SocialPostUpdate, SocialPostStatusUpdate,
    EditRequest, SocialSettingsUpdate,
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
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Publicacao nao encontrada")
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

        # Se movendo para "pronto" ou "postado", registrar aprovador
        if data.status in (SocialPostStatus.pronto, SocialPostStatus.postado):
            user = await self.user_repo.get_by_id(user_id)
            post.approved_by_id = user_id
            post.approved_by_name = user.name if user else None
            post.approved_at = datetime.now(timezone.utc)
            # Limpar flag de edicao ao aprovar
            post.needs_edit = False

        return await self.social_repo.save(post)

    async def request_edit(
        self,
        post_id: str,
        data: EditRequest,
        user_id: str,
    ) -> SocialPost:
        """Marca o post como 'precisa editar' com notas e exemplo opcional."""
        post = await self.get_post(post_id, user_id)
        user = await self.user_repo.get_by_id(user_id)

        post.needs_edit = True
        post.edit_notes = data.edit_notes
        post.edit_example_url = data.edit_example_url
        post.edit_requested_by_id = user_id
        post.edit_requested_by_name = user.name if user else None

        return await self.social_repo.save(post)

    async def clear_edit_flag(
        self,
        post_id: str,
        user_id: str,
    ) -> SocialPost:
        """Remove o flag de edicao (a edicao foi realizada)."""
        post = await self.get_post(post_id, user_id)
        post.needs_edit = False
        post.edit_notes = None
        post.edit_example_url = None
        post.edit_requested_by_id = None
        post.edit_requested_by_name = None
        return await self.social_repo.save(post)

    async def delete_post(self, post_id: str, user_id: str) -> None:
        post = await self.get_post(post_id, user_id)
        await self.social_repo.delete(post.id)

    async def upload_media(self, file_bytes: bytes, filename: str, content_type: str) -> str:
        """Salva a arte e retorna a URL publica."""
        import uuid
        ext = filename.split(".")[-1] if "." in filename else "png"
        key = f"social/{uuid.uuid4()}.{ext}"
        return await self.storage_service.upload(file_bytes, key, content_type)

    # --- Settings --------------------------------------------------------------

    def _list_to_json(self, lst: Optional[List[str]]) -> Optional[str]:
        if lst is None:
            return None
        return json.dumps(lst)

    def _json_to_list(self, val: Optional[str]) -> Optional[List[str]]:
        if val is None:
            return None
        try:
            return json.loads(val)
        except Exception:
            return None

    async def get_settings(self, enterprise_id: str) -> dict:
        """Retorna as configuracoes de redes sociais de uma empresa."""
        settings = await self.social_repo.get_settings(enterprise_id)
        if not settings:
            return {
                "enterprise_id": enterprise_id,
                "can_move_to_producao": None,
                "can_move_to_revisao": None,
                "can_approve": None,
                "can_mark_posted": None,
                "can_request_edit": None,
                "active_platforms": None,
            }
        return {
            "enterprise_id": settings.enterprise_id,
            "can_move_to_producao": self._json_to_list(settings.can_move_to_producao),
            "can_move_to_revisao": self._json_to_list(settings.can_move_to_revisao),
            "can_approve": self._json_to_list(settings.can_approve),
            "can_mark_posted": self._json_to_list(settings.can_mark_posted),
            "can_request_edit": self._json_to_list(settings.can_request_edit),
            "active_platforms": self._json_to_list(settings.active_platforms),
        }

    async def update_settings(self, enterprise_id: str, data: SocialSettingsUpdate) -> dict:
        """Cria ou atualiza as configuracoes de redes sociais de uma empresa."""
        settings = await self.social_repo.get_settings(enterprise_id)
        if not settings:
            settings = SocialSettings(enterprise_id=enterprise_id)

        update_data = data.model_dump(exclude_unset=True)
        for key, val in update_data.items():
            setattr(settings, key, self._list_to_json(val) if val is not None else None)

        saved = await self.social_repo.save_settings(settings)
        return await self.get_settings(enterprise_id)
