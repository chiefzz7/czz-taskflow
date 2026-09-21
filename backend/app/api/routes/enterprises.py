from typing import List, Optional
from fastapi import APIRouter, Depends, Query

from app.schemas.enterprise import (
    EnterpriseCreate, EnterpriseUpdate, EnterpriseRead,
    MemberRead, MemberInvite, MemberRoleUpdate,
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


# ── Members ──────────────────────────────────────────────────────────────────

@router.get("/{enterprise_id}/members", response_model=List[MemberRead])
async def list_members(
    enterprise_id: str,
    current_user: User = Depends(get_current_user),
) -> List[MemberRead]:
    return await enterprise_service.list_members(enterprise_id, current_user.id)


@router.post("/{enterprise_id}/members", response_model=MemberRead, status_code=201)
async def add_member(
    enterprise_id: str,
    data: MemberInvite,
    current_user: User = Depends(require_enterprise_role(EnterpriseRole.admin)),
) -> MemberRead:
    return await enterprise_service.add_member(enterprise_id, data, current_user.id)


@router.patch("/{enterprise_id}/members/{user_id}", response_model=MemberRead)
async def update_member_role(
    enterprise_id: str,
    user_id: str,
    data: MemberRoleUpdate,
    current_user: User = Depends(require_enterprise_role(EnterpriseRole.admin)),
) -> MemberRead:
    return await enterprise_service.update_member_role(enterprise_id, user_id, data, current_user.id)


@router.delete("/{enterprise_id}/members/{user_id}", status_code=204)
async def remove_member(
    enterprise_id: str,
    user_id: str,
    current_user: User = Depends(require_enterprise_role(EnterpriseRole.admin)),
) -> None:
    await enterprise_service.remove_member(enterprise_id, user_id, current_user.id)


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
    # Force enterprise context
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
