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
