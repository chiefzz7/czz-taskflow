from typing import Optional, List, Dict
from datetime import datetime, timezone

from app.repositories.base import BaseRepository
from app.models.enterprise import Enterprise, EnterpriseMember
from app.models.enums import EnterpriseRole, MemberStatus


class EnterpriseRepository(BaseRepository[Enterprise]):
    async def get_by_id(self, id: str) -> Optional[Enterprise]: ...
    async def list_all(self) -> List[Enterprise]: ...
    async def save(self, entity: Enterprise) -> Enterprise: ...
    async def delete(self, id: str) -> bool: ...

    async def list_by_member(self, user_id: str) -> List[Enterprise]: ...
    async def get_member(self, enterprise_id: str, user_id: str) -> Optional[EnterpriseMember]: ...
    async def list_members(self, enterprise_id: str) -> List[EnterpriseMember]: ...
    async def save_member(self, member: EnterpriseMember) -> EnterpriseMember: ...
    async def remove_member(self, enterprise_id: str, user_id: str) -> bool: ...


class InMemoryEnterpriseRepository(EnterpriseRepository):
    """Development in-memory enterprise storage."""

    def __init__(self) -> None:
        self._enterprises: Dict[str, Enterprise] = {}
        self._members: Dict[str, List[EnterpriseMember]] = {}  # enterprise_id → members

    async def get_by_id(self, id: str) -> Optional[Enterprise]:
        return self._enterprises.get(id)

    async def list_all(self) -> List[Enterprise]:
        return list(self._enterprises.values())

    async def save(self, enterprise: Enterprise) -> Enterprise:
        enterprise.updated_at = datetime.now(timezone.utc)
        self._enterprises[enterprise.id] = enterprise
        return enterprise

    async def delete(self, id: str) -> bool:
        if id in self._enterprises:
            del self._enterprises[id]
            self._members.pop(id, None)
            return True
        return False

    async def list_by_member(self, user_id: str) -> List[Enterprise]:
        result = []
        for eid, members in self._members.items():
            if any(m.user_id == user_id and m.status == MemberStatus.active for m in members):
                enterprise = self._enterprises.get(eid)
                if enterprise:
                    result.append(enterprise)
        return result

    async def get_member(self, enterprise_id: str, user_id: str) -> Optional[EnterpriseMember]:
        members = self._members.get(enterprise_id, [])
        return next((m for m in members if m.user_id == user_id), None)

    async def list_members(self, enterprise_id: str) -> List[EnterpriseMember]:
        return self._members.get(enterprise_id, [])

    async def save_member(self, member: EnterpriseMember) -> EnterpriseMember:
        if member.enterprise_id not in self._members:
            self._members[member.enterprise_id] = []
        members = self._members[member.enterprise_id]
        # Update if exists, otherwise append
        for i, m in enumerate(members):
            if m.user_id == member.user_id:
                members[i] = member
                return member
        members.append(member)
        return member

    async def remove_member(self, enterprise_id: str, user_id: str) -> bool:
        members = self._members.get(enterprise_id, [])
        filtered = [m for m in members if m.user_id != user_id]
        if len(filtered) < len(members):
            self._members[enterprise_id] = filtered
            return True
        return False


class SQLEnterpriseRepository(EnterpriseRepository):
    """Implementação real conectada ao Supabase PostgreSQL via SQLModel."""

    def __init__(self) -> None:
        from app.core.database import engine
        self.engine = engine

    async def get_by_id(self, id: str) -> Optional[Enterprise]:
        from sqlmodel import Session
        with Session(self.engine) as session:
            return session.get(Enterprise, id)

    async def list_all(self) -> List[Enterprise]:
        from sqlmodel import Session, select
        with Session(self.engine) as session:
            return list(session.exec(select(Enterprise)).all())

    async def save(self, enterprise: Enterprise) -> Enterprise:
        from sqlmodel import Session
        with Session(self.engine) as session:
            enterprise.updated_at = datetime.now(timezone.utc)
            merged = session.merge(enterprise)
            session.commit()
            session.refresh(merged)
            return merged

    async def delete(self, id: str) -> bool:
        from sqlmodel import Session, select
        with Session(self.engine) as session:
            enterprise = session.get(Enterprise, id)
            if enterprise:
                members = session.exec(select(EnterpriseMember).where(EnterpriseMember.enterprise_id == id)).all()
                for m in members:
                    session.delete(m)
                session.delete(enterprise)
                session.commit()
                return True
            return False

    async def list_by_member(self, user_id: str) -> List[Enterprise]:
        from sqlmodel import Session, select
        with Session(self.engine) as session:
            statement = (
                select(Enterprise)
                .join(EnterpriseMember, Enterprise.id == EnterpriseMember.enterprise_id)
                .where(EnterpriseMember.user_id == user_id, EnterpriseMember.status == MemberStatus.active)
            )
            return list(session.exec(statement).all())

    async def get_member(self, enterprise_id: str, user_id: str) -> Optional[EnterpriseMember]:
        from sqlmodel import Session, select
        with Session(self.engine) as session:
            statement = select(EnterpriseMember).where(
                EnterpriseMember.enterprise_id == enterprise_id,
                EnterpriseMember.user_id == user_id,
            )
            return session.exec(statement).first()

    async def list_members(self, enterprise_id: str) -> List[EnterpriseMember]:
        from sqlmodel import Session, select
        with Session(self.engine) as session:
            statement = select(EnterpriseMember).where(EnterpriseMember.enterprise_id == enterprise_id)
            return list(session.exec(statement).all())

    async def save_member(self, member: EnterpriseMember) -> EnterpriseMember:
        from sqlmodel import Session
        with Session(self.engine) as session:
            merged = session.merge(member)
            session.commit()
            session.refresh(merged)
            return merged

    async def remove_member(self, enterprise_id: str, user_id: str) -> bool:
        from sqlmodel import Session, select
        with Session(self.engine) as session:
            statement = select(EnterpriseMember).where(
                EnterpriseMember.enterprise_id == enterprise_id,
                EnterpriseMember.user_id == user_id,
            )
            member = session.exec(statement).first()
            if member:
                session.delete(member)
                session.commit()
                return True
            return False

