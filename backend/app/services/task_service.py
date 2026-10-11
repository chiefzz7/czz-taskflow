from typing import Optional, List, Any
from datetime import datetime, timezone
import json

from fastapi import HTTPException, status

from app.core.cache import cache
from app.repositories.task_repository import TaskRepository
from app.models.task import Task, TaskAssignee, Recurrence, TaskSettings
from app.models.enums import TaskStatus, WorkspaceType, EnterpriseRole
from app.schemas.task import (
    TaskCreate, TaskUpdate, TaskStatusUpdate, TaskRead, RecurrenceCreate,
    TaskSettingsUpdate, TaskSettingsRead,
)
from app.services.recurrence_service import RecurrenceService


class TaskService:
    def __init__(
        self,
        task_repo: TaskRepository,
        recurrence_service: Optional[RecurrenceService] = None,
        enterprise_repo: Optional[Any] = None,
        user_repo: Optional[Any] = None,
    ) -> None:
        self._repo = task_repo
        self._recurrence_service = recurrence_service or RecurrenceService()
        self._enterprise_repo = enterprise_repo
        self._user_repo = user_repo

    # ── Helpers ──────────────────────────────────────────────────────────────

    def _build_task_read(
        self,
        task: Task,
        assignees: List[TaskAssignee],
        recurrence: Optional[Recurrence] = None,
        responsible_name: Optional[str] = None,
        responsible_email: Optional[str] = None,
        assignee_names: Optional[List[str]] = None,
    ) -> TaskRead:
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
            dom = None
            if recurrence.days_of_month:
                try:
                    dom = json.loads(recurrence.days_of_month)
                except Exception:
                    dom = None
            rec_read = RecurrenceRead(
                id=recurrence.id,
                type=recurrence.type,
                interval=recurrence.interval,
                days_of_week=dow,
                days_of_month=dom,
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
            responsible_name=responsible_name,
            responsible_email=responsible_email,
            is_public=task.is_public,
            planned_start_at=task.planned_start_at,
            started_at=task.started_at,
            due_at=task.due_at,
            completed_at=task.completed_at,
            created_at=task.created_at,
            updated_at=task.updated_at,
            assignee_ids=[a.user_id for a in assignees],
            assignee_names=assignee_names or [],
            recurrence=rec_read,
        )

    async def _get_task_read(self, task: Task) -> TaskRead:
        reads = await self._batch_load_task_reads([task])
        return reads[0]

    async def _batch_load_task_reads(self, tasks: List[Task]) -> List[TaskRead]:
        if not tasks:
            return []
        task_ids = [t.id for t in tasks]
        rec_ids = [t.recurrence_id for t in tasks if t.recurrence_id]

        # 1 single query for all assignees
        assignees_map = await self._repo.get_assignees_batch(task_ids)

        # 1 single query for all recurrences
        recs_map = {}
        if rec_ids:
            recs_map = await self._repo.get_recurrences_batch(rec_ids)

        # 1 single query for users (responsible + assignees)
        users_map = {}
        if self._user_repo:
            all_user_ids = set()
            for t in tasks:
                if t.responsible_id:
                    all_user_ids.add(t.responsible_id)
                for a in assignees_map.get(t.id, []):
                    all_user_ids.add(a.user_id)
            if all_user_ids:
                try:
                    users_map = await self._user_repo.get_by_ids(list(all_user_ids))
                except Exception:
                    users_map = {}

        result = []
        for task in tasks:
            assignees = assignees_map.get(task.id, [])
            rec = recs_map.get(task.recurrence_id) if task.recurrence_id else None
            resp_user = users_map.get(task.responsible_id) if task.responsible_id else None
            assignee_names = [
                users_map[a.user_id].name
                for a in assignees
                if a.user_id in users_map and users_map[a.user_id] and users_map[a.user_id].name
            ]
            result.append(
                self._build_task_read(
                    task,
                    assignees,
                    rec,
                    responsible_name=resp_user.name if resp_user else None,
                    responsible_email=resp_user.email if resp_user else None,
                    assignee_names=assignee_names,
                )
            )
        return result

    # ── Workflow Settings & Permissions ─────────────────────────────────────

    async def get_settings(self, enterprise_id: str) -> dict:
        settings = await self._repo.get_settings(enterprise_id)
        if not settings:
            return {
                "enterprise_id": enterprise_id,
                "can_create_task": None,
                "can_delegate_task": None,
                "can_move_to_in_progress": None,
                "can_move_to_review": None,
                "can_finalize_task": None,
                "updated_at": None,
            }

        def parse_json_roles(val: Optional[str]) -> Optional[List[str]]:
            if val is None:
                return None
            try:
                return json.loads(val)
            except Exception:
                return []

        return {
            "enterprise_id": enterprise_id,
            "can_create_task": parse_json_roles(settings.can_create_task),
            "can_delegate_task": parse_json_roles(settings.can_delegate_task),
            "can_move_to_in_progress": parse_json_roles(settings.can_move_to_in_progress),
            "can_move_to_review": parse_json_roles(settings.can_move_to_review),
            "can_finalize_task": parse_json_roles(settings.can_finalize_task),
            "updated_at": settings.updated_at,
        }

    async def update_settings(self, enterprise_id: str, data: TaskSettingsUpdate, requesting_user_id: str) -> dict:
        if self._enterprise_repo:
            member = await self._enterprise_repo.get_member(enterprise_id, requesting_user_id)
            if not member or member.role not in [EnterpriseRole.admin, EnterpriseRole.manager]:
                raise HTTPException(status_code=403, detail="Apenas administradores e gestores podem alterar as permissões de tarefas.")

        settings = await self._repo.get_settings(enterprise_id)
        if not settings:
            settings = TaskSettings(enterprise_id=enterprise_id)

        def dump_json_roles(val: Optional[List[str]]) -> Optional[str]:
            if val is None:
                return None
            return json.dumps(val)

        settings.can_create_task = dump_json_roles(data.can_create_task)
        settings.can_delegate_task = dump_json_roles(data.can_delegate_task)
        settings.can_move_to_in_progress = dump_json_roles(data.can_move_to_in_progress)
        settings.can_move_to_review = dump_json_roles(data.can_move_to_review)
        settings.can_finalize_task = dump_json_roles(data.can_finalize_task)
        settings.updated_at = datetime.now(timezone.utc)

        await self._repo.save_settings(settings)
        return await self.get_settings(enterprise_id)

    async def _check_status_permission(
        self,
        task: Task,
        target_status: TaskStatus,
        user_id: str,
    ) -> None:
        if task.workspace != WorkspaceType.enterprise or not task.enterprise_id:
            return
        if not self._enterprise_repo:
            return

        member = await self._enterprise_repo.get_member(task.enterprise_id, user_id)
        if not member:
            raise HTTPException(status_code=403, detail="Você não é membro desta empresa")

        if member.role == EnterpriseRole.admin:
            return

        settings = await self._repo.get_settings(task.enterprise_id)
        assignees = await self._repo.get_assignees(task.id)
        is_assigned = task.responsible_id == user_id or any(a.user_id == user_id for a in assignees)
        is_creator = task.creator_id == user_id
        is_manager = member.role == EnterpriseRole.manager

        def is_role_allowed(setting_str: Optional[str]) -> bool:
            if setting_str is None:
                return True
            try:
                allowed_ids = json.loads(setting_str)
                if not allowed_ids:
                    return is_manager
                return bool(member.custom_role_id and member.custom_role_id in allowed_ids)
            except Exception:
                return True

        if target_status == TaskStatus.in_progress:
            if not is_assigned and not is_manager:
                if not is_role_allowed(settings.can_move_to_in_progress if settings else None):
                    raise HTTPException(
                        status_code=403,
                        detail="Seu cargo não tem permissão para mover esta tarefa para 'Em Andamento'."
                    )

        elif target_status == TaskStatus.review:
            if not is_assigned and not is_creator and not is_manager:
                if not is_role_allowed(settings.can_move_to_review if settings else None):
                    raise HTTPException(
                        status_code=403,
                        detail="Seu cargo não tem permissão para enviar tarefas para Revisão."
                    )

        elif target_status == TaskStatus.done:
            allowed = False
            if settings and settings.can_finalize_task is not None:
                allowed = is_role_allowed(settings.can_finalize_task)
            else:
                allowed = is_manager

            if not allowed:
                raise HTTPException(
                    status_code=403,
                    detail="Apenas gestores ou cargos autorizados podem definir a tarefa como Finalizada. Mova para 'Revisão' para aprovação do gestor."
                )

    # ── CRUD ─────────────────────────────────────────────────────────────────

    async def create_task(self, data: TaskCreate, creator_id: str) -> TaskRead:
        if data.workspace == WorkspaceType.personal:
            data.enterprise_id = None
            data.is_public = False
        elif data.workspace == WorkspaceType.enterprise and data.enterprise_id and self._enterprise_repo:
            member = await self._enterprise_repo.get_member(data.enterprise_id, creator_id)
            if not member:
                raise HTTPException(status_code=403, detail="Você não é membro desta empresa")
            settings = await self._repo.get_settings(data.enterprise_id)

            if member.role != EnterpriseRole.admin and settings and settings.can_create_task is not None:
                try:
                    allowed = json.loads(settings.can_create_task)
                    if allowed and (not member.custom_role_id or member.custom_role_id not in allowed) and member.role != EnterpriseRole.manager:
                        raise HTTPException(status_code=403, detail="Seu cargo não tem permissão para criar tarefas nesta empresa.")
                except Exception:
                    pass

            is_delegating = False
            if data.responsible_id and data.responsible_id != creator_id:
                is_delegating = True
            if data.assignee_ids and any(aid != creator_id for aid in data.assignee_ids):
                is_delegating = True

            if is_delegating and member.role != EnterpriseRole.admin:
                if settings and settings.can_delegate_task is not None:
                    try:
                        allowed = json.loads(settings.can_delegate_task)
                        if allowed and (not member.custom_role_id or member.custom_role_id not in allowed) and member.role != EnterpriseRole.manager:
                            raise HTTPException(status_code=403, detail="Apenas cargos autorizados podem delegar tarefas a outros membros.")
                    except Exception:
                        pass

        recurrence_id = None
        if data.recurrence:
            rec = Recurrence(
                type=data.recurrence.type,
                interval=data.recurrence.interval or 1,
                days_of_week=json.dumps(data.recurrence.days_of_week) if data.recurrence.days_of_week else None,
                days_of_month=json.dumps(data.recurrence.days_of_month) if data.recurrence.days_of_month else None,
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

        # Save assignees
        target_assignees = set(data.assignee_ids or [])
        if data.responsible_id:
            target_assignees.add(data.responsible_id)
        for uid in target_assignees:
            await self._repo.add_assignee(TaskAssignee(task_id=saved.id, user_id=uid))

        cache.invalidate_prefix("dash:")
        cache.invalidate_prefix("tasks:")
        return await self._get_task_read(saved)

    async def get_task(self, task_id: str, user_id: str) -> TaskRead:
        task = await self._repo.get_by_id(task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")

        # Strict authorization check for personal tasks
        if task.workspace == WorkspaceType.personal and task.creator_id != user_id:
            raise HTTPException(status_code=403, detail="Acesso negado. Esta tarefa pessoal é estritamente privada.")

        return await self._get_task_read(task)


    async def list_personal_tasks(
        self,
        user_id: str,
        status: Optional[TaskStatus] = None,
        search: Optional[str] = None,
    ) -> List[TaskRead]:
        cache_key = f"tasks:p:{user_id}:{status}:{search}"
        cached = cache.get(cache_key)
        if cached:
            return cached

        tasks = await self._repo.list_by_creator(user_id)
        # Only personal tasks
        tasks = [t for t in tasks if t.workspace == WorkspaceType.personal]

        if status:
            tasks = [t for t in tasks if t.status == status]
        if search:
            q = search.lower()
            tasks = [t for t in tasks if q in t.title.lower() or (t.description and q in t.description.lower())]

        ordered_tasks = sorted(tasks, key=lambda t: t.created_at, reverse=True)
        res = await self._batch_load_task_reads(ordered_tasks)
        cache.set(cache_key, res, ttl_seconds=30.0)
        return res

    async def list_enterprise_tasks(
        self,
        enterprise_id: str,
        user_id: str,
        status: Optional[TaskStatus] = None,
        search: Optional[str] = None,
    ) -> List[TaskRead]:
        cache_key = f"tasks:e:{enterprise_id}:{user_id}:{status}:{search}"
        cached = cache.get(cache_key)
        if cached:
            return cached

        tasks = await self._repo.list_by_enterprise(enterprise_id, user_id)

        if status:
            tasks = [t for t in tasks if t.status == status]
        if search:
            q = search.lower()
            tasks = [t for t in tasks if q in t.title.lower() or (t.description and q in t.description.lower())]

        ordered_tasks = sorted(tasks, key=lambda t: t.created_at, reverse=True)
        res = await self._batch_load_task_reads(ordered_tasks)
        cache.set(cache_key, res, ttl_seconds=30.0)
        return res

    async def update_task(self, task_id: str, data: TaskUpdate, user_id: str) -> TaskRead:
        task = await self._repo.get_by_id(task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        if task.workspace == WorkspaceType.personal:
            if task.creator_id != user_id:
                raise HTTPException(status_code=403, detail="Acesso negado. Esta tarefa pessoal é estritamente privada.")
        else:
            if self._enterprise_repo and task.enterprise_id:
                member = await self._enterprise_repo.get_member(task.enterprise_id, user_id)
                if not member:
                    raise HTTPException(status_code=403, detail="Access denied")
                if member.role not in [EnterpriseRole.admin, EnterpriseRole.manager] and task.creator_id != user_id and task.responsible_id != user_id:
                    raise HTTPException(status_code=403, detail="Access denied")

        if data.remove_recurrence:
            task.recurrence_id = None
        elif data.recurrence:
            if task.recurrence_id:
                existing_rec = await self._repo.get_recurrence(task.recurrence_id)
                if existing_rec:
                    existing_rec.type = data.recurrence.type
                    existing_rec.interval = data.recurrence.interval or 1
                    existing_rec.days_of_week = json.dumps(data.recurrence.days_of_week) if data.recurrence.days_of_week else None
                    existing_rec.days_of_month = json.dumps(data.recurrence.days_of_month) if data.recurrence.days_of_month else None
                    existing_rec.end_date = data.recurrence.end_date
                    existing_rec.max_occurrences = data.recurrence.max_occurrences
                    await self._repo.save_recurrence(existing_rec)
                else:
                    new_rec = Recurrence(
                        type=data.recurrence.type,
                        interval=data.recurrence.interval or 1,
                        days_of_week=json.dumps(data.recurrence.days_of_week) if data.recurrence.days_of_week else None,
                        days_of_month=json.dumps(data.recurrence.days_of_month) if data.recurrence.days_of_month else None,
                        end_date=data.recurrence.end_date,
                        max_occurrences=data.recurrence.max_occurrences,
                    )
                    saved_rec = await self._repo.save_recurrence(new_rec)
                    task.recurrence_id = saved_rec.id
            else:
                new_rec = Recurrence(
                    type=data.recurrence.type,
                    interval=data.recurrence.interval or 1,
                    days_of_week=json.dumps(data.recurrence.days_of_week) if data.recurrence.days_of_week else None,
                    days_of_month=json.dumps(data.recurrence.days_of_month) if data.recurrence.days_of_month else None,
                    end_date=data.recurrence.end_date,
                    max_occurrences=data.recurrence.max_occurrences,
                )
                saved_rec = await self._repo.save_recurrence(new_rec)
                task.recurrence_id = saved_rec.id

        update_data = data.model_dump(exclude_unset=True, exclude={"recurrence", "remove_recurrence"})
        for field, value in update_data.items():
            setattr(task, field, value)

        if task.workspace == WorkspaceType.personal:
            task.enterprise_id = None
            task.is_public = False

        saved = await self._repo.save(task)

        # Sync assignees if provided
        if data.assignee_ids is not None:
            current_assignees = await self._repo.get_assignees(task.id)
            current_ids = {a.user_id for a in current_assignees}
            new_ids = set(data.assignee_ids)
            if data.responsible_id:
                new_ids.add(data.responsible_id)
            for cid in current_ids:
                if cid not in new_ids:
                    await self._repo.remove_assignee(task.id, cid)
            for nid in new_ids:
                if nid not in current_ids:
                    await self._repo.add_assignee(TaskAssignee(task_id=task.id, user_id=nid))

        cache.invalidate_prefix("dash:")
        cache.invalidate_prefix("tasks:")
        return await self._get_task_read(saved)

    async def _handle_recurrence_completion(self, task: Task) -> Optional[Task]:
        """When a recurring task is completed, automatically instantiate the next occurrence."""
        if not task.recurrence_id:
            return None
        rec = await self._repo.get_recurrence(task.recurrence_id)
        if not rec:
            return None

        # Base date for recurrence is due_at or planned_start_at or completed_at
        base_date = task.due_at or task.planned_start_at or task.completed_at or datetime.now(timezone.utc)
        next_due = self._recurrence_service.next_occurrence(rec, base_date)
        if not next_due:
            return None

        # Check expiration
        all_creator_tasks = await self._repo.list_by_creator(task.creator_id)
        occ_count = sum(1 for t in all_creator_tasks if t.recurrence_id == task.recurrence_id)
        if self._recurrence_service.is_expired(rec, occ_count, next_due):
            return None

        # Compute next planned_start_at if previous task had both planned_start_at and due_at
        next_planned_start = None
        if task.planned_start_at and task.due_at:
            duration = task.due_at - task.planned_start_at
            next_planned_start = next_due - duration

        next_task = Task(
            title=task.title,
            description=task.description,
            notes=task.notes,
            status=TaskStatus.todo,
            priority=task.priority,
            workspace=task.workspace,
            enterprise_id=task.enterprise_id,
            creator_id=task.creator_id,
            responsible_id=task.responsible_id,
            is_public=task.is_public,
            planned_start_at=next_planned_start,
            due_at=next_due,
            recurrence_id=task.recurrence_id,
        )
        saved_task = await self._repo.save(next_task)

        # Copy assignees
        assignees = await self._repo.get_assignees(task.id)
        for a in assignees:
            await self._repo.add_assignee(TaskAssignee(task_id=saved_task.id, user_id=a.user_id))

        return saved_task

    async def update_status(self, task_id: str, data: TaskStatusUpdate, user_id: str) -> TaskRead:
        task = await self._repo.get_by_id(task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")

        # Check access and role workflow permission
        if task.workspace == WorkspaceType.personal:
            if task.creator_id != user_id:
                raise HTTPException(status_code=403, detail="Acesso negado. Esta tarefa pessoal é estritamente privada.")
        else:
            await self._check_status_permission(task, data.status, user_id)

        was_done = task.status == TaskStatus.done
        task.status = data.status
        if data.status == TaskStatus.in_progress and not task.started_at:
            task.started_at = datetime.now(timezone.utc)
        if data.status == TaskStatus.done:
            task.completed_at = datetime.now(timezone.utc)
            if not was_done and task.recurrence_id:
                await self._handle_recurrence_completion(task)

        saved = await self._repo.save(task)
        cache.invalidate_prefix("dash:")
        cache.invalidate_prefix("tasks:")
        return await self._get_task_read(saved)

    async def delete_task(self, task_id: str, user_id: str) -> None:
        task = await self._repo.get_by_id(task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        if task.creator_id != user_id:
            raise HTTPException(status_code=403, detail="Apenas o criador pode excluir esta tarefa")
        await self._repo.delete(task_id)
        cache.invalidate_prefix("dash:")
        cache.invalidate_prefix("tasks:")

    async def add_assignee(self, task_id: str, assignee_user_id: str, requesting_user_id: str) -> TaskRead:
        task = await self._repo.get_by_id(task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        if task.workspace == WorkspaceType.personal:
            raise HTTPException(status_code=400, detail="Tarefas pessoais são privadas e não aceitam responsáveis externos")
        if task.creator_id != requesting_user_id:
            raise HTTPException(status_code=403, detail="Only the creator can assign users")

        assignee = TaskAssignee(task_id=task_id, user_id=assignee_user_id)
        await self._repo.add_assignee(assignee)
        cache.invalidate_prefix("dash:")
        cache.invalidate_prefix("tasks:")
        return await self._get_task_read(task)

    async def remove_assignee(self, task_id: str, assignee_user_id: str, requesting_user_id: str) -> TaskRead:
        task = await self._repo.get_by_id(task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        if task.workspace == WorkspaceType.personal:
            raise HTTPException(status_code=400, detail="Tarefas pessoais são privadas e não aceitam responsáveis externos")
        if task.creator_id != requesting_user_id:
            raise HTTPException(status_code=403, detail="Only the creator can remove assignees")

        await self._repo.remove_assignee(task_id, assignee_user_id)
        cache.invalidate_prefix("dash:")
        cache.invalidate_prefix("tasks:")
        return await self._get_task_read(task)

