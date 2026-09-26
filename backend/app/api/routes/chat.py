from typing import List, Optional
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from pydantic import BaseModel

from app.models.user import User
from app.models.enums import MessageType
from app.schemas.chat import ChatRead, MessageRead, MessageCreate
from app.dependencies.auth import get_current_user
from app.dependencies.container import chat_service
from app.websocket.manager import connection_manager
import json

router = APIRouter(prefix="/chat", tags=["chat"])


class DirectChatRequest(BaseModel):
    recipient_id: str


@router.get("/personal", response_model=List[ChatRead])
async def list_personal_chats(
    current_user: User = Depends(get_current_user),
) -> List[ChatRead]:
    """Lista todos os chats particulares (independentes de empresa) do usuário."""
    return await chat_service.list_personal_chats(current_user.id)


@router.post("/personal/direct", response_model=ChatRead, status_code=201)
async def get_or_create_personal_direct_chat(
    data: DirectChatRequest,
    current_user: User = Depends(get_current_user),
) -> ChatRead:
    """Abre ou cria uma conversa direta particular com outro usuário da plataforma."""
    return await chat_service.get_or_create_personal_direct_chat(
        current_user_id=current_user.id,
        recipient_id=data.recipient_id,
    )


@router.get("/{chat_id}/messages", response_model=List[MessageRead])
async def get_chat_messages(
    chat_id: str,
    current_user: User = Depends(get_current_user),
) -> List[MessageRead]:
    """Retorna o histórico de mensagens de uma conversa (empresa ou particular)."""
    return await chat_service.get_messages(chat_id=chat_id, user_id=current_user.id)


@router.post("/{chat_id}/messages", response_model=MessageRead, status_code=201)
async def send_chat_message(
    chat_id: str,
    data: MessageCreate,
    current_user: User = Depends(get_current_user),
) -> MessageRead:
    """Envia uma mensagem via HTTP e faz broadcast em tempo real via WebSocket."""
    saved = await chat_service.send_message(
        chat_id=chat_id,
        user_id=current_user.id,
        content=data.content,
        msg_type=data.type,
        attachment_url=data.attachment_url,
    )

    # Broadcast via WebSocket manager to any active subscribers
    broadcast_payload = json.dumps({
        "id": saved.id,
        "chat_id": saved.chat_id,
        "enterprise_id": saved.enterprise_id,
        "author_id": saved.author_id,
        "author_name": saved.author_name,
        "author_avatar": saved.author_avatar,
        "content": saved.content,
        "type": saved.type.value if hasattr(saved.type, "value") else str(saved.type),
        "attachment_url": saved.attachment_url,
        "status": saved.status.value if hasattr(saved.status, "value") else str(saved.status),
        "created_at": saved.created_at.isoformat(),
    }, default=str)

    await connection_manager.broadcast(broadcast_payload, chat_id)
    return saved


@router.post("/upload")
async def upload_chat_media(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
) -> dict:
    """Faz upload de imagem, áudio ou documento para envio no chat."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="Arquivo sem nome")

    contents = await file.read()
    content_type = file.content_type or "application/octet-stream"
    url = await chat_service.upload_attachment(
        file_bytes=contents,
        filename=file.filename,
        content_type=content_type,
    )
    return {"url": url, "filename": file.filename, "content_type": content_type}
