from typing import List, Optional
from fastapi import APIRouter, Depends, Query

from app.schemas.enterprise import (
    EnterpriseCreate, EnterpriseUpdate, EnterpriseRead,
    EnterpriseCustomRoleCreate, EnterpriseCustomRoleUpdate, EnterpriseCustomRoleRead,
    MemberRead, MemberInvite, MemberRoleUpdate, EnterpriseInvitationRead,
    InviteCodeResponse,
)
from app.schemas.task import TaskCreate, TaskUpdate, TaskStatusUpdate, TaskRead
from app.schemas.chat import ChatCreate, ChatRead, MessageRead
from app.models.user import User
from app.models.enums import TaskStatus, EnterpriseRole
from app.dependencies.auth import get_current_user
from app.dependencies.rbac import require_enterprise_role
from app.dependencies.container import enterprise_service, task_service, chat_service

router = APIRouter(prefix="/enterprises", tags=["enterprises"])


# ── Enterprise CRUD ──────────────────────────────────────────────────────────

@router.get("/", response_model=List[EnterpriseRead])
async def list_enterprises(current_user: User = Depends(get_current_user)) -> List[EnterpriseRead]:
    """List all enterprises the current user belongs to."""
    return await enterprise_service.list_user_enterprises(current_user.id)


@router.post("/", response_model=EnterpriseRead, status_code=201)
async def create_enterprise(
    data: EnterpriseCreate,
    current_user: User = Depends(get_current_user),
) -> EnterpriseRead:
    """Create a new enterprise. Creator becomes admin."""
    return await enterprise_service.create_enterprise(data=data, owner_id=current_user.id)


@router.post("/join/{invite_code}", response_model=EnterpriseRead)
async def join_enterprise(
    invite_code: str,
    current_user: User = Depends(get_current_user),
) -> EnterpriseRead:
    """Join an enterprise using an invite code."""
    return await enterprise_service.join_by_invite_code(invite_code, current_user.id)


@router.get("/{enterprise_id}", response_model=EnterpriseRead)
async def get_enterprise(
    enterprise_id: str,
    current_user: User = Depends(get_current_user),
) -> EnterpriseRead:
    return await enterprise_service.get_enterprise(enterprise_id, current_user.id)


@router.patch("/{enterprise_id}", response_model=EnterpriseRead)
async def update_enterprise(
    enterprise_id: str,
    data: EnterpriseUpdate,
    current_user: User = Depends(require_enterprise_role(EnterpriseRole.admin)),
) -> EnterpriseRead:
    return await enterprise_service.update_enterprise(enterprise_id, data, current_user.id)


# ── Invite Code ──────────────────────────────────────────────────────────────

@router.get("/{enterprise_id}/invite-code", response_model=InviteCodeResponse)
async def get_invite_code(
    enterprise_id: str,
    current_user: User = Depends(get_current_user),
) -> InviteCodeResponse:
    """Get the active invite code and shareable link."""
    return await enterprise_service.get_invite_code(enterprise_id, current_user.id)


@router.post("/{enterprise_id}/invite-code/regenerate", response_model=InviteCodeResponse)
async def regenerate_invite_code(
    enterprise_id: str,
    current_user: User = Depends(require_enterprise_role(EnterpriseRole.admin)),
) -> InviteCodeResponse:
    """Regenerate the invite code (invalidates previous link)."""
    return await enterprise_service.regenerate_invite_code(enterprise_id, current_user.id)


# ── Roles (Cargos) ───────────────────────────────────────────────────────────

@router.get("/{enterprise_id}/roles", response_model=List[EnterpriseCustomRoleRead])
async def list_roles(
    enterprise_id: str,
    current_user: User = Depends(get_current_user),
) -> List[EnterpriseCustomRoleRead]:
    """List all custom cargos/roles defined in the enterprise."""
    return await enterprise_service.list_roles(enterprise_id, current_user.id)


@router.post("/{enterprise_id}/roles", response_model=EnterpriseCustomRoleRead, status_code=201)
async def create_role(
    enterprise_id: str,
    data: EnterpriseCustomRoleCreate,
    current_user: User = Depends(require_enterprise_role(EnterpriseRole.manager)),
) -> EnterpriseCustomRoleRead:
    """Create a new custom cargo/role in the enterprise."""
    return await enterprise_service.create_role(enterprise_id, data, current_user.id)


@router.patch("/{enterprise_id}/roles/{role_id}", response_model=EnterpriseCustomRoleRead)
async def update_role(
    enterprise_id: str,
    role_id: str,
    data: EnterpriseCustomRoleUpdate,
    current_user: User = Depends(require_enterprise_role(EnterpriseRole.manager)),
) -> EnterpriseCustomRoleRead:
    """Update a custom cargo/role."""
    return await enterprise_service.update_role(enterprise_id, role_id, data, current_user.id)


