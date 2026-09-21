from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Depends, Query
from typing import Any, Dict

from app.models.user import User
from app.models.enums import TaskStatus, TaskPriority
from app.dependencies.auth import get_current_user
from app.dependencies.container import report_service

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/personal", response_model=Dict[str, Any])
async def personal_report(
    period_start: Optional[datetime] = Query(None),
    period_end: Optional[datetime] = Query(None),
    status: Optional[TaskStatus] = Query(None),
    priority: Optional[TaskPriority] = Query(None),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """Generate a personal tasks report with optional filters."""
    return await report_service.get_personal_report(
        user_id=current_user.id,
        period_start=period_start,
        period_end=period_end,
        status=status,
        priority=priority,
    )


@router.get("/enterprise/{enterprise_id}", response_model=Dict[str, Any])
async def enterprise_report(
    enterprise_id: str,
    period_start: Optional[datetime] = Query(None),
    period_end: Optional[datetime] = Query(None),
    status: Optional[TaskStatus] = Query(None),
    priority: Optional[TaskPriority] = Query(None),
    member_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """Generate an enterprise tasks report with optional filters."""
    return await report_service.get_enterprise_report(
        enterprise_id=enterprise_id,
        user_id=current_user.id,
        period_start=period_start,
        period_end=period_end,
        status=status,
        priority=priority,
        member_id=member_id,
    )
