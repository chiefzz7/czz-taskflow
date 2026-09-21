from typing import Optional, List
from datetime import datetime, timezone
import uuid

from sqlmodel import SQLModel, Field
from app.models.enums import (
    TaskStatus, TaskPriority, WorkspaceType,
    RecurrenceType, ReminderChannel,
)


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Recurrence(SQLModel, table=True):
    """Isolated recurrence configuration — never duplicate recurrence logic elsewhere."""

    __tablename__ = "recurrences"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    type: RecurrenceType
    interval: int = Field(default=1, ge=1)  # every N units
    days_of_week: Optional[str] = Field(default=None)  # JSON: [0,1,2] for Mon,Tue,Wed
    end_date: Optional[datetime] = Field(default=None)
    max_occurrences: Optional[int] = Field(default=None)


class Task(SQLModel, table=True):
    """Main task entity. Supports both Personal and Enterprise workspaces."""

    __tablename__ = "tasks"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    title: str = Field(max_length=256)
    description: Optional[str] = Field(default=None)
    notes: Optional[str] = Field(default=None)

    # Classification
    status: TaskStatus = Field(default=TaskStatus.todo)
    priority: TaskPriority = Field(default=TaskPriority.none)
    workspace: WorkspaceType = Field(default=WorkspaceType.personal)
    source: Optional[str] = Field(default=None, max_length=128)

    # Ownership
    creator_id: str = Field(foreign_key="users.id", index=True)
    responsible_id: Optional[str] = Field(default=None, foreign_key="users.id")
    enterprise_id: Optional[str] = Field(default=None, foreign_key="enterprises.id", index=True)
    is_public: bool = Field(default=False)  # visible to all enterprise members

    # Recurrence
    recurrence_id: Optional[str] = Field(default=None, foreign_key="recurrences.id")

    # Timestamps
    planned_start_at: Optional[datetime] = Field(default=None)
    started_at: Optional[datetime] = Field(default=None)
    due_at: Optional[datetime] = Field(default=None)
    completed_at: Optional[datetime] = Field(default=None)
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)

    # Future-ready fields (not used in Phase 1 but modeled)
    # tags, attachments, subtasks, comments, dependencies, history, checklist
    # will be added as separate tables in Phase 9


class TaskAssignee(SQLModel, table=True):
    """Many-to-many: tasks ↔ assigned users."""

    __tablename__ = "task_assignees"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    task_id: str = Field(foreign_key="tasks.id", index=True)
    user_id: str = Field(foreign_key="users.id")
    assigned_at: datetime = Field(default_factory=utcnow)


class TaskViewer(SQLModel, table=True):
    """Many-to-many: tasks ↔ users explicitly authorized to view."""

    __tablename__ = "task_viewers"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    task_id: str = Field(foreign_key="tasks.id", index=True)
    user_id: str = Field(foreign_key="users.id")


class Reminder(SQLModel, table=True):
    """Task reminders. Extensible: currently in_app, future email/push."""

    __tablename__ = "reminders"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    task_id: str = Field(foreign_key="tasks.id", index=True)
    user_id: str = Field(foreign_key="users.id")
    remind_at: datetime
    offset_minutes: Optional[int] = Field(default=None)  # e.g. -60 = 1h before due
    channel: ReminderChannel = Field(default=ReminderChannel.in_app)
    sent: bool = Field(default=False)
    created_at: datetime = Field(default_factory=utcnow)
