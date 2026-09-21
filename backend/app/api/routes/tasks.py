from typing import List, Optional
from fastapi import APIRouter, Depends, Query

from app.schemas.task import TaskCreate, TaskUpdate, TaskStatusUpdate, TaskRead
from app.models.user import User
from app.models.enums import TaskStatus, TaskPriority
from app.dependencies.auth import get_current_user
from app.dependencies.container import task_service

router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.get("/", response_model=List[TaskRead])
async def list_tasks(
    status: Optional[TaskStatus] = Query(None),
    search: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
) -> List[TaskRead]:
    """List the current user's personal tasks with optional filters."""
    return await task_service.list_personal_tasks(
        user_id=current_user.id,
        status=status,
        search=search,
    )


@router.post("/", response_model=TaskRead, status_code=201)
async def create_task(
    data: TaskCreate,
    current_user: User = Depends(get_current_user),
) -> TaskRead:
    """Create a new personal task."""
    return await task_service.create_task(data=data, creator_id=current_user.id)


@router.get("/{task_id}", response_model=TaskRead)
async def get_task(
    task_id: str,
    current_user: User = Depends(get_current_user),
) -> TaskRead:
    """Get a specific task by ID."""
    return await task_service.get_task(task_id=task_id, user_id=current_user.id)


@router.patch("/{task_id}", response_model=TaskRead)
async def update_task(
    task_id: str,
    data: TaskUpdate,
    current_user: User = Depends(get_current_user),
) -> TaskRead:
    """Update a task's fields."""
    return await task_service.update_task(task_id=task_id, data=data, user_id=current_user.id)


@router.patch("/{task_id}/status", response_model=TaskRead)
async def update_task_status(
    task_id: str,
    data: TaskStatusUpdate,
    current_user: User = Depends(get_current_user),
) -> TaskRead:
    """Update only the status of a task."""
    return await task_service.update_status(task_id=task_id, data=data, user_id=current_user.id)


@router.delete("/{task_id}", status_code=204)
async def delete_task(
    task_id: str,
    current_user: User = Depends(get_current_user),
) -> None:
    """Delete a task. Only the creator can delete."""
    await task_service.delete_task(task_id=task_id, user_id=current_user.id)


@router.post("/{task_id}/assignees/{user_id}", response_model=TaskRead)
async def add_assignee(
    task_id: str,
    user_id: str,
    current_user: User = Depends(get_current_user),
) -> TaskRead:
    """Add an assignee to a task."""
    return await task_service.add_assignee(
        task_id=task_id,
        assignee_user_id=user_id,
        requesting_user_id=current_user.id,
    )


@router.delete("/{task_id}/assignees/{user_id}", response_model=TaskRead)
async def remove_assignee(
    task_id: str,
    user_id: str,
    current_user: User = Depends(get_current_user),
) -> TaskRead:
    """Remove an assignee from a task."""
    return await task_service.remove_assignee(
        task_id=task_id,
        assignee_user_id=user_id,
        requesting_user_id=current_user.id,
    )
