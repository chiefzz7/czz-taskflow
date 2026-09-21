from typing import Optional
from datetime import datetime, timezone

from fastapi import HTTPException, status

from app.repositories.user_repository import UserRepository
from app.models.user import User
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse
from app.schemas.user import UserRead
from app.core.security import hash_password, verify_password, create_access_token


class AuthService:
    def __init__(self, user_repo: UserRepository) -> None:
        self._repo = user_repo

    async def register(self, data: RegisterRequest) -> UserRead:
        existing = await self._repo.get_by_email(data.email)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already registered",
            )
        user = User(
            name=data.name,
            email=data.email.lower(),
            password_hash=hash_password(data.password),
            timezone=data.timezone,
        )
        saved = await self._repo.save(user)
        return UserRead.model_validate(saved)

    async def login(self, data: LoginRequest) -> TokenResponse:
        user = await self._repo.get_by_email(data.email.lower())
        if not user or not verify_password(data.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
            )
        token = create_access_token(subject=user.id)
        return TokenResponse(access_token=token)

    async def get_user_by_id(self, user_id: str) -> Optional[User]:
        return await self._repo.get_by_id(user_id)