@router.delete("/{enterprise_id}/roles/{role_id}", status_code=204)
async def delete_role(
    enterprise_id: str,
    role_id: str,
    current_user: User = Depends(require_enterprise_role(EnterpriseRole.admin)),
) -> None:
    """Delete a custom cargo/role."""
    await enterprise_service.delete_role(enterprise_id, role_id, current_user.id)


# ── Members ──────────────────────────────────────────────────────────────────

@router.get("/{enterprise_id}/members", response_model=List[MemberRead])
async def list_members(
    enterprise_id: str,
    current_user: User = Depends(get_current_user),
) -> List[MemberRead]:
    """List all enterprise members with their assigned cargo and access level."""
    return await enterprise_service.list_members(enterprise_id, current_user.id)


@router.post("/{enterprise_id}/members", response_model=MemberRead, status_code=201)
async def add_member(
    enterprise_id: str,
    data: MemberInvite,
    current_user: User = Depends(require_enterprise_role(EnterpriseRole.manager)),
) -> MemberRead:
    """Invite or add a member to the enterprise by user ID or email."""
    return await enterprise_service.add_member(enterprise_id, data, current_user.id)


@router.patch("/{enterprise_id}/members/{user_id}", response_model=MemberRead)
async def update_member_role(
    enterprise_id: str,
    user_id: str,
    data: MemberRoleUpdate,
    current_user: User = Depends(require_enterprise_role(EnterpriseRole.admin)),
) -> MemberRead:
    """Update a member's role, cargo (custom role), job title, or status."""
    return await enterprise_service.update_member_role(enterprise_id, user_id, data, current_user.id)


@router.delete("/{enterprise_id}/members/{user_id}", status_code=204)
async def remove_member(
    enterprise_id: str,
    user_id: str,
    current_user: User = Depends(require_enterprise_role(EnterpriseRole.admin)),
) -> None:
    """Remove a member from the enterprise."""
    await enterprise_service.remove_member(enterprise_id, user_id, current_user.id)


# ── Invitations ──────────────────────────────────────────────────────────────

@router.get("/{enterprise_id}/invitations", response_model=List[EnterpriseInvitationRead])
async def list_invitations(
    enterprise_id: str,
    current_user: User = Depends(get_current_user),
) -> List[EnterpriseInvitationRead]:
    """List pending email invitations for the enterprise."""
    return await enterprise_service.list_invitations(enterprise_id, current_user.id)


@router.delete("/{enterprise_id}/invitations/{invitation_id}", status_code=204)
async def cancel_invitation(
    enterprise_id: str,
    invitation_id: str,
    current_user: User = Depends(require_enterprise_role(EnterpriseRole.manager)),
) -> None:
    """Cancel a pending invitation."""
    await enterprise_service.cancel_invitation(enterprise_id, invitation_id, current_user.id)


# ── Enterprise Tasks ──────────────────────────────────────────────────────────

@router.get("/{enterprise_id}/tasks", response_model=List[TaskRead])
async def list_enterprise_tasks(
    enterprise_id: str,
    status: Optional[TaskStatus] = Query(None),
    search: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
) -> List[TaskRead]:
    return await task_service.list_enterprise_tasks(
        enterprise_id=enterprise_id,
        user_id=current_user.id,
        status=status,
        search=search,
    )


@router.post("/{enterprise_id}/tasks", response_model=TaskRead, status_code=201)
async def create_enterprise_task(
    enterprise_id: str,
    data: TaskCreate,
    current_user: User = Depends(get_current_user),
) -> TaskRead:
    data.enterprise_id = enterprise_id
    from app.models.enums import WorkspaceType
    data.workspace = WorkspaceType.enterprise
    return await task_service.create_task(data=data, creator_id=current_user.id)


# ── Enterprise Chat ───────────────────────────────────────────────────────────

@router.get("/{enterprise_id}/chats", response_model=List[ChatRead])
async def list_chats(
    enterprise_id: str,
    current_user: User = Depends(get_current_user),
) -> List[ChatRead]:
    return await chat_service.list_chats(enterprise_id, current_user.id)


@router.post("/{enterprise_id}/chats", response_model=ChatRead, status_code=201)
async def create_chat(
    enterprise_id: str,
    data: ChatCreate,
    current_user: User = Depends(get_current_user),
) -> ChatRead:
    return await chat_service.create_chat(enterprise_id, data, current_user.id)


@router.get("/{enterprise_id}/chats/{chat_id}/messages", response_model=List[MessageRead])
async def get_messages(
    enterprise_id: str,
    chat_id: str,
    current_user: User = Depends(get_current_user),
) -> List[MessageRead]:
    return await chat_service.get_messages(chat_id, enterprise_id, current_user.id)
