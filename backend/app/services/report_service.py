from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta

from app.repositories.task_repository import TaskRepository
from app.models.enums import TaskStatus, TaskPriority


class ReportService:
    def __init__(self, task_repo: TaskRepository) -> None:
        self._tasks = task_repo

    async def get_personal_report(
        self,
        user_id: str,
        period_start: Optional[datetime] = None,
        period_end: Optional[datetime] = None,
        status: Optional[TaskStatus] = None,
        priority: Optional[TaskPriority] = None,
    ) -> Dict[str, Any]:
        now = datetime.now(timezone.utc)
        tasks = await self._tasks.list_by_creator(user_id)
        tasks = [t for t in tasks if t.enterprise_id is None]

        if period_start:
            tasks = [t for t in tasks if t.created_at >= period_start]
        if period_end:
            tasks = [t for t in tasks if t.created_at <= period_end]
        if status:
            tasks = [t for t in tasks if t.status == status]
        if priority:
            tasks = [t for t in tasks if t.priority == priority]

        completed = [t for t in tasks if t.status == TaskStatus.done]
        overdue = [
            t for t in tasks
            if t.due_at and t.due_at.replace(tzinfo=timezone.utc) < now
            and t.status not in (TaskStatus.done, TaskStatus.archived)
        ]

        return {
            "total_created": len(tasks),
            "total_completed": len(completed),
            "total_overdue": len(overdue),
            "completion_rate": round(len(completed) / len(tasks) * 100, 1) if tasks else 0.0,
            "by_status": self._group_by_status(tasks),
            "by_priority": self._group_by_priority(tasks),
            "tasks": [
                {
                    "id": t.id,
                    "title": t.title,
                    "status": t.status,
                    "priority": t.priority,
                    "created_at": t.created_at,
                    "completed_at": t.completed_at,
                    "due_at": t.due_at,
                }
                for t in tasks
            ],
        }

    async def get_enterprise_report(
        self,
        enterprise_id: str,
        user_id: str,
        period_start: Optional[datetime] = None,
        period_end: Optional[datetime] = None,
        status: Optional[TaskStatus] = None,
        priority: Optional[TaskPriority] = None,
        member_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        now = datetime.now(timezone.utc)
        tasks = await self._tasks.list_by_enterprise(enterprise_id, user_id)

        if period_start:
            tasks = [t for t in tasks if t.created_at >= period_start]
        if period_end:
            tasks = [t for t in tasks if t.created_at <= period_end]
        if status:
            tasks = [t for t in tasks if t.status == status]
        if priority:
            tasks = [t for t in tasks if t.priority == priority]
        if member_id:
            tasks = [t for t in tasks if t.responsible_id == member_id or t.creator_id == member_id]

        completed = [t for t in tasks if t.status == TaskStatus.done]
        overdue = [
            t for t in tasks
            if t.due_at and t.due_at.replace(tzinfo=timezone.utc) < now
            and t.status not in (TaskStatus.done, TaskStatus.archived)
        ]

        return {
            "total_created": len(tasks),
            "total_completed": len(completed),
            "total_overdue": len(overdue),
            "completion_rate": round(len(completed) / len(tasks) * 100, 1) if tasks else 0.0,
            "by_status": self._group_by_status(tasks),
            "by_priority": self._group_by_priority(tasks),
            "tasks": [
                {
                    "id": t.id,
                    "title": t.title,
                    "status": t.status,
                    "priority": t.priority,
                    "responsible_id": t.responsible_id,
                    "creator_id": t.creator_id,
                    "created_at": t.created_at,
                    "completed_at": t.completed_at,
                    "due_at": t.due_at,
                }
                for t in tasks
            ],
        }

    def _group_by_status(self, tasks) -> List[Dict[str, Any]]:
        counts: Dict[str, int] = {}
        for t in tasks:
            counts[t.status.value] = counts.get(t.status.value, 0) + 1
        return [{"status": k, "count": v} for k, v in counts.items()]

    def _group_by_priority(self, tasks) -> List[Dict[str, Any]]:
        counts: Dict[str, int] = {}
        for t in tasks:
            counts[t.priority.value] = counts.get(t.priority.value, 0) + 1
        return [{"priority": k, "count": v} for k, v in counts.items()]
