from fastapi import APIRouter, Depends

from app.schemas.dashboard import PersonalDashboard, EnterpriseDashboard
from app.models.user import User
from app.dependencies.auth import get_current_user
from app.dependencies.container import dashboard_service

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/personal", response_model=PersonalDashboard)
async def personal_dashboard(
    current_user: User = Depends(get_current_user),
) -> PersonalDashboard:
    """Get personal dashboard metrics for the current user."""
    return await dashboard_service.get_personal_dashboard(current_user.id)


@router.get("/enterprise/{enterprise_id}", response_model=EnterpriseDashboard)
async def enterprise_dashboard(
    enterprise_id: str,
    current_user: User = Depends(get_current_user),
) -> EnterpriseDashboard:
    """Get enterprise dashboard metrics. Membership is validated inside the service."""
    return await dashboard_service.get_enterprise_dashboard(enterprise_id, current_user.id)
