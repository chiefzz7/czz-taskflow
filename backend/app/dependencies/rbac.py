from fastapi import Depends, HTTPException, status, Path
from app.models.user import User
from app.models.enums import EnterpriseRole
from app.dependencies.auth import get_current_user
from app.dependencies.container import enterprise_service


def require_enterprise_role(min_role: EnterpriseRole):
    """
    FastAPI dependency factory for RBAC enforcement on enterprise routes.
    Usage: Depends(require_enterprise_role(EnterpriseRole.admin))
    """
    async def check_role(
        enterprise_id: str = Path(...),
        current_user: User = Depends(get_current_user),
    ) -> User:
        role = await enterprise_service.get_member_role(enterprise_id, current_user.id)
        if role is None:
            raise HTTPException(status_code=403, detail="Not a member of this enterprise")

        role_hierarchy = {
            EnterpriseRole.member: 0,
            EnterpriseRole.manager: 1,
            EnterpriseRole.admin: 2,
        }
        if role_hierarchy[role] < role_hierarchy[min_role]:
            raise HTTPException(
                status_code=403,
                detail=f"Requires {min_role.value} role or higher",
            )
        return current_user

    return check_role
