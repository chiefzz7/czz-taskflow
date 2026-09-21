from typing import Optional, List
from datetime import datetime, timezone
import uuid

from fastapi import HTTPException, status

from app.repositories.enterprise_repository import EnterpriseRepository
from app.repositories.user_repository import UserRepository
from app.models.enterprise import Enterprise, EnterpriseMember
from app.models.enums import EnterpriseRole, MemberStatus
from app.schemas.enterprise import (
    EnterpriseCreate, EnterpriseUpdate, EnterpriseRead,
    MemberRead, MemberInvite, MemberRoleUpdate,
)
from app.schemas.user import UserRead


class EnterpriseService:
    def __init__(
        self,
        enterprise_repo: EnterpriseRepository,
        user_repo: UserRepository,
    ) -> None:
        self._repo = enterprise_repo
        self._user_repo = user_repo

    async def create_enterprise(self, data: EnterpriseCreate, owner_id: str) -> EnterpriseRead:
        enterprise = Enterprise(
            name=data.name,
            description=data.description,
            logo_url=data.logo_url,
            owner_id=owner_id,
        )
        saved = await self._repo.save(enterprise)

        # Owner is automatically an admin member
        member = EnterpriseMember(
            enterprise_id=saved.id,
            user_id=owner_id,
            role=EnterpriseRole.admin,
            status=MemberStatus.active,
        )
        await self._repo.save_member(member)

        return EnterpriseRead.model_validate(saved)

    async def get_enterprise(self, enterprise_id: str, user_id: str) -> EnterpriseRead:
        enterprise = await self._repo.get_by_id(enterprise_id)
        if not enterprise:
            raise HTTPException(status_code=404, detail="Enterprise not found")
        member = await self._repo.get_member(enterprise_id, user_id)
        if not member or member.status != MemberStatus.active:
            raise HTTPException(status_code=403, detail="Not a member of this enterprise")
        return EnterpriseRead.model_validate(enterprise)

    async def list_user_enterprises(self, user_id: str) -> List[EnterpriseRead]:
        enterprises = await self._repo.list_by_member(user_id)
        return [EnterpriseRead.model_validate(e) for e in enterprises]

    async def update_enterprise(
        self, enterprise_id: str, data: EnterpriseUpdate, user_id: str
    ) -> EnterpriseRead:
        enterprise = await self._repo.get_by_id(enterprise_id)
        if not enterprise:
            raise HTTPException(status_code=404, detail="Enterprise not found")
        await self._require_role(enterprise_id, user_id, EnterpriseRole.admin)

        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(enterprise, field, value)

        saved = await self._repo.save(enterprise)
        return EnterpriseRead.model_validate(saved)

    async def list_members(self, enterprise_id: str, user_id: str) -> List[MemberRead]:
        await self._ensure_member(enterprise_id, user_id)
        members = await self._repo.list_members(enterprise_id)
        result = []
        for m in members:
            user = await self._user_repo.get_by_id(m.user_id)
            mr = MemberRead.model_validate(m)
            if user:
                mr.user = UserRead.model_validate(user)
            result.append(mr)
        return result

    async def add_member(
        self, enterprise_id: str, data: MemberInvite, requesting_user_id: str
    ) -> MemberRead:
        await self._require_role(enterprise_id, requesting_user_id, EnterpriseRole.admin)
        user = await self._user_repo.get_by_id(data.user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        existing = await self._repo.get_member(enterprise_id, data.user_id)
        if existing and existing.status == MemberStatus.active:
            raise HTTPException(status_code=409, detail="User is already a member")

        member = EnterpriseMember(
            enterprise_id=enterprise_id,
            user_id=data.user_id,
            role=data.role,
            status=MemberStatus.active,
        )
        saved = await self._repo.save_member(member)
        mr = MemberRead.model_validate(saved)
        mr.user = UserRead.model_validate(user)
        return mr

    async def update_member_role(
        self, enterprise_id: str, target_user_id: str, data: MemberRoleUpdate, requesting_user_id: str
    ) -> MemberRead:
        await self._require_role(enterprise_id, requesting_user_id, EnterpriseRole.admin)
        member = await self._repo.get_member(enterprise_id, target_user_id)
        if not member:
            raise HTTPException(status_code=404, detail="Member not found")
        member.role = data.role
        saved = await self._repo.save_member(member)
        mr = MemberRead.model_validate(saved)
        user = await self._user_repo.get_by_id(target_user_id)
        if user:
            mr.user = UserRead.model_validate(user)
        return mr

    async def remove_member(
        self, enterprise_id: str, target_user_id: str, requesting_user_id: str
    ) -> None:
        await self._require_role(enterprise_id, requesting_user_id, EnterpriseRole.admin)
        removed = await self._repo.remove_member(enterprise_id, target_user_id)
        if not removed:
            raise HTTPException(status_code=404, detail="Member not found")

    # ── RBAC helpers ─────────────────────────────────────────────────────────

    async def _ensure_member(self, enterprise_id: str, user_id: str) -> EnterpriseMember:
        member = await self._repo.get_member(enterprise_id, user_id)
        if not member or member.status != MemberStatus.active:
            raise HTTPException(status_code=403, detail="Not a member of this enterprise")
        return member

    async def _require_role(
        self, enterprise_id: str, user_id: str, min_role: EnterpriseRole
    ) -> EnterpriseMember:
        member = await self._ensure_member(enterprise_id, user_id)
        role_hierarchy = {
            EnterpriseRole.member: 0,
            EnterpriseRole.manager: 1,
            EnterpriseRole.admin: 2,
        }
        if role_hierarchy[member.role] < role_hierarchy[min_role]:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return member

    async def get_member_role(self, enterprise_id: str, user_id: str) -> Optional[EnterpriseRole]:
        member = await self._repo.get_member(enterprise_id, user_id)
        if member and member.status == MemberStatus.active:
            return member.role
        return None
