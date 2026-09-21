from typing import Optional, List, Dict
from datetime import datetime, timezone
from app.repositories.base import BaseRepository
from app.models.social import SocialPost, SocialPostStatus, SocialPlatform
from app.models.enums import WorkspaceType


class SocialRepository(BaseRepository[SocialPost]):
    async def get_by_id(self, id: str) -> Optional[SocialPost]: ...
    async def list_all(self) -> List[SocialPost]: ...
    async def save(self, entity: SocialPost) -> SocialPost: ...
    async def delete(self, id: str) -> bool: ...

    async def list_by_creator(self, creator_id: str) -> List[SocialPost]: ...
    async def list_by_enterprise(self, enterprise_id: str) -> List[SocialPost]: ...


class InMemorySocialRepository(SocialRepository):
    """Armazenamento em memória para posts de redes sociais durante o desenvolvimento."""

    def __init__(self) -> None:
        self._posts: Dict[str, SocialPost] = {}

    async def get_by_id(self, id: str) -> Optional[SocialPost]:
        return self._posts.get(id)

    async def list_all(self) -> List[SocialPost]:
        return sorted(self._posts.values(), key=lambda p: p.created_at, reverse=True)

    async def save(self, post: SocialPost) -> SocialPost:
        post.updated_at = datetime.now(timezone.utc)
        self._posts[post.id] = post
        return post

    async def delete(self, id: str) -> bool:
        if id in self._posts:
            del self._posts[id]
            return True
        return False

    async def list_by_creator(self, creator_id: str) -> List[SocialPost]:
        return sorted(
            [p for p in self._posts.values() if p.creator_id == creator_id and p.workspace == WorkspaceType.personal],
            key=lambda p: p.created_at,
            reverse=True,
        )

    async def list_by_enterprise(self, enterprise_id: str) -> List[SocialPost]:
        return sorted(
            [p for p in self._posts.values() if p.enterprise_id == enterprise_id],
            key=lambda p: p.created_at,
            reverse=True,
        )
