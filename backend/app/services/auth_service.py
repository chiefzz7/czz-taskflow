from typing import Optional
from datetime import datetime, timezone
import uuid

from fastapi import HTTPException, status

from app.repositories.user_repository import UserRepository
from app.models.user import User
from app.models.password_reset import PasswordResetToken
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse, ForgotPasswordRequest, ResetPasswordRequest
from app.schemas.user import UserRead
from app.core.security import hash_password, verify_password, create_access_token
from app.core.config import settings
from app.core.database import get_session
from app.services.email_service import send_reset_email
from sqlmodel import select


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
        try:
            from app.dependencies.container import enterprise_service
            await enterprise_service.process_user_pending_invitations(saved.id, saved.email)
        except Exception:
            pass
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

    async def forgot_password(self, data: ForgotPasswordRequest) -> dict:
        """Generate a reset token and send email. Always returns success to avoid user enumeration."""
        user = await self._repo.get_by_email(data.email)
        if user:
            token_value = str(uuid.uuid4())
            reset_token = PasswordResetToken(user_id=user.id, token=token_value)
            with next(get_session()) as session:
                session.add(reset_token)
                session.commit()
            reset_link = f"{settings.FRONTEND_URL}/reset-password?token={token_value}"
            try:
                send_reset_email(to_email=user.email, reset_link=reset_link, user_name=user.name)
            except Exception:
                pass  # Don't leak email errors to client
        return {"message": "Se o e-mail estiver cadastrado, voce receberá as instrucoes em breve."}

    async def reset_password(self, data: ResetPasswordRequest) -> dict:
        """Validate token and update user password."""
        with next(get_session()) as session:
            stmt = select(PasswordResetToken).where(
                PasswordResetToken.token == data.token,
                PasswordResetToken.used == False,  # noqa: E712
            )
            reset_token = session.exec(stmt).first()

            if not reset_token:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Token inválido ou expirado.")

            if datetime.now(timezone.utc) > reset_token.expires_at.replace(tzinfo=timezone.utc):
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Token expirado.")

            user = await self._repo.get_by_id(reset_token.user_id)
            if not user:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado.")

            user.password_hash = hash_password(data.new_password)
            reset_token.used = True

            session.add(user)
            session.add(reset_token)
            session.commit()

        return {"message": "Senha redefinida com sucesso!"}
