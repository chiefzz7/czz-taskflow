from typing import Optional, List
from datetime import datetime, timezone
import uuid

from fastapi import HTTPException, status

from app.repositories.enterprise_repository import EnterpriseRepository
from app.repositories.user_repository import UserRepository
from app.models.enterprise import Enterprise, EnterpriseMember, EnterpriseCustomRole, EnterpriseInvitation
from app.models.enums import EnterpriseRole, MemberStatus
from app.schemas.enterprise import (
    EnterpriseCreate, EnterpriseUpdate, EnterpriseRead,
    EnterpriseCustomRoleCreate, EnterpriseCustomRoleUpdate, EnterpriseCustomRoleRead,
    MemberRead, MemberInvite, MemberRoleUpdate, EnterpriseInvitationRead,
    InviteCodeResponse,
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

    # ── Enterprise CRUD ──────────────────────────────────────────────────────

    async def create_enterprise(self, data: EnterpriseCreate, owner_id: str) -> EnterpriseRead:
        invite_code = f"TF-{uuid.uuid4().hex[:6].upper()}"
        enterprise = Enterprise(
            name=data.name,
            description=data.description,
            logo_url=data.logo_url,
            owner_id=owner_id,
            invite_code=invite_code,
        )
        saved = await self._repo.save(enterprise)

        # Seed default custom roles for the enterprise
        admin_role = EnterpriseCustomRole(
            enterprise_id=saved.id,
            name="Administrador",
            description="Gestão total da empresa, membros e configurações",
            color="#ef4444",
        )
        saved_admin_role = await self._repo.save_role(admin_role)

        default_roles = [
            ("Gerente de Projetos", "Coordenação de tarefas e equipes", "#f59e0b"),
            ("Desenvolvedor", "Execução técnica e desenvolvimento", "#6366f1"),
            ("Designer", "Criação visual, design de produto e UI/UX", "#ec4899"),
            ("Membro da Equipe", "Colaboração e execução de tarefas", "#10b981"),
        ]
        for name, desc, col in default_roles:
            await self._repo.save_role(
                EnterpriseCustomRole(
                    enterprise_id=saved.id,
                    name=name,
                    description=desc,
                    color=col,
                )
            )

        # Owner is automatically an admin member with admin cargo
        member = EnterpriseMember(
            enterprise_id=saved.id,
            user_id=owner_id,
            role=EnterpriseRole.admin,
            custom_role_id=saved_admin_role.id,
            job_title="Administrador Geral",
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

        if not enterprise.invite_code:
            enterprise.invite_code = f"TF-{uuid.uuid4().hex[:6].upper()}"
            enterprise = await self._repo.save(enterprise)

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

    # ── Invite Code & Join ───────────────────────────────────────────────────

    async def get_invite_code(self, enterprise_id: str, user_id: str) -> InviteCodeResponse:
        await self._ensure_member(enterprise_id, user_id)
        enterprise = await self._repo.get_by_id(enterprise_id)
        if not enterprise:
            raise HTTPException(status_code=404, detail="Enterprise not found")

        if not enterprise.invite_code:
            enterprise.invite_code = f"TF-{uuid.uuid4().hex[:6].upper()}"
            enterprise = await self._repo.save(enterprise)

        return InviteCodeResponse(
            invite_code=enterprise.invite_code,
            invite_link=f"/enterprise?join={enterprise.invite_code}",
        )

    async def regenerate_invite_code(self, enterprise_id: str, user_id: str) -> InviteCodeResponse:
        await self._require_role(enterprise_id, user_id, EnterpriseRole.admin)
        enterprise = await self._repo.get_by_id(enterprise_id)
        if not enterprise:
            raise HTTPException(status_code=404, detail="Enterprise not found")

        enterprise.invite_code = f"TF-{uuid.uuid4().hex[:6].upper()}"
        enterprise = await self._repo.save(enterprise)

        return InviteCodeResponse(
            invite_code=enterprise.invite_code,
            invite_link=f"/enterprise?join={enterprise.invite_code}",
        )

    async def join_by_invite_code(self, invite_code: str, user_id: str) -> EnterpriseRead:
        enterprise = await self._repo.get_by_invite_code(invite_code.strip().upper())
        if not enterprise:
            raise HTTPException(status_code=404, detail="Código de convite inválido ou expirado")

        existing_member = await self._repo.get_member(enterprise.id, user_id)
        if existing_member:
            if existing_member.status != MemberStatus.active:
                existing_member.status = MemberStatus.active
                await self._repo.save_member(existing_member)
            return EnterpriseRead.model_validate(enterprise)

        # Assign default member role
        roles = await self._repo.list_roles(enterprise.id)
        default_cargo = next((r for r in roles if "membro" in r.name.lower()), None)

        new_member = EnterpriseMember(
            enterprise_id=enterprise.id,
            user_id=user_id,
            role=EnterpriseRole.member,
            custom_role_id=default_cargo.id if default_cargo else None,
            status=MemberStatus.active,
        )
        await self._repo.save_member(new_member)
        return EnterpriseRead.model_validate(enterprise)

    # ── Custom Roles (Cargos) ────────────────────────────────────────────────

    async def list_roles(self, enterprise_id: str, user_id: str) -> List[EnterpriseCustomRoleRead]:
        await self._ensure_member(enterprise_id, user_id)
        roles = await self._repo.list_roles(enterprise_id)
        return [EnterpriseCustomRoleRead.model_validate(r) for r in roles]

    async def create_role(
        self, enterprise_id: str, data: EnterpriseCustomRoleCreate, user_id: str
    ) -> EnterpriseCustomRoleRead:
        await self._require_role(enterprise_id, user_id, EnterpriseRole.manager)
        role = EnterpriseCustomRole(
            enterprise_id=enterprise_id,
            name=data.name.strip(),
            description=data.description,
            color=data.color or "#6366f1",
            permissions=data.permissions,
        )
        saved = await self._repo.save_role(role)
        return EnterpriseCustomRoleRead.model_validate(saved)

    async def update_role(
        self, enterprise_id: str, role_id: str, data: EnterpriseCustomRoleUpdate, user_id: str
    ) -> EnterpriseCustomRoleRead:
        await self._require_role(enterprise_id, user_id, EnterpriseRole.manager)
        role = await self._repo.get_role(role_id)
        if not role or role.enterprise_id != enterprise_id:
            raise HTTPException(status_code=404, detail="Cargo não encontrado")

        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(role, field, value)

        saved = await self._repo.save_role(role)
        return EnterpriseCustomRoleRead.model_validate(saved)

    async def delete_role(self, enterprise_id: str, role_id: str, user_id: str) -> None:
        await self._require_role(enterprise_id, user_id, EnterpriseRole.admin)
        role = await self._repo.get_role(role_id)
        if not role or role.enterprise_id != enterprise_id:
            raise HTTPException(status_code=404, detail="Cargo não encontrado")

        await self._repo.delete_role(role_id)

    # ── Members Management ───────────────────────────────────────────────────

    async def list_members(self, enterprise_id: str, user_id: str) -> List[MemberRead]:
        await self._ensure_member(enterprise_id, user_id)
        members = await self._repo.list_members(enterprise_id)
        roles_list = await self._repo.list_roles(enterprise_id)
        roles_map = {r.id: EnterpriseCustomRoleRead.model_validate(r) for r in roles_list}

        result = []
        for m in members:
            user = await self._user_repo.get_by_id(m.user_id)
            mr = MemberRead(
                id=m.id,
                enterprise_id=m.enterprise_id,
                user_id=m.user_id,
                role=m.role,
                custom_role_id=m.custom_role_id,
                job_title=m.job_title,
                custom_role=roles_map.get(m.custom_role_id) if m.custom_role_id else None,
                status=m.status,
                joined_at=m.joined_at,
                user=UserRead.model_validate(user) if user else None,
            )
            result.append(mr)
        return result

    async def add_member(
        self, enterprise_id: str, data: MemberInvite, requesting_user_id: str
    ) -> MemberRead:
        await self._require_role(enterprise_id, requesting_user_id, EnterpriseRole.manager)

        target_user = None
        if data.user_id:
            target_user = await self._user_repo.get_by_id(data.user_id)
            if not target_user:
                raise HTTPException(status_code=404, detail="Usuário não encontrado")
        elif data.email:
            clean_email = data.email.strip().lower()
            target_user = await self._user_repo.get_by_email(clean_email)

            if not target_user:
                # User does not exist yet: create an enterprise invitation
                invitation = EnterpriseInvitation(
                    enterprise_id=enterprise_id,
                    email=clean_email,
                    role=data.role,
                    custom_role_id=data.custom_role_id,
                    job_title=data.job_title,
                    invited_by=requesting_user_id,
                    status="pending",
                )
                await self._repo.save_invitation(invitation)

                # Return placeholder member object with status 'invited'
                custom_role_read = None
                if data.custom_role_id:
                    role_obj = await self._repo.get_role(data.custom_role_id)
                    if role_obj:
                        custom_role_read = EnterpriseCustomRoleRead.model_validate(role_obj)

                return MemberRead(
                    id=invitation.id,
                    enterprise_id=enterprise_id,
                    user_id=f"invite_{invitation.id}",
                    role=data.role,
                    custom_role_id=data.custom_role_id,
                    job_title=data.job_title,
                    custom_role=custom_role_read,
                    status=MemberStatus.invited,
                    joined_at=invitation.created_at,
                    user=UserRead(
                        id=f"invite_{invitation.id}",
                        name=clean_email.split('@')[0].capitalize(),
                        email=clean_email,
                        status="active",
                        theme="system",
                        timezone="UTC",
                        created_at=invitation.created_at,
                    ),
                )
        else:
            raise HTTPException(status_code=400, detail="Informe o e-mail ou usuário para convite")

        # User is already in the system
        existing = await self._repo.get_member(enterprise_id, target_user.id)
        if existing and existing.status == MemberStatus.active:
            raise HTTPException(status_code=409, detail="Este usuário já é membro da empresa")

        if existing:
            existing.status = MemberStatus.active
            existing.role = data.role
            existing.custom_role_id = data.custom_role_id
            existing.job_title = data.job_title
            saved = await self._repo.save_member(existing)
        else:
            member = EnterpriseMember(
                enterprise_id=enterprise_id,
                user_id=target_user.id,
                role=data.role,
                custom_role_id=data.custom_role_id,
                job_title=data.job_title,
                status=MemberStatus.active,
            )
            saved = await self._repo.save_member(member)

        custom_role_read = None
        if saved.custom_role_id:
            role_obj = await self._repo.get_role(saved.custom_role_id)
            if role_obj:
                custom_role_read = EnterpriseCustomRoleRead.model_validate(role_obj)

        return MemberRead(
            id=saved.id,
            enterprise_id=saved.enterprise_id,
            user_id=saved.user_id,
            role=saved.role,
            custom_role_id=saved.custom_role_id,
            job_title=saved.job_title,
            custom_role=custom_role_read,
            status=saved.status,
            joined_at=saved.joined_at,
            user=UserRead.model_validate(target_user),
        )

    async def update_member_role(
        self, enterprise_id: str, target_user_id: str, data: MemberRoleUpdate, requesting_user_id: str
    ) -> MemberRead:
        await self._require_role(enterprise_id, requesting_user_id, EnterpriseRole.admin)
        member = await self._repo.get_member(enterprise_id, target_user_id)
        if not member:
            raise HTTPException(status_code=404, detail="Membro não encontrado")

        if data.role is not None:
            member.role = data.role
        if data.custom_role_id is not None:
            member.custom_role_id = data.custom_role_id or None
        if data.job_title is not None:
            member.job_title = data.job_title
        if data.status is not None:
            member.status = data.status

        saved = await self._repo.save_member(member)
        user = await self._user_repo.get_by_id(target_user_id)

        custom_role_read = None
        if saved.custom_role_id:
            role_obj = await self._repo.get_role(saved.custom_role_id)
            if role_obj:
                custom_role_read = EnterpriseCustomRoleRead.model_validate(role_obj)

        return MemberRead(
            id=saved.id,
            enterprise_id=saved.enterprise_id,
            user_id=saved.user_id,
            role=saved.role,
            custom_role_id=saved.custom_role_id,
            job_title=saved.job_title,
            custom_role=custom_role_read,
            status=saved.status,
            joined_at=saved.joined_at,
            user=UserRead.model_validate(user) if user else None,
        )

    async def remove_member(
        self, enterprise_id: str, target_user_id: str, requesting_user_id: str
    ) -> None:
        await self._require_role(enterprise_id, requesting_user_id, EnterpriseRole.admin)
        enterprise = await self._repo.get_by_id(enterprise_id)
        if enterprise and enterprise.owner_id == target_user_id:
            raise HTTPException(status_code=400, detail="Não é possível remover o proprietário da empresa")

        removed = await self._repo.remove_member(enterprise_id, target_user_id)
        if not removed:
            raise HTTPException(status_code=404, detail="Membro não encontrado")

    # ── Pending Invitations ───────────────────────────────────────────────────

    async def list_invitations(self, enterprise_id: str, user_id: str) -> List[EnterpriseInvitationRead]:
        await self._ensure_member(enterprise_id, user_id)
        invitations = await self._repo.list_invitations(enterprise_id)
        roles = await self._repo.list_roles(enterprise_id)
        roles_map = {r.id: EnterpriseCustomRoleRead.model_validate(r) for r in roles}

        result = []
        for inv in invitations:
            ir = EnterpriseInvitationRead(
                id=inv.id,
                enterprise_id=inv.enterprise_id,
                email=inv.email,
                role=inv.role,
                custom_role_id=inv.custom_role_id,
                job_title=inv.job_title,
                custom_role=roles_map.get(inv.custom_role_id) if inv.custom_role_id else None,
                status=inv.status,
                token=inv.token,
                created_at=inv.created_at,
            )
            result.append(ir)
        return result

    async def cancel_invitation(self, enterprise_id: str, invitation_id: str, user_id: str) -> None:
        await self._require_role(enterprise_id, user_id, EnterpriseRole.manager)
        await self._repo.delete_invitation(invitation_id)

    async def process_user_pending_invitations(self, user_id: str, email: str) -> None:
        """When a user registers, auto-join them to enterprises they were invited to."""
        invitations = await self._repo.get_invitations_by_email(email)
        for inv in invitations:
            member = EnterpriseMember(
                enterprise_id=inv.enterprise_id,
                user_id=user_id,
                role=inv.role,
                custom_role_id=inv.custom_role_id,
                job_title=inv.job_title,
                status=MemberStatus.active,
            )
            await self._repo.save_member(member)
            inv.status = "accepted"
            await self._repo.save_invitation(inv)

    # ── RBAC helpers ─────────────────────────────────────────────────────────

    async def _ensure_member(self, enterprise_id: str, user_id: str) -> EnterpriseMember:
        member = await self._repo.get_member(enterprise_id, user_id)
        if not member or member.status != MemberStatus.active:
            raise HTTPException(status_code=403, detail="Não é membro desta empresa")
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
            raise HTTPException(status_code=403, detail="Permissões insuficientes")
        return member

    async def get_member_role(self, enterprise_id: str, user_id: str) -> Optional[EnterpriseRole]:
        member = await self._repo.get_member(enterprise_id, user_id)
        if member and member.status == MemberStatus.active:
            return member.role
        return None
