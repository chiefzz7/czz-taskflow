from typing import List, Optional
from fastapi import APIRouter, Depends

from app.schemas.user import UserRead, UserUpdate, UserPreferencesUpdate
from app.models.user import User
from app.dependencies.auth import get_current_user
from app.dependencies.container import user_repo

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/", response_model=List[UserRead])
async def list_users(
    current_user: User = Depends(get_current_user),
) -> List[UserRead]:
    """List all users. Used for user selection in enterprise features."""
    users = await user_repo.list_all()
    return [UserRead.model_validate(u) for u in users]


@router.get("/{user_id}", response_model=UserRead)
async def get_user(
    user_id: str,
    current_user: User = Depends(get_current_user),
) -> UserRead:
    from fastapi import HTTPException
    user = await user_repo.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserRead.model_validate(user)


@router.patch("/me", response_model=UserRead)
async def update_profile(
    data: UserUpdate,
    current_user: User = Depends(get_current_user),
) -> UserRead:
    """Update current user's profile."""
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(current_user, field, value)
    saved = await user_repo.save(current_user)
    return UserRead.model_validate(saved)


@router.patch("/me/preferences", response_model=UserRead)
async def update_preferences(
    data: UserPreferencesUpdate,
    current_user: User = Depends(get_current_user),
) -> UserRead:
    """Update theme and timezone preferences."""
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(current_user, field, value)
    saved = await user_repo.save(current_user)
    return UserRead.model_validate(saved)
