from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel

from app.models.enums import MessageType, MessageStatus, ChatType


class ChatCreate(BaseModel):
    name: Optional[str] = None
    type: ChatType = ChatType.channel
    recipient_id: Optional[str] = None


class ChatMemberRead(BaseModel):
    id: str
    chat_id: str
    user_id: str
    name: Optional[str] = None
    avatar_url: Optional[str] = None
    email: Optional[str] = None

    class Config:
        from_attributes = True


class ChatRead(BaseModel):
    id: str
    enterprise_id: Optional[str] = None
    name: Optional[str] = None
    type: ChatType
    created_at: datetime
    # Enriched fields for easy UI consumption
    members: Optional[List[ChatMemberRead]] = None
    other_user: Optional[ChatMemberRead] = None
    last_message: Optional[str] = None
    last_message_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class MessageCreate(BaseModel):
    content: str
    type: MessageType = MessageType.text
    attachment_url: Optional[str] = None


class MessageRead(BaseModel):
    id: str
    chat_id: str
    enterprise_id: Optional[str] = None
    author_id: str
    content: str
    type: MessageType
    attachment_url: Optional[str] = None
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
    chat_id: Optional[str] = None
