from typing import Optional, List, Dict
from datetime import datetime, timezone

from app.repositories.base import BaseRepository
from app.models.chat import Chat, ChatMember, Message
from app.models.enums import ChatType


class ChatRepository(BaseRepository[Chat]):
    async def get_by_id(self, id: str) -> Optional[Chat]: ...
    async def list_all(self) -> List[Chat]: ...
    async def save(self, entity: Chat) -> Chat: ...
    async def delete(self, id: str) -> bool: ...

    async def list_by_enterprise(self, enterprise_id: str) -> List[Chat]: ...
    async def list_user_chats(self, user_id: str, enterprise_id: Optional[str] = None) -> List[Chat]: ...
    async def find_direct_chat(self, user1_id: str, user2_id: str, enterprise_id: Optional[str] = None) -> Optional[Chat]: ...
    async def is_member(self, chat_id: str, user_id: str) -> bool: ...
    async def save_message(self, message: Message) -> Message: ...
    async def list_messages(self, chat_id: str, limit: int = 50) -> List[Message]: ...
    async def get_last_message(self, chat_id: str) -> Optional[Message]: ...
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

    async def list_user_chats(self, user_id: str, enterprise_id: Optional[str] = None) -> List[Chat]:
        result = []
        for chat in self._chats.values():
            if enterprise_id:
                if chat.enterprise_id != enterprise_id:
                    continue
                # Channels are visible to all enterprise members
                if chat.type == ChatType.channel:
                    result.append(chat)
                else:
                    # Direct chat: user must be a member
                    members = self._members.get(chat.id, [])
                    if any(m.user_id == user_id for m in members):
                        result.append(chat)
            else:
                # Independent private chats have enterprise_id == None
                if chat.enterprise_id is None:
                    members = self._members.get(chat.id, [])
                    if any(m.user_id == user_id for m in members):
                        result.append(chat)
        return result

    async def find_direct_chat(self, user1_id: str, user2_id: str, enterprise_id: Optional[str] = None) -> Optional[Chat]:
        for chat in self._chats.values():
            if chat.type != ChatType.direct:
                continue
            if chat.enterprise_id != enterprise_id:
                continue
            members = self._members.get(chat.id, [])
            user_ids = {m.user_id for m in members}
            if user1_id in user_ids and user2_id in user_ids:
                return chat
        return None

    async def is_member(self, chat_id: str, user_id: str) -> bool:
        members = self._members.get(chat_id, [])
        return any(m.user_id == user_id for m in members)

    async def save_message(self, message: Message) -> Message:
        if message.chat_id not in self._messages:
            self._messages[message.chat_id] = []
        self._messages[message.chat_id].append(message)
        return message

    async def list_messages(self, chat_id: str, limit: int = 50) -> List[Message]:
        msgs = self._messages.get(chat_id, [])
        return msgs[-limit:]

    async def get_last_message(self, chat_id: str) -> Optional[Message]:
        msgs = self._messages.get(chat_id, [])
        return msgs[-1] if msgs else None

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

    async def list_user_chats(self, user_id: str, enterprise_id: Optional[str] = None) -> List[Chat]:
        from sqlmodel import Session, select
        with Session(self.engine) as session:
            if enterprise_id:
                # Channels belonging to the enterprise
                channels = list(session.exec(
                    select(Chat).where(
                        Chat.enterprise_id == enterprise_id,
                        Chat.type == ChatType.channel,
                    )
                ).all())

                # Direct chats in this enterprise where user_id is a member
                member_chat_ids = session.exec(
                    select(ChatMember.chat_id).where(ChatMember.user_id == user_id)
                ).all()

                directs = []
                if member_chat_ids:
                    directs = list(session.exec(
                        select(Chat).where(
                            Chat.id.in_(member_chat_ids),
                            Chat.enterprise_id == enterprise_id,
                            Chat.type == ChatType.direct,
                        )
                    ).all())

                return channels + directs
            else:
                # Independent private chats (enterprise_id is null)
                member_chat_ids = session.exec(
                    select(ChatMember.chat_id).where(ChatMember.user_id == user_id)
                ).all()
                if not member_chat_ids:
                    return []
                return list(session.exec(
                    select(Chat).where(
                        Chat.id.in_(member_chat_ids),
                        Chat.enterprise_id.is_(None),
                    )
                ).all())

    async def find_direct_chat(self, user1_id: str, user2_id: str, enterprise_id: Optional[str] = None) -> Optional[Chat]:
        from sqlmodel import Session, select
        with Session(self.engine) as session:
            u1_chats = session.exec(
                select(ChatMember.chat_id).where(ChatMember.user_id == user1_id)
            ).all()
            if not u1_chats:
                return None

            common_chat_ids = session.exec(
                select(ChatMember.chat_id).where(
                    ChatMember.chat_id.in_(u1_chats),
                    ChatMember.user_id == user2_id,
                )
            ).all()
            if not common_chat_ids:
                return None

            statement = select(Chat).where(
                Chat.id.in_(common_chat_ids),
                Chat.type == ChatType.direct,
            )
            if enterprise_id:
                statement = statement.where(Chat.enterprise_id == enterprise_id)
            else:
                statement = statement.where(Chat.enterprise_id.is_(None))

            return session.exec(statement).first()

    async def is_member(self, chat_id: str, user_id: str) -> bool:
        from sqlmodel import Session, select
        with Session(self.engine) as session:
            member = session.exec(
                select(ChatMember).where(
                    ChatMember.chat_id == chat_id,
                    ChatMember.user_id == user_id,
                )
            ).first()
            return member is not None

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

    async def get_last_message(self, chat_id: str) -> Optional[Message]:
        from sqlmodel import Session, select
        with Session(self.engine) as session:
            statement = select(Message).where(Message.chat_id == chat_id).order_by(Message.created_at.desc()).limit(1)
            return session.exec(statement).first()

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
