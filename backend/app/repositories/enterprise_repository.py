from typing import Optional, List, Dict
from datetime import datetime, timezone

from app.repositories.base import BaseRepository
from app.models.enterprise import Enterprise, EnterpriseMember, EnterpriseCustomRole, EnterpriseInvitation
from app.models.enums import EnterpriseRole, MemberStatus


class EnterpriseRepository(BaseRepository[Enterprise]):
    async def get_by_id(self, id: str) -> Optional[Enterprise]: ...
    async def list_all(self) -> List[Enterprise]: ...
    async def save(self, entity: Enterprise) -> Enterprise: ...
    async def delete(self, id: str) -> bool: ...

    async def get_by_invite_code(self, invite_code: str) -> Optional[Enterprise]: ...
    async def list_by_member(self, user_id: str) -> List[Enterprise]: ...
    async def get_member(self, enterprise_id: str, user_id: str) -> Optional[EnterpriseMember]: ...
    async def list_members(self, enterprise_id: str) -> List[EnterpriseMember]: ...
    async def save_member(self, member: EnterpriseMember) -> EnterpriseMember: ...
    async def remove_member(self, enterprise_id: str, user_id: str) -> bool: ...

    # Roles / Cargos
    async def list_roles(self, enterprise_id: str) -> List[EnterpriseCustomRole]: ...
    async def get_role(self, role_id: str) -> Optional[EnterpriseCustomRole]: ...
    async def save_role(self, role: EnterpriseCustomRole) -> EnterpriseCustomRole: ...
    async def delete_role(self, role_id: str) -> bool: ...

    # Invitations
    async def list_invitations(self, enterprise_id: str) -> List[EnterpriseInvitation]: ...
    async def get_invitation_by_token(self, token: str) -> Optional[EnterpriseInvitation]: ...
    async def get_invitations_by_email(self, email: str) -> List[EnterpriseInvitation]: ...
    async def save_invitation(self, invitation: EnterpriseInvitation) -> EnterpriseInvitation: ...
    async def delete_invitation(self, invitation_id: str) -> bool: ...


class InMemoryEnterpriseRepository(EnterpriseRepository):
    """Development in-memory enterprise storage."""

    def __init__(self) -> None:
        self._enterprises: Dict[str, Enterprise] = {}
        self._members: Dict[str, List[EnterpriseMember]] = {}  # enterprise_id → members
        self._roles: Dict[str, EnterpriseCustomRole] = {}
        self._invitations: Dict[str, EnterpriseInvitation] = {}

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

    async def get_by_invite_code(self, invite_code: str) -> Optional[Enterprise]:
        return next((e for e in self._enterprises.values() if e.invite_code == invite_code), None)

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

    async def list_roles(self, enterprise_id: str) -> List[EnterpriseCustomRole]:
        return [r for r in self._roles.values() if r.enterprise_id == enterprise_id]

    async def get_role(self, role_id: str) -> Optional[EnterpriseCustomRole]:
        return self._roles.get(role_id)

    async def save_role(self, role: EnterpriseCustomRole) -> EnterpriseCustomRole:
        role.updated_at = datetime.now(timezone.utc)
        self._roles[role.id] = role
        return role

    async def delete_role(self, role_id: str) -> bool:
        return self._roles.pop(role_id, None) is not None

    async def list_invitations(self, enterprise_id: str) -> List[EnterpriseInvitation]:
        return [inv for inv in self._invitations.values() if inv.enterprise_id == enterprise_id and inv.status == "pending"]

    async def get_invitation_by_token(self, token: str) -> Optional[EnterpriseInvitation]:
        return next((inv for inv in self._invitations.values() if inv.token == token), None)

    async def get_invitations_by_email(self, email: str) -> List[EnterpriseInvitation]:
        return [inv for inv in self._invitations.values() if inv.email.lower() == email.lower() and inv.status == "pending"]

    async def save_invitation(self, invitation: EnterpriseInvitation) -> EnterpriseInvitation:
        self._invitations[invitation.id] = invitation
        return invitation

    async def delete_invitation(self, invitation_id: str) -> bool:
        return self._invitations.pop(invitation_id, None) is not None


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

    async def get_by_invite_code(self, invite_code: str) -> Optional[Enterprise]:
        from sqlmodel import Session, select
        with Session(self.engine) as session:
            statement = select(Enterprise).where(Enterprise.invite_code == invite_code)
            return session.exec(statement).first()

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

    async def list_roles(self, enterprise_id: str) -> List[EnterpriseCustomRole]:
        from sqlmodel import Session, select
        with Session(self.engine) as session:
            statement = select(EnterpriseCustomRole).where(EnterpriseCustomRole.enterprise_id == enterprise_id)
            return list(session.exec(statement).all())

    async def get_role(self, role_id: str) -> Optional[EnterpriseCustomRole]:
        from sqlmodel import Session
        with Session(self.engine) as session:
            return session.get(EnterpriseCustomRole, role_id)

    async def save_role(self, role: EnterpriseCustomRole) -> EnterpriseCustomRole:
        from sqlmodel import Session
        with Session(self.engine) as session:
            role.updated_at = datetime.now(timezone.utc)
            merged = session.merge(role)
            session.commit()
            session.refresh(merged)
            return merged

    async def delete_role(self, role_id: str) -> bool:
        from sqlmodel import Session, select
        with Session(self.engine) as session:
            role = session.get(EnterpriseCustomRole, role_id)
            if role:
                # Unlink from members
                members = session.exec(
                    select(EnterpriseMember).where(EnterpriseMember.custom_role_id == role_id)
                ).all()
                for m in members:
                    m.custom_role_id = None
                    session.add(m)
                session.delete(role)
                session.commit()
                return True
            return False

    async def list_invitations(self, enterprise_id: str) -> List[EnterpriseInvitation]:
        from sqlmodel import Session, select
        with Session(self.engine) as session:
            statement = select(EnterpriseInvitation).where(
                EnterpriseInvitation.enterprise_id == enterprise_id,
                EnterpriseInvitation.status == "pending",
            )
            return list(session.exec(statement).all())

    async def get_invitation_by_token(self, token: str) -> Optional[EnterpriseInvitation]:
        from sqlmodel import Session, select
        with Session(self.engine) as session:
            statement = select(EnterpriseInvitation).where(EnterpriseInvitation.token == token)
            return session.exec(statement).first()

    async def get_invitations_by_email(self, email: str) -> List[EnterpriseInvitation]:
        from sqlmodel import Session, select
        with Session(self.engine) as session:
            statement = select(EnterpriseInvitation).where(
                EnterpriseInvitation.email == email.lower(),
                EnterpriseInvitation.status == "pending",
            )
            return list(session.exec(statement).all())

    async def save_invitation(self, invitation: EnterpriseInvitation) -> EnterpriseInvitation:
        from sqlmodel import Session
        with Session(self.engine) as session:
            merged = session.merge(invitation)
            session.commit()
            session.refresh(merged)
            return merged

    async def delete_invitation(self, invitation_id: str) -> bool:
        from sqlmodel import Session
        with Session(self.engine) as session:
            inv = session.get(EnterpriseInvitation, invitation_id)
            if inv:
                session.delete(inv)
                session.commit()
                return True
            return False
