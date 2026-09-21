from typing import Optional, List, Dict
from datetime import datetime, timezone

from app.repositories.base import BaseRepository
from app.models.chat import Chat, ChatMember, Message


class ChatRepository(BaseRepository[Chat]):
    async def get_by_id(self, id: str) -> Optional[Chat]: ...
    async def list_all(self) -> List[Chat]: ...
    async def save(self, entity: Chat) -> Chat: ...
    async def delete(self, id: str) -> bool: ...

    async def list_by_enterprise(self, enterprise_id: str) -> List[Chat]: ...
    async def save_message(self, message: Message) -> Message: ...
    async def list_messages(self, chat_id: str, limit: int = 50) -> List[Message]: ...
    async def add_member(self, member: ChatMember) -> ChatMember: ...
    async def list_members(self, chat_id: str) -> List[ChatMember]: ...


class InMemoryChatRepository(ChatRepository):
    """Development in-memory chat storage."""

    def __init__(self) -> None:
        self._chats: Dict[str, Chat] = {}
        self._messages: Dict[str, List[Message]] = {}  # chat_id → messages
        self._members: Dict[str, List[ChatMember]] = {}  # chat_id → members

    async def get_by_id(self, id: str) -> Optional[Chat]:
        return self._chats.get(id)

    async def list_all(self) -> List[Chat]:
        return list(self._chats.values())

    async def save(self, chat: Chat) -> Chat:
        self._chats[chat.id] = chat
        return chat

    async def delete(self, id: str) -> bool:
        if id in self._chats:
            del self._chats[id]
            self._messages.pop(id, None)
            self._members.pop(id, None)
            return True
        return False

    async def list_by_enterprise(self, enterprise_id: str) -> List[Chat]:
        return [c for c in self._chats.values() if c.enterprise_id == enterprise_id]

    async def save_message(self, message: Message) -> Message:
        if message.chat_id not in self._messages:
            self._messages[message.chat_id] = []
        self._messages[message.chat_id].append(message)
        return message

    async def list_messages(self, chat_id: str, limit: int = 50) -> List[Message]:
        msgs = self._messages.get(chat_id, [])
        return msgs[-limit:]

    async def add_member(self, member: ChatMember) -> ChatMember:
        if member.chat_id not in self._members:
            self._members[member.chat_id] = []
        members = self._members[member.chat_id]
        if not any(m.user_id == member.user_id for m in members):
            members.append(member)
        return member

    async def list_members(self, chat_id: str) -> List[ChatMember]:
        return self._members.get(chat_id, [])


class SQLChatRepository(ChatRepository):
    """Implementação real conectada ao Supabase PostgreSQL via SQLModel."""

    def __init__(self) -> None:
        from app.core.database import engine
        self.engine = engine

    async def get_by_id(self, id: str) -> Optional[Chat]:
        from sqlmodel import Session
        with Session(self.engine) as session:
            return session.get(Chat, id)

    async def list_all(self) -> List[Chat]:
        from sqlmodel import Session, select
        with Session(self.engine) as session:
            return list(session.exec(select(Chat)).all())

    async def save(self, chat: Chat) -> Chat:
        from sqlmodel import Session
        with Session(self.engine) as session:
            merged = session.merge(chat)
            session.commit()
            session.refresh(merged)
            return merged

    async def delete(self, id: str) -> bool:
        from sqlmodel import Session, select
        with Session(self.engine) as session:
            chat = session.get(Chat, id)
            if chat:
                members = session.exec(select(ChatMember).where(ChatMember.chat_id == id)).all()
                for m in members:
                    session.delete(m)
                messages = session.exec(select(Message).where(Message.chat_id == id)).all()
                for msg in messages:
                    session.delete(msg)
                session.delete(chat)
                session.commit()
                return True
            return False

    async def list_by_enterprise(self, enterprise_id: str) -> List[Chat]:
        from sqlmodel import Session, select
        with Session(self.engine) as session:
            statement = select(Chat).where(Chat.enterprise_id == enterprise_id)
            return list(session.exec(statement).all())

    async def save_message(self, message: Message) -> Message:
        from sqlmodel import Session
        with Session(self.engine) as session:
            merged = session.merge(message)
            session.commit()
            session.refresh(merged)
            return merged

    async def list_messages(self, chat_id: str, limit: int = 50) -> List[Message]:
        from sqlmodel import Session, select
        with Session(self.engine) as session:
            statement = select(Message).where(Message.chat_id == chat_id).order_by(Message.created_at.desc()).limit(limit)
            messages = list(session.exec(statement).all())
            return list(reversed(messages))

    async def add_member(self, member: ChatMember) -> ChatMember:
        from sqlmodel import Session, select
        with Session(self.engine) as session:
            existing = session.exec(
                select(ChatMember).where(
                    ChatMember.chat_id == member.chat_id,
                    ChatMember.user_id == member.user_id,
                )
            ).first()
            if existing:
                return existing
            session.add(member)
            session.commit()
            session.refresh(member)
            return member

    async def list_members(self, chat_id: str) -> List[ChatMember]:
        from sqlmodel import Session, select
        with Session(self.engine) as session:
            statement = select(ChatMember).where(ChatMember.chat_id == chat_id)
            return list(session.exec(statement).all())

