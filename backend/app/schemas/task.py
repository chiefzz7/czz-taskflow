from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel

from app.models.enums import (
    TaskStatus, TaskPriority, WorkspaceType, RecurrenceType
)


# ── Recurrence ────────────────────────────────────────────────────────────────

class RecurrenceCreate(BaseModel):
    type: RecurrenceType
    interval: int = 1
    days_of_week: Optional[List[int]] = None
    end_date: Optional[datetime] = None
    max_occurrences: Optional[int] = None


class RecurrenceRead(BaseModel):
    id: str
    type: RecurrenceType
    interval: int
    days_of_week: Optional[List[int]]
    end_date: Optional[datetime]
    max_occurrences: Optional[int]

    class Config:
        from_attributes = True


# ── Task ─────────────────────────────────────────────────────────────────────

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    notes: Optional[str] = None
    status: TaskStatus = TaskStatus.todo
    priority: TaskPriority = TaskPriority.none
    workspace: WorkspaceType = WorkspaceType.personal
    enterprise_id: Optional[str] = None
    responsible_id: Optional[str] = None
    is_public: bool = False
    planned_start_at: Optional[datetime] = None
    due_at: Optional[datetime] = None
    recurrence: Optional[RecurrenceCreate] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[TaskStatus] = None
    priority: Optional[TaskPriority] = None
    responsible_id: Optional[str] = None
    is_public: Optional[bool] = None
    planned_start_at: Optional[datetime] = None
    due_at: Optional[datetime] = None


class TaskStatusUpdate(BaseModel):
    status: TaskStatus


class TaskRead(BaseModel):
    id: str
    title: str
    description: Optional[str]
    notes: Optional[str]
    status: TaskStatus
    priority: TaskPriority
    workspace: WorkspaceType
    enterprise_id: Optional[str]
    creator_id: str
    responsible_id: Optional[str]
    is_public: bool
    planned_start_at: Optional[datetime]
    started_at: Optional[datetime]
    due_at: Optional[datetime]
    completed_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    assignee_ids: List[str] = []
    recurrence: Optional[RecurrenceRead] = None

    class Config:
        from_attributes = True


class TaskFilters(BaseModel):
    status: Optional[TaskStatus] = None
    priority: Optional[TaskPriority] = None
    search: Optional[str] = None
    enterprise_id: Optional[str] = None
    workspace: Optional[WorkspaceType] = None
