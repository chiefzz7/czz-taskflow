from typing import List, Optional
from fastapi import APIRouter, Depends, Query, UploadFile, File, HTTPException, status

from app.schemas.social import (
    SocialPostCreate, SocialPostUpdate, SocialPostStatusUpdate, SocialPostRead,
    EditRequest, SocialSettingsUpdate, SocialSettingsRead,
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
    """Lista as publicacoes de redes sociais do workspace atual."""
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
    """Cria uma nova publicacao/arte de rede social."""
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
    """Atualiza dados de uma publicacao/arte."""
    return await social_service.update_post(post_id=post_id, data=data, user_id=current_user.id)


@router.patch("/posts/{post_id}/status", response_model=SocialPostRead)
async def update_post_status(
    post_id: str,
    data: SocialPostStatusUpdate,
    current_user: User = Depends(get_current_user),
) -> SocialPostRead:
    """Atualiza o status de um post (Kanban drag-and-drop)."""
    return await social_service.update_status(post_id=post_id, data=data, user_id=current_user.id)


@router.post("/posts/{post_id}/request-edit", response_model=SocialPostRead)
async def request_edit(
    post_id: str,
    data: EditRequest,
    current_user: User = Depends(get_current_user),
) -> SocialPostRead:
    """Marca o post como 'Precisa Editar' com notas descrevendo o que alterar."""
    return await social_service.request_edit(post_id=post_id, data=data, user_id=current_user.id)


@router.delete("/posts/{post_id}/request-edit", response_model=SocialPostRead)
async def clear_edit_flag(
    post_id: str,
    current_user: User = Depends(get_current_user),
) -> SocialPostRead:
    """Remove o flag de 'Precisa Editar' do post."""
    return await social_service.clear_edit_flag(post_id=post_id, user_id=current_user.id)


@router.delete("/posts/{post_id}", status_code=204)
async def delete_post(
    post_id: str,
    current_user: User = Depends(get_current_user),
) -> None:
    """Remove uma publicacao/arte."""
    await social_service.delete_post(post_id=post_id, user_id=current_user.id)


@router.post("/upload")
async def upload_media(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
) -> dict:
    """Faz o upload de uma arte/midia e retorna a URL acessivel."""
    if not file.content_type or not (file.content_type.startswith("image/") or file.content_type.startswith("video/")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Arquivo invalido. Por favor, envie uma imagem ou video.",
        )

    contents = await file.read()
    url = await social_service.upload_media(
        file_bytes=contents,
        filename=file.filename or "media.png",
        content_type=file.content_type,
    )
    return {"url": url, "filename": file.filename}


# --- Settings Endpoints --------------------------------------------------------

@router.get("/settings/{enterprise_id}", response_model=SocialSettingsRead)
async def get_social_settings(
    enterprise_id: str,
    current_user: User = Depends(get_current_user),
) -> SocialSettingsRead:
    """Retorna as configuracoes de redes sociais de uma empresa."""
    result = await social_service.get_settings(enterprise_id=enterprise_id)
    return result


@router.put("/settings/{enterprise_id}", response_model=SocialSettingsRead)
async def update_social_settings(
    enterprise_id: str,
    data: SocialSettingsUpdate,
    current_user: User = Depends(get_current_user),
) -> SocialSettingsRead:
    """Cria ou atualiza as configuracoes de redes sociais de uma empresa."""
    result = await social_service.update_settings(enterprise_id=enterprise_id, data=data)
    return result
