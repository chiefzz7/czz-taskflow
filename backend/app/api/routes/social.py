from typing import List, Optional
from fastapi import APIRouter, Depends, Query, UploadFile, File, HTTPException, status

from app.schemas.social import (
    SocialPostCreate, SocialPostUpdate, SocialPostStatusUpdate, SocialPostRead,
)
from app.models.user import User
from app.models.enums import WorkspaceType
from app.dependencies.auth import get_current_user
from app.dependencies.container import social_service

router = APIRouter(prefix="/social", tags=["social"])


@router.get("/posts", response_model=List[SocialPostRead])
async def list_posts(
    workspace: WorkspaceType = Query(WorkspaceType.personal),
    enterprise_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
) -> List[SocialPostRead]:
    """Lista as publicações de redes sociais do workspace atual."""
    return await social_service.list_posts(
        user_id=current_user.id,
        workspace=workspace,
        enterprise_id=enterprise_id,
    )


@router.post("/posts", response_model=SocialPostRead, status_code=201)
async def create_post(
    data: SocialPostCreate,
    current_user: User = Depends(get_current_user),
) -> SocialPostRead:
    """Cria uma nova publicação/arte de rede social."""
    return await social_service.create_post(data=data, user_id=current_user.id)


@router.get("/posts/{post_id}", response_model=SocialPostRead)
async def get_post(
    post_id: str,
    current_user: User = Depends(get_current_user),
) -> SocialPostRead:
    """Busca detalhes de um post de rede social."""
    return await social_service.get_post(post_id=post_id, user_id=current_user.id)


@router.patch("/posts/{post_id}", response_model=SocialPostRead)
async def update_post(
    post_id: str,
    data: SocialPostUpdate,
    current_user: User = Depends(get_current_user),
) -> SocialPostRead:
    """Atualiza dados de uma publicação/arte."""
    return await social_service.update_post(post_id=post_id, data=data, user_id=current_user.id)


@router.patch("/posts/{post_id}/status", response_model=SocialPostRead)
async def update_post_status(
    post_id: str,
    data: SocialPostStatusUpdate,
    current_user: User = Depends(get_current_user),
) -> SocialPostRead:
    """Atualiza o status de um post (Kanban drag-and-drop)."""
    return await social_service.update_status(post_id=post_id, data=data, user_id=current_user.id)


@router.delete("/posts/{post_id}", status_code=204)
async def delete_post(
    post_id: str,
    current_user: User = Depends(get_current_user),
) -> None:
    """Remove uma publicação/arte."""
    await social_service.delete_post(post_id=post_id, user_id=current_user.id)


@router.post("/upload")
async def upload_media(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
) -> dict:
    """Faz o upload de uma arte/mídia e retorna a URL acessível."""
    if not file.content_type or not (file.content_type.startswith("image/") or file.content_type.startswith("video/")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Arquivo inválido. Por favor, envie uma imagem ou vídeo.",
        )
    
    contents = await file.read()
    url = await social_service.upload_media(
        file_bytes=contents,
        filename=file.filename or "media.png",
        content_type=file.content_type,
    )
    return {"url": url, "filename": file.filename}
