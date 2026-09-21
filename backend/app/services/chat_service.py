from typing import List, Optional
from datetime import datetime, timezone

from app.repositories.chat_repository import ChatRepository
from app.repositories.enterprise_repository import EnterpriseRepository
from app.repositories.user_repository import UserRepository
from app.models.chat import Chat, ChatMember, Message
from app.models.enums import MemberStatus, MessageType, ChatType
from app.schemas.chat import ChatCreate, ChatRead, MessageCreate, MessageRead
from fastapi import HTTPException


class ChatService:
    def __init__(
        self,
        chat_repo: ChatRepository,
        enterprise_repo: EnterpriseRepository,
        user_repo: UserRepository,
    ) -> None:
        self._chats = chat_repo
        self._enterprises = enterprise_repo
        self._users = user_repo

    async def _ensure_enterprise_member(self, enterprise_id: str, user_id: str) -> None:
        member = await self._enterprises.get_member(enterprise_id, user_id)
        if not member or member.status != MemberStatus.active:
            raise HTTPException(status_code=403, detail="Not a member of this enterprise")

    async def create_chat(self, enterprise_id: str, data: ChatCreate, creator_id: str) -> ChatRead:
        await self._ensure_enterprise_member(enterprise_id, creator_id)
        chat = Chat(
            enterprise_id=enterprise_id,
            name=data.name,
            type=data.type,
        )
        saved = await self._chats.save(chat)
        # Add creator as member
        member = ChatMember(chat_id=saved.id, user_id=creator_id)
        await self._chats.add_member(member)
        return ChatRead.model_validate(saved)

    async def list_chats(self, enterprise_id: str, user_id: str) -> List[ChatRead]:
        await self._ensure_enterprise_member(enterprise_id, user_id)
        chats = await self._chats.list_by_enterprise(enterprise_id)
        return [ChatRead.model_validate(c) for c in chats]

    async def get_messages(self, chat_id: str, enterprise_id: str, user_id: str) -> List[MessageRead]:
        await self._ensure_enterprise_member(enterprise_id, user_id)
        messages = await self._chats.list_messages(chat_id)
        result = []
        for msg in messages:
            user = await self._users.get_by_id(msg.author_id)
            mr = MessageRead.model_validate(msg)
            if user:
                mr.author_name = user.name
                mr.author_avatar = user.avatar_url
            result.append(mr)
        return result

    async def save_message(self, message: Message) -> MessageRead:
        saved = await self._chats.save_message(message)
        user = await self._users.get_by_id(saved.author_id)
        mr = MessageRead.model_validate(saved)
        if user:
            mr.author_name = user.name
            mr.author_avatar = user.avatar_url
        return mr
