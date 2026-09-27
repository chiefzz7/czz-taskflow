from typing import Optional, List, Dict
from datetime import datetime, timezone
import time

from app.repositories.base import BaseRepository
from app.models.user import User


class UserRepository(BaseRepository[User]):
    """Abstract interface for user data access."""

    async def get_by_email(self, email: str) -> Optional[User]:
        ...

    async def get_by_id(self, id: str) -> Optional[User]:
        ...

    async def get_by_ids(self, ids: List[str]) -> Dict[str, User]:
        ...

    async def list_all(self) -> List[User]:
        ...

    async def save(self, entity: User) -> User:
        ...

    async def delete(self, id: str) -> bool:
        ...


class InMemoryUserRepository(UserRepository):
    """
    Development-only in-memory implementation.
    """

    def __init__(self) -> None:
        self._store: Dict[str, User] = {}
        self._email_index: Dict[str, str] = {}  # email → id

    async def get_by_id(self, id: str) -> Optional[User]:
        return self._store.get(id)

    async def get_by_ids(self, ids: List[str]) -> Dict[str, User]:
        return {uid: self._store[uid] for uid in ids if uid in self._store}

    async def get_by_email(self, email: str) -> Optional[User]:
        uid = self._email_index.get(email.lower())
        if uid:
            return self._store.get(uid)
        return None

    async def list_all(self) -> List[User]:
        return list(self._store.values())

    async def save(self, user: User) -> User:
        user.updated_at = datetime.now(timezone.utc)
        self._store[user.id] = user
        self._email_index[user.email.lower()] = user.id
        return user

    async def delete(self, id: str) -> bool:
        user = self._store.pop(id, None)
        if user:
            self._email_index.pop(user.email.lower(), None)
            return True
        return False


class SQLUserRepository(UserRepository):
    """Implementação conectada ao Supabase PostgreSQL via SQLModel com cache em memória."""

    def __init__(self) -> None:
        from app.core.database import engine
        self.engine = engine
        # In-memory user cache: user_id -> (User, timestamp)
        self._cache: Dict[str, tuple[User, float]] = {}
        self._cache_ttl = 120.0  # 2 minutes TTL

    def _get_from_cache(self, user_id: str) -> Optional[User]:
        cached = self._cache.get(user_id)
        if cached:
            user_obj, ts = cached
            if time.time() - ts < self._cache_ttl:
                return user_obj
            del self._cache[user_id]
        return None

    def _put_cache(self, user: User) -> None:
        self._cache[user.id] = (user, time.time())

    async def get_by_id(self, id: str) -> Optional[User]:
        cached = self._get_from_cache(id)
        if cached:
            return cached

        from sqlmodel import Session
        with Session(self.engine) as session:
            user = session.get(User, id)
            if user:
                self._put_cache(user)
            return user

    async def get_by_ids(self, ids: List[str]) -> Dict[str, User]:
        if not ids:
            return {}

        result: Dict[str, User] = {}
        missing_ids: List[str] = []

        for uid in ids:
            cached = self._get_from_cache(uid)
            if cached:
                result[uid] = cached
            else:
                missing_ids.append(uid)

        if missing_ids:
            from sqlmodel import Session, select
            with Session(self.engine) as session:
                statement = select(User).where(User.id.in_(missing_ids))
                db_users = session.exec(statement).all()
                for u in db_users:
                    self._put_cache(u)
                    result[u.id] = u

        return result

    async def get_by_email(self, email: str) -> Optional[User]:
        from sqlmodel import Session, select
        with Session(self.engine) as session:
            statement = select(User).where(User.email == email.lower())
            user = session.exec(statement).first()
            if user:
                self._put_cache(user)
            return user

    async def list_all(self) -> List[User]:
        from sqlmodel import Session, select
        with Session(self.engine) as session:
            users = list(session.exec(select(User)).all())
            for u in users:
                self._put_cache(u)
            return users

    async def save(self, user: User) -> User:
        from sqlmodel import Session
        with Session(self.engine) as session:
            user.updated_at = datetime.now(timezone.utc)
            merged = session.merge(user)
            session.commit()
            session.refresh(merged)
            self._put_cache(merged)
            return merged

    async def delete(self, id: str) -> bool:
        self._cache.pop(id, None)
        from sqlmodel import Session
        with Session(self.engine) as session:
            user = session.get(User, id)
            if user:
                session.delete(user)
                session.commit()
                return True
            return False
