import json
from datetime import datetime, timezone

from fastapi import WebSocket, WebSocketDisconnect

from app.websocket.manager import connection_manager
from app.core.security import decode_access_token
from app.models.chat import Message
from app.models.enums import MessageType, MessageStatus
from app.dependencies.container import chat_service, auth_service, enterprise_service


async def handle_chat_websocket(
    websocket: WebSocket,
    enterprise_id: str,
    chat_id: str,
    token: str,
) -> None:
    """
    WebSocket handler for enterprise chat.
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

    # Validate enterprise membership
    role = await enterprise_service.get_member_role(enterprise_id, user_id)
    if role is None:
        await websocket.close(code=4003, reason="Not a member")
        return

    # Connect
    await connection_manager.connect(websocket, enterprise_id, chat_id)

    try:
        while True:
            raw = await websocket.receive_text()

            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                await websocket.send_text(json.dumps({"error": "Invalid JSON"}))
                continue

            # Build and persist message
            msg_type = MessageType(data.get("type", "text"))
            message = Message(
                chat_id=chat_id,
                enterprise_id=enterprise_id,
                author_id=user_id,
                content=data.get("content", ""),
                type=msg_type,
                attachment_url=data.get("attachment_url"),
                status=MessageStatus.sent,
            )
            saved = await chat_service.save_message(message)

            # Broadcast to all clients in the room
            broadcast_payload = json.dumps({
                "id": saved.id,
                "chat_id": saved.chat_id,
                "enterprise_id": saved.enterprise_id,
                "author_id": saved.author_id,
                "author_name": saved.author_name,
                "author_avatar": saved.author_avatar,
                "content": saved.content,
                "type": saved.type,
                "attachment_url": saved.attachment_url,
                "status": saved.status,
                "created_at": saved.created_at.isoformat(),
            }, default=str)

            await connection_manager.broadcast(broadcast_payload, enterprise_id, chat_id)

    except WebSocketDisconnect:
        connection_manager.disconnect(websocket, enterprise_id, chat_id)
