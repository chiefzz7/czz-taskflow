from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel

from app.models.enums import MessageType, MessageStatus, ChatType


class ChatCreate(BaseModel):
    name: str
    type: ChatType = ChatType.channel


class ChatRead(BaseModel):
    id: str
    enterprise_id: str
    name: str
    type: ChatType
    created_at: datetime

    class Config:
        from_attributes = True


class MessageCreate(BaseModel):
    content: str
    type: MessageType = MessageType.text
    attachment_url: Optional[str] = None


class MessageRead(BaseModel):
    id: str
    chat_id: str
    enterprise_id: str
    author_id: str
    content: str
    type: MessageType
    attachment_url: Optional[str]
    status: MessageStatus
    created_at: datetime
    # Denormalized author info for UI convenience
    author_name: Optional[str] = None
    author_avatar: Optional[str] = None

    class Config:
        from_attributes = True


class WSMessage(BaseModel):
    """WebSocket message format sent/received by clients."""
    type: MessageType = MessageType.text
    content: str
    attachment_url: Optional[str] = None
    chat_id: str
