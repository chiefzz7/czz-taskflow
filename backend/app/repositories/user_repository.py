from typing import Optional, List, Dict
from datetime import datetime, timezone

from app.repositories.base import BaseRepository
from app.models.user import User


class UserRepository(BaseRepository[User]):
    """Abstract interface for user data access."""

    async def get_by_email(self, email: str) -> Optional[User]:
        ...

    async def get_by_id(self, id: str) -> Optional[User]:
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
    Will be replaced by SQLUserRepository when PostgreSQL is introduced.
    """

    def __init__(self) -> None:
        self._store: Dict[str, User] = {}
        self._email_index: Dict[str, str] = {}  # email → id

    async def get_by_id(self, id: str) -> Optional[User]:
        return self._store.get(id)

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
    """Implementação real conectada ao Supabase PostgreSQL via SQLModel."""

    def __init__(self) -> None:
        from app.core.database import engine
        self.engine = engine

    async def get_by_id(self, id: str) -> Optional[User]:
        from sqlmodel import Session
        with Session(self.engine) as session:
            return session.get(User, id)

    async def get_by_email(self, email: str) -> Optional[User]:
        from sqlmodel import Session, select
        with Session(self.engine) as session:
            statement = select(User).where(User.email == email.lower())
            return session.exec(statement).first()

    async def list_all(self) -> List[User]:
        from sqlmodel import Session, select
        with Session(self.engine) as session:
            return list(session.exec(select(User)).all())

    async def save(self, user: User) -> User:
        from sqlmodel import Session
        with Session(self.engine) as session:
            user.updated_at = datetime.now(timezone.utc)
            # Merge / Add
            merged = session.merge(user)
            session.commit()
            session.refresh(merged)
            return merged

    async def delete(self, id: str) -> bool:
        from sqlmodel import Session
        with Session(self.engine) as session:
            user = session.get(User, id)
            if user:
                session.delete(user)
                session.commit()
                return True
            return False

