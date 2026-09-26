from typing import Optional
from datetime import datetime, timezone
import uuid

from sqlmodel import SQLModel, Field
from app.models.enums import MessageType, MessageStatus, ChatType


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Chat(SQLModel, table=True):
    """Chat room within an enterprise or private direct chat."""

    __tablename__ = "chats"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    enterprise_id: Optional[str] = Field(default=None, foreign_key="enterprises.id", nullable=True, index=True)
    name: Optional[str] = Field(default=None, max_length=128, nullable=True)
    type: ChatType = Field(default=ChatType.channel)
    created_at: datetime = Field(default_factory=utcnow)


class ChatMember(SQLModel, table=True):
    """Users belonging to a chat room."""

    __tablename__ = "chat_members"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    chat_id: str = Field(foreign_key="chats.id", index=True)
    user_id: str = Field(foreign_key="users.id", index=True)
    joined_at: datetime = Field(default_factory=utcnow)


class Message(SQLModel, table=True):
    """A message sent in a chat room."""

    __tablename__ = "messages"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    chat_id: str = Field(foreign_key="chats.id", index=True)
    enterprise_id: Optional[str] = Field(default=None, foreign_key="enterprises.id", nullable=True)
    author_id: str = Field(foreign_key="users.id")
    content: str
    type: MessageType = Field(default=MessageType.text)
    attachment_url: Optional[str] = Field(default=None, max_length=512)
    status: MessageStatus = Field(default=MessageStatus.sent)
    created_at: datetime = Field(default_factory=utcnow)

