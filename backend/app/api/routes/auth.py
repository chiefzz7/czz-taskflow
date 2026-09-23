from fastapi import APIRouter, Depends

from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse, ForgotPasswordRequest, ResetPasswordRequest
from app.schemas.user import UserRead
from app.models.user import User
from app.dependencies.auth import get_current_user
from app.dependencies.container import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserRead, status_code=201)
async def register(data: RegisterRequest) -> UserRead:
    """Register a new user account."""
    return await auth_service.register(data)


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest) -> TokenResponse:
    """Authenticate and receive a JWT access token."""
    return await auth_service.login(data)


@router.get("/me", response_model=UserRead)
async def me(current_user: User = Depends(get_current_user)) -> UserRead:
    """Get the currently authenticated user's profile."""
    return UserRead.model_validate(current_user)


@router.post("/forgot-password")
async def forgot_password(data: ForgotPasswordRequest) -> dict:
    """Request a password reset email. Always returns 200 to avoid user enumeration."""
    return await auth_service.forgot_password(data)


@router.post("/reset-password")
async def reset_password(data: ResetPasswordRequest) -> dict:
    """Reset user password using a valid token received by email."""
    return await auth_service.reset_password(data)
