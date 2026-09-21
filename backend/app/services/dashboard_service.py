from typing import List, Dict, Any
from datetime import datetime, timezone

from app.repositories.task_repository import TaskRepository
from app.repositories.enterprise_repository import EnterpriseRepository
from app.repositories.user_repository import UserRepository
from app.models.enums import TaskStatus, TaskPriority
from app.schemas.dashboard import (
    PersonalDashboard, EnterpriseDashboard,
    TaskStatusCount, TaskPriorityCount, MemberTaskCount,
)


class DashboardService:
    def __init__(
        self,
        task_repo: TaskRepository,
        enterprise_repo: EnterpriseRepository,
        user_repo: UserRepository,
    ) -> None:
        self._tasks = task_repo
        self._enterprises = enterprise_repo
        self._users = user_repo

    async def get_personal_dashboard(self, user_id: str) -> PersonalDashboard:
        now = datetime.now(timezone.utc)
        all_tasks = await self._tasks.list_by_creator(user_id)
        personal_tasks = [t for t in all_tasks if t.enterprise_id is None]

        total = len(personal_tasks)
        completed = [t for t in personal_tasks if t.status == TaskStatus.done]
        in_progress = [t for t in personal_tasks if t.status == TaskStatus.in_progress]
        open_tasks = [t for t in personal_tasks if t.status not in (TaskStatus.done, TaskStatus.archived)]
        overdue = [
            t for t in personal_tasks
            if t.due_at and t.due_at.replace(tzinfo=timezone.utc) < now
            and t.status not in (TaskStatus.done, TaskStatus.archived)
        ]

        completion_rate = (len(completed) / total * 100) if total > 0 else 0.0

        by_status = self._count_by_status(personal_tasks)
        by_priority = self._count_by_priority(personal_tasks)

        recently_completed = [
            {"id": t.id, "title": t.title, "completed_at": t.completed_at}
            for t in sorted(completed, key=lambda x: x.completed_at or now, reverse=True)[:5]
        ]
        upcoming = [
            t for t in open_tasks if t.due_at
        ]
        upcoming_due = [
            {"id": t.id, "title": t.title, "due_at": t.due_at, "priority": t.priority}
            for t in sorted(upcoming, key=lambda x: x.due_at)[:5]
        ]

        return PersonalDashboard(
            total_tasks=total,
            open_tasks=len(open_tasks),
            completed_tasks=len(completed),
            overdue_tasks=len(overdue),
            in_progress_tasks=len(in_progress),
            completion_rate=round(completion_rate, 1),
            by_status=by_status,
            by_priority=by_priority,
            recently_completed=recently_completed,
            upcoming_due=upcoming_due,
        )

    async def get_enterprise_dashboard(self, enterprise_id: str, user_id: str) -> EnterpriseDashboard:
        now = datetime.now(timezone.utc)
        all_tasks = await self._tasks.list_by_enterprise(enterprise_id, user_id)
        members = await self._enterprises.list_members(enterprise_id)

        total = len(all_tasks)
        completed = [t for t in all_tasks if t.status == TaskStatus.done]
        in_progress = [t for t in all_tasks if t.status == TaskStatus.in_progress]
        open_tasks = [t for t in all_tasks if t.status not in (TaskStatus.done, TaskStatus.archived)]
        overdue = [
            t for t in all_tasks
            if t.due_at and t.due_at.replace(tzinfo=timezone.utc) < now
            and t.status not in (TaskStatus.done, TaskStatus.archived)
        ]

        completion_rate = (len(completed) / total * 100) if total > 0 else 0.0
        by_status = self._count_by_status(all_tasks)
        by_priority = self._count_by_priority(all_tasks)

        # Per-member metrics
        by_member = []
        for member in members:
            member_tasks = [
                t for t in all_tasks
                if t.responsible_id == member.user_id or t.creator_id == member.user_id
            ]
            user = await self._users.get_by_id(member.user_id)
            member_completed = [t for t in member_tasks if t.status == TaskStatus.done]
            member_overdue = [
                t for t in member_tasks
                if t.due_at and t.due_at.replace(tzinfo=timezone.utc) < now
                and t.status not in (TaskStatus.done, TaskStatus.archived)
            ]
            by_member.append(MemberTaskCount(
                user_id=member.user_id,
                user_name=user.name if user else "Unknown",
                total=len(member_tasks),
                completed=len(member_completed),
                overdue=len(member_overdue),
            ))

        recently_completed = [
            {"id": t.id, "title": t.title, "completed_at": t.completed_at}
            for t in sorted(completed, key=lambda x: x.completed_at or now, reverse=True)[:5]
        ]
        upcoming = [t for t in open_tasks if t.due_at]
        upcoming_due = [
            {"id": t.id, "title": t.title, "due_at": t.due_at, "priority": t.priority}
            for t in sorted(upcoming, key=lambda x: x.due_at)[:5]
        ]

        return EnterpriseDashboard(
            total_tasks=total,
            open_tasks=len(open_tasks),
            completed_tasks=len(completed),
            overdue_tasks=len(overdue),
            in_progress_tasks=len(in_progress),
            completion_rate=round(completion_rate, 1),
            by_status=by_status,
            by_priority=by_priority,
            by_member=by_member,
            recently_completed=recently_completed,
            upcoming_due=upcoming_due,
            total_members=len(members),
        )

    # ── Helpers ──────────────────────────────────────────────────────────────

    def _count_by_status(self, tasks) -> List[TaskStatusCount]:
        counts: Dict[str, int] = {}
        for t in tasks:
            counts[t.status.value] = counts.get(t.status.value, 0) + 1
        return [TaskStatusCount(status=k, count=v) for k, v in counts.items()]

    def _count_by_priority(self, tasks) -> List[TaskPriorityCount]:
        counts: Dict[str, int] = {}
        for t in tasks:
            counts[t.priority.value] = counts.get(t.priority.value, 0) + 1
        return [TaskPriorityCount(priority=k, count=v) for k, v in counts.items()]
