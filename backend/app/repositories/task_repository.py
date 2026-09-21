from typing import Optional, List, Dict
from datetime import datetime, timezone

from app.repositories.base import BaseRepository
from app.models.task import Task, TaskAssignee, TaskViewer, Recurrence, Reminder
from app.models.enums import TaskStatus, TaskPriority, WorkspaceType


class TaskRepository(BaseRepository[Task]):
    async def get_by_id(self, id: str) -> Optional[Task]: ...
    async def list_all(self) -> List[Task]: ...
    async def save(self, entity: Task) -> Task: ...
    async def delete(self, id: str) -> bool: ...

    async def list_by_creator(self, creator_id: str) -> List[Task]: ...
    async def list_by_enterprise(self, enterprise_id: str, user_id: str) -> List[Task]: ...
    async def get_assignees(self, task_id: str) -> List[TaskAssignee]: ...
    async def add_assignee(self, assignee: TaskAssignee) -> TaskAssignee: ...
    async def remove_assignee(self, task_id: str, user_id: str) -> bool: ...
    async def save_recurrence(self, recurrence: Recurrence) -> Recurrence: ...
    async def get_recurrence(self, recurrence_id: str) -> Optional[Recurrence]: ...


class InMemoryTaskRepository(TaskRepository):
    """Development in-memory task storage."""

    def __init__(self) -> None:
        self._tasks: Dict[str, Task] = {}
        self._assignees: Dict[str, List[TaskAssignee]] = {}  # task_id → assignees
        self._recurrences: Dict[str, Recurrence] = {}

    async def get_by_id(self, id: str) -> Optional[Task]:
        return self._tasks.get(id)

    async def list_all(self) -> List[Task]:
        return list(self._tasks.values())

    async def save(self, task: Task) -> Task:
        task.updated_at = datetime.now(timezone.utc)
        self._tasks[task.id] = task
        return task

    async def delete(self, id: str) -> bool:
        if id in self._tasks:
            del self._tasks[id]
            self._assignees.pop(id, None)
            return True
        return False

    async def list_by_creator(self, creator_id: str) -> List[Task]:
        return [t for t in self._tasks.values() if t.creator_id == creator_id]

    async def list_by_enterprise(self, enterprise_id: str, user_id: str) -> List[Task]:
        """Return enterprise tasks visible to the user."""
        result = []
        for task in self._tasks.values():
            if task.enterprise_id != enterprise_id:
                continue
            # Visibility: creator, responsible, assignee, viewer, or is_public
            if task.is_public:
                result.append(task)
                continue
            if task.creator_id == user_id or task.responsible_id == user_id:
                result.append(task)
                continue
            assignees = self._assignees.get(task.id, [])
            if any(a.user_id == user_id for a in assignees):
                result.append(task)
        return result

    async def get_assignees(self, task_id: str) -> List[TaskAssignee]:
        return self._assignees.get(task_id, [])

    async def add_assignee(self, assignee: TaskAssignee) -> TaskAssignee:
        if assignee.task_id not in self._assignees:
            self._assignees[assignee.task_id] = []
        # Avoid duplicates
        existing = self._assignees[assignee.task_id]
        if not any(a.user_id == assignee.user_id for a in existing):
            existing.append(assignee)
        return assignee

    async def remove_assignee(self, task_id: str, user_id: str) -> bool:
        assignees = self._assignees.get(task_id, [])
        filtered = [a for a in assignees if a.user_id != user_id]
        if len(filtered) < len(assignees):
            self._assignees[task_id] = filtered
            return True
        return False

    async def save_recurrence(self, recurrence: Recurrence) -> Recurrence:
        self._recurrences[recurrence.id] = recurrence
        return recurrence

    async def get_recurrence(self, recurrence_id: str) -> Optional[Recurrence]:
        return self._recurrences.get(recurrence_id)
