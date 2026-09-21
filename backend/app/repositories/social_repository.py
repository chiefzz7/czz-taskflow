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


class SQLSocialRepository(SocialRepository):
    """Implementação real conectada ao Supabase PostgreSQL via SQLModel."""

    def __init__(self) -> None:
        from app.core.database import engine
        self.engine = engine

    async def get_by_id(self, id: str) -> Optional[SocialPost]:
        from sqlmodel import Session
        with Session(self.engine) as session:
            return session.get(SocialPost, id)

    async def list_all(self) -> List[SocialPost]:
        from sqlmodel import Session, select
        with Session(self.engine) as session:
            statement = select(SocialPost).order_by(SocialPost.created_at.desc())
            return list(session.exec(statement).all())

    async def save(self, post: SocialPost) -> SocialPost:
        from sqlmodel import Session
        with Session(self.engine) as session:
            post.updated_at = datetime.now(timezone.utc)
            merged = session.merge(post)
            session.commit()
            session.refresh(merged)
            return merged

    async def delete(self, id: str) -> bool:
        from sqlmodel import Session
        with Session(self.engine) as session:
            post = session.get(SocialPost, id)
            if post:
                session.delete(post)
                session.commit()
                return True
            return False

    async def list_by_creator(self, creator_id: str) -> List[SocialPost]:
        from sqlmodel import Session, select
        with Session(self.engine) as session:
            statement = (
                select(SocialPost)
                .where(SocialPost.creator_id == creator_id, SocialPost.workspace == WorkspaceType.personal)
                .order_by(SocialPost.created_at.desc())
            )
            return list(session.exec(statement).all())

    async def list_by_enterprise(self, enterprise_id: str) -> List[SocialPost]:
        from sqlmodel import Session, select
        with Session(self.engine) as session:
            statement = (
                select(SocialPost)
                .where(SocialPost.enterprise_id == enterprise_id)
                .order_by(SocialPost.created_at.desc())
            )
            return list(session.exec(statement).all())

