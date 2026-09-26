import json
from typing import Optional
from fastapi import WebSocket, WebSocketDisconnect

from app.websocket.manager import connection_manager
from app.core.security import decode_access_token
from app.models.enums import MessageType
from app.dependencies.container import chat_service, auth_service


async def handle_chat_websocket(
    websocket: WebSocket,
    chat_id: str,
    token: str,
    enterprise_id: Optional[str] = None,
) -> None:
    """
    WebSocket handler for real-time chat (enterprise channels, enterprise DMs, and personal direct chats).
    Token is validated from query param (?token=...).
    """
    # Authenticate
    user_id = decode_access_token(token)
    if not user_id:
        await websocket.close(code=4001, reason="Unauthorized")
        return

    user = await auth_service.get_user_by_id(user_id)
    if not user:
        await websocket.close(code=4001, reason="User not found")
        return

    # Validate chat access (Enterprise member or Private chat member)
    try:
        await chat_service.validate_user_chat_access(chat_id, user_id)
    except Exception as exc:
        await websocket.close(code=4003, reason=str(exc))
        return

    # Connect to room
    await connection_manager.connect(websocket, chat_id)

    try:
        while True:
            raw = await websocket.receive_text()

            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                await websocket.send_text(json.dumps({"error": "Invalid JSON"}))
                continue

            content = data.get("content", "").strip()
            raw_type = data.get("type", "text")
            attachment_url = data.get("attachment_url")

            if not content and not attachment_url:
                continue

            try:
                msg_type = MessageType(raw_type)
            except ValueError:
                msg_type = MessageType.text

            # Persist message
            saved = await chat_service.send_message(
                chat_id=chat_id,
                user_id=user_id,
                content=content,
                msg_type=msg_type,
                attachment_url=attachment_url,
            )

            # Broadcast to all clients connected to this chat room
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

    except WebSocketDisconnect:
        connection_manager.disconnect(websocket, chat_id)
