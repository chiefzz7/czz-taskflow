from typing import Optional, List
from datetime import datetime, timezone
import json

from fastapi import HTTPException, status

from app.repositories.task_repository import TaskRepository
from app.models.task import Task, TaskAssignee, Recurrence
from app.models.enums import TaskStatus, WorkspaceType
from app.schemas.task import TaskCreate, TaskUpdate, TaskStatusUpdate, TaskRead, RecurrenceCreate


class TaskService:
    def __init__(self, task_repo: TaskRepository) -> None:
        self._repo = task_repo

    # ── Helpers ──────────────────────────────────────────────────────────────

    def _build_task_read(self, task: Task, assignees: List[TaskAssignee], recurrence: Optional[Recurrence] = None) -> TaskRead:
        from app.schemas.task import RecurrenceRead
        import json

        rec_read = None
        if recurrence:
            dow = None
            if recurrence.days_of_week:
                try:
                    dow = json.loads(recurrence.days_of_week)
                except Exception:
                    dow = None
            rec_read = RecurrenceRead(
                id=recurrence.id,
                type=recurrence.type,
                interval=recurrence.interval,
                days_of_week=dow,
                end_date=recurrence.end_date,
                max_occurrences=recurrence.max_occurrences,
            )

        return TaskRead(
            id=task.id,
            title=task.title,
            description=task.description,
            notes=task.notes,
            status=task.status,
            priority=task.priority,
            workspace=task.workspace,
            enterprise_id=task.enterprise_id,
            creator_id=task.creator_id,
            responsible_id=task.responsible_id,
            is_public=task.is_public,
            planned_start_at=task.planned_start_at,
            started_at=task.started_at,
            due_at=task.due_at,
            completed_at=task.completed_at,
            created_at=task.created_at,
            updated_at=task.updated_at,
            assignee_ids=[a.user_id for a in assignees],
            recurrence=rec_read,
        )

    async def _get_task_read(self, task: Task) -> TaskRead:
        assignees = await self._repo.get_assignees(task.id)
        recurrence = None
        if task.recurrence_id:
            recurrence = await self._repo.get_recurrence(task.recurrence_id)
        return self._build_task_read(task, assignees, recurrence)

    # ── CRUD ─────────────────────────────────────────────────────────────────

    async def create_task(self, data: TaskCreate, creator_id: str) -> TaskRead:
        recurrence_id = None
        if data.recurrence:
            rec = Recurrence(
                type=data.recurrence.type,
                interval=data.recurrence.interval,
                days_of_week=json.dumps(data.recurrence.days_of_week) if data.recurrence.days_of_week else None,
                end_date=data.recurrence.end_date,
                max_occurrences=data.recurrence.max_occurrences,
            )
            saved_rec = await self._repo.save_recurrence(rec)
            recurrence_id = saved_rec.id

        task = Task(
            title=data.title,
            description=data.description,
            notes=data.notes,
            status=data.status,
            priority=data.priority,
            workspace=data.workspace,
            enterprise_id=data.enterprise_id,
            creator_id=creator_id,
            responsible_id=data.responsible_id,
            is_public=data.is_public,
            planned_start_at=data.planned_start_at,
            due_at=data.due_at,
            recurrence_id=recurrence_id,
        )
        saved = await self._repo.save(task)
        return await self._get_task_read(saved)

    async def get_task(self, task_id: str, user_id: str) -> TaskRead:
        task = await self._repo.get_by_id(task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")

        # Authorization check
        if task.workspace == WorkspaceType.personal and task.creator_id != user_id:
            raise HTTPException(status_code=403, detail="Access denied")

        return await self._get_task_read(task)

    async def list_personal_tasks(
        self,
        user_id: str,
        status: Optional[TaskStatus] = None,
        search: Optional[str] = None,
    ) -> List[TaskRead]:
        tasks = await self._repo.list_by_creator(user_id)
        # Only personal tasks
        tasks = [t for t in tasks if t.workspace == WorkspaceType.personal]

        if status:
            tasks = [t for t in tasks if t.status == status]
        if search:
            q = search.lower()
            tasks = [t for t in tasks if q in t.title.lower() or (t.description and q in t.description.lower())]

        result = []
        for task in sorted(tasks, key=lambda t: t.created_at, reverse=True):
            result.append(await self._get_task_read(task))
        return result

    async def list_enterprise_tasks(
        self,
        enterprise_id: str,
        user_id: str,
        status: Optional[TaskStatus] = None,
        search: Optional[str] = None,
    ) -> List[TaskRead]:
        tasks = await self._repo.list_by_enterprise(enterprise_id, user_id)

        if status:
            tasks = [t for t in tasks if t.status == status]
        if search:
            q = search.lower()
            tasks = [t for t in tasks if q in t.title.lower() or (t.description and q in t.description.lower())]

        result = []
        for task in sorted(tasks, key=lambda t: t.created_at, reverse=True):
            result.append(await self._get_task_read(task))
        return result

    async def update_task(self, task_id: str, data: TaskUpdate, user_id: str) -> TaskRead:
        task = await self._repo.get_by_id(task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        if task.creator_id != user_id and task.responsible_id != user_id:
            raise HTTPException(status_code=403, detail="Access denied")

        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(task, field, value)

        saved = await self._repo.save(task)
        return await self._get_task_read(saved)

    async def update_status(self, task_id: str, data: TaskStatusUpdate, user_id: str) -> TaskRead:
        task = await self._repo.get_by_id(task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")

        # Check access
        assignees = await self._repo.get_assignees(task_id)
        is_assignee = any(a.user_id == user_id for a in assignees)
        if task.creator_id != user_id and task.responsible_id != user_id and not is_assignee:
            raise HTTPException(status_code=403, detail="Access denied")

        task.status = data.status
        if data.status == TaskStatus.in_progress and not task.started_at:
            task.started_at = datetime.now(timezone.utc)
        if data.status == TaskStatus.done:
            task.completed_at = datetime.now(timezone.utc)

        saved = await self._repo.save(task)
        return await self._get_task_read(saved)

    async def delete_task(self, task_id: str, user_id: str) -> None:
        task = await self._repo.get_by_id(task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        if task.creator_id != user_id:
            raise HTTPException(status_code=403, detail="Only the creator can delete this task")
        await self._repo.delete(task_id)

    async def add_assignee(self, task_id: str, assignee_user_id: str, requesting_user_id: str) -> TaskRead:
        task = await self._repo.get_by_id(task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        if task.creator_id != requesting_user_id:
            raise HTTPException(status_code=403, detail="Only the creator can assign users")

        assignee = TaskAssignee(task_id=task_id, user_id=assignee_user_id)
        await self._repo.add_assignee(assignee)
        return await self._get_task_read(task)

    async def remove_assignee(self, task_id: str, assignee_user_id: str, requesting_user_id: str) -> TaskRead:
        task = await self._repo.get_by_id(task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        if task.creator_id != requesting_user_id:
            raise HTTPException(status_code=403, detail="Only the creator can remove assignees")

        await self._repo.remove_assignee(task_id, assignee_user_id)
        return await self._get_task_read(task)
