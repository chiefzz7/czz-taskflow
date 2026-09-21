from typing import List, Dict, Any, Optional
from pydantic import BaseModel


class TaskStatusCount(BaseModel):
    status: str
    count: int


class TaskPriorityCount(BaseModel):
    priority: str
    count: int


class PersonalDashboard(BaseModel):
    total_tasks: int
    open_tasks: int
    completed_tasks: int
    overdue_tasks: int
    in_progress_tasks: int
    completion_rate: float  # 0.0 to 100.0
    by_status: List[TaskStatusCount]
    by_priority: List[TaskPriorityCount]
    recently_completed: List[Dict[str, Any]]
    upcoming_due: List[Dict[str, Any]]


class MemberTaskCount(BaseModel):
    user_id: str
    user_name: str
    total: int
    completed: int
    overdue: int


class EnterpriseDashboard(BaseModel):
    total_tasks: int
    open_tasks: int
    completed_tasks: int
    overdue_tasks: int
    in_progress_tasks: int
    completion_rate: float
    by_status: List[TaskStatusCount]
    by_priority: List[TaskPriorityCount]
    by_member: List[MemberTaskCount]
    recently_completed: List[Dict[str, Any]]
    upcoming_due: List[Dict[str, Any]]
    total_members: int
