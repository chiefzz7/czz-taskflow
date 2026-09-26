from typing import List, Optional
from datetime import datetime, timezone
import uuid

from fastapi import HTTPException, status
from app.repositories.chat_repository import ChatRepository
from app.repositories.enterprise_repository import EnterpriseRepository
from app.repositories.user_repository import UserRepository
from app.services.storage_service import StorageService
from app.models.chat import Chat, ChatMember, Message
from app.models.enums import MemberStatus, MessageType, ChatType, MessageStatus
from app.schemas.chat import (
    ChatCreate, ChatRead, ChatMemberRead, MessageCreate, MessageRead,
)


class ChatService:
    def __init__(
        self,
        chat_repo: ChatRepository,
        enterprise_repo: EnterpriseRepository,
        user_repo: UserRepository,
        storage_service: Optional[StorageService] = None,
    ) -> None:
        self._chats = chat_repo
        self._enterprises = enterprise_repo
        self._users = user_repo
        self._storage = storage_service

    async def _ensure_enterprise_member(self, enterprise_id: str, user_id: str) -> None:
        member = await self._enterprises.get_member(enterprise_id, user_id)
        if not member or member.status != MemberStatus.active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Você não é um membro ativo desta empresa",
            )

    async def _enrich_chat_read(self, chat: Chat, current_user_id: str) -> ChatRead:
        """Enriches ChatRead with member info and sets direct message recipient."""
        members = await self._chats.list_members(chat.id)
        member_reads: List[ChatMemberRead] = []
        other_user: Optional[ChatMemberRead] = None

        for m in members:
            u = await self._users.get_by_id(m.user_id)
            mr = ChatMemberRead(
                id=m.id,
                chat_id=m.chat_id,
                user_id=m.user_id,
                name=u.name if u else "Usuário",
                avatar_url=u.avatar_url if u else None,
                email=u.email if u else None,
            )
            member_reads.append(mr)
            if m.user_id != current_user_id:
                other_user = mr

        # Compute display name for direct messages if not set
        display_name = chat.name
        if chat.type == ChatType.direct:
            if other_user:
                display_name = other_user.name
            else:
                display_name = "Conversa Direta"

        # Last message
        last_msg = await self._chats.get_last_message(chat.id)
        last_message_content = None
        last_message_at = None
        if last_msg:
            if last_msg.type == MessageType.image:
                last_message_content = "📷 Imagem"
            elif last_msg.type == MessageType.audio:
                last_message_content = "🎤 Mensagem de áudio"
            else:
                last_message_content = last_msg.content
            last_message_at = last_msg.created_at

        return ChatRead(
            id=chat.id,
            enterprise_id=chat.enterprise_id,
            name=display_name,
            type=chat.type,
            created_at=chat.created_at,
            members=member_reads,
            other_user=other_user,
            last_message=last_message_content,
            last_message_at=last_message_at,
        )

    # ── Enterprise Chats ───────────────────────────────────────────────────────

    async def list_enterprise_chats(self, enterprise_id: str, user_id: str) -> List[ChatRead]:
        """Lists enterprise channels and direct chats for the user in this enterprise."""
        await self._ensure_enterprise_member(enterprise_id, user_id)
        chats = await self._chats.list_user_chats(user_id=user_id, enterprise_id=enterprise_id)

        # If enterprise has no channels at all yet, auto-create a default #geral channel
        has_channel = any(c.type == ChatType.channel for c in chats)
        if not has_channel:
            default_channel = Chat(
                enterprise_id=enterprise_id,
                name="geral",
                type=ChatType.channel,
            )
            saved = await self._chats.save(default_channel)
            await self._chats.add_member(ChatMember(chat_id=saved.id, user_id=user_id))
            chats.insert(0, saved)

        result = []
        for chat in chats:
            result.append(await self._enrich_chat_read(chat, user_id))
        return result

    async def create_enterprise_channel(self, enterprise_id: str, name: str, creator_id: str) -> ChatRead:
        """Creates a new enterprise channel (e.g. #projetos, #anuncios)."""
        await self._ensure_enterprise_member(enterprise_id, creator_id)
        clean_name = name.strip().lstrip("#").lower()
        if not clean_name:
            raise HTTPException(status_code=400, detail="Nome do canal inválido")

        chat = Chat(
            enterprise_id=enterprise_id,
            name=clean_name,
            type=ChatType.channel,
        )
        saved = await self._chats.save(chat)
        await self._chats.add_member(ChatMember(chat_id=saved.id, user_id=creator_id))
        return await self._enrich_chat_read(saved, creator_id)

    async def get_or_create_enterprise_direct_chat(
        self, enterprise_id: str, current_user_id: str, recipient_id: str
    ) -> ChatRead:
        """Opens or creates a 1-on-1 direct chat with a colleague in this enterprise."""
        await self._ensure_enterprise_member(enterprise_id, current_user_id)
        await self._ensure_enterprise_member(enterprise_id, recipient_id)

        if current_user_id == recipient_id:
            raise HTTPException(status_code=400, detail="Você não pode criar chat direto consigo mesmo")

        existing = await self._chats.find_direct_chat(
            user1_id=current_user_id,
            user2_id=recipient_id,
            enterprise_id=enterprise_id,
        )
        if existing:
            return await self._enrich_chat_read(existing, current_user_id)

        # Create new direct chat
        chat = Chat(
            enterprise_id=enterprise_id,
            name=None,
            type=ChatType.direct,
        )
        saved = await self._chats.save(chat)
        await self._chats.add_member(ChatMember(chat_id=saved.id, user_id=current_user_id))
        await self._chats.add_member(ChatMember(chat_id=saved.id, user_id=recipient_id))
        return await self._enrich_chat_read(saved, current_user_id)

    # ── Independent Private Chats (Chat Particular) ───────────────────────────

    async def list_personal_chats(self, user_id: str) -> List[ChatRead]:
        """Lists independent private direct chats not tied to any enterprise."""
        chats = await self._chats.list_user_chats(user_id=user_id, enterprise_id=None)
        result = []
        for chat in chats:
            result.append(await self._enrich_chat_read(chat, user_id))
        return result

    async def get_or_create_personal_direct_chat(
        self, current_user_id: str, recipient_id: str
    ) -> ChatRead:
        """Opens or creates an independent direct conversation between two TaskFlow users."""
        if current_user_id == recipient_id:
            raise HTTPException(status_code=400, detail="Você não pode criar chat direto consigo mesmo")

        recipient = await self._users.get_by_id(recipient_id)
        if not recipient:
            raise HTTPException(status_code=404, detail="Usuário destinatário não encontrado")

        existing = await self._chats.find_direct_chat(
            user1_id=current_user_id,
            user2_id=recipient_id,
            enterprise_id=None,
        )
        if existing:
            return await self._enrich_chat_read(existing, current_user_id)

        chat = Chat(
            enterprise_id=None,
            name=None,
            type=ChatType.direct,
        )
        saved = await self._chats.save(chat)
        await self._chats.add_member(ChatMember(chat_id=saved.id, user_id=current_user_id))
        await self._chats.add_member(ChatMember(chat_id=saved.id, user_id=recipient_id))
        return await self._enrich_chat_read(saved, current_user_id)

    # ── Permission & Room Check ───────────────────────────────────────────────

    async def validate_user_chat_access(self, chat_id: str, user_id: str) -> Chat:
        """
        Validates whether user_id is authorized to view/send messages in chat_id.
        Raises 404 or 403 if unauthorized.
        """
        chat = await self._chats.get_by_id(chat_id)
        if not chat:
            raise HTTPException(status_code=404, detail="Chat não encontrado")

        if chat.enterprise_id:
            # Must be an active member of this enterprise
            await self._ensure_enterprise_member(chat.enterprise_id, user_id)
            # If direct chat, user must be one of the participants
            if chat.type == ChatType.direct:
                is_mem = await self._chats.is_member(chat.id, user_id)
                if not is_mem:
                    raise HTTPException(status_code=403, detail="Acesso não autorizado a esta conversa")
        else:
            # Personal independent chat: user must be in chat_members
            is_mem = await self._chats.is_member(chat.id, user_id)
            if not is_mem:
                raise HTTPException(status_code=403, detail="Acesso não autorizado a este chat particular")

        return chat

    # ── Messages & Attachments ────────────────────────────────────────────────

    async def get_messages(self, chat_id: str, user_id: str, limit: int = 50) -> List[MessageRead]:
        chat = await self.validate_user_chat_access(chat_id, user_id)
        messages = await self._chats.list_messages(chat_id, limit=limit)
        result = []
        for msg in messages:
            u = await self._users.get_by_id(msg.author_id)
            mr = MessageRead.model_validate(msg)
            if u:
                mr.author_name = u.name
                mr.author_avatar = u.avatar_url
            result.append(mr)
        return result

    async def send_message(
        self,
        chat_id: str,
        user_id: str,
        content: str,
        msg_type: MessageType = MessageType.text,
        attachment_url: Optional[str] = None,
    ) -> MessageRead:
        chat = await self.validate_user_chat_access(chat_id, user_id)

        message = Message(
            chat_id=chat_id,
            enterprise_id=chat.enterprise_id,
            author_id=user_id,
            content=content,
            type=msg_type,
            attachment_url=attachment_url,
            status=MessageStatus.sent,
        )
        saved = await self._chats.save_message(message)

        u = await self._users.get_by_id(user_id)
        mr = MessageRead.model_validate(saved)
        if u:
            mr.author_name = u.name
            mr.author_avatar = u.avatar_url
        return mr

    async def upload_attachment(self, file_bytes: bytes, filename: str, content_type: str) -> str:
        """Uploads chat attachment using the configured storage service."""
        if not self._storage:
            raise HTTPException(status_code=500, detail="Serviço de armazenamento não configurado")
        return await self._storage.upload(
            file_bytes=file_bytes,
            filename=f"chat_{filename}",
            content_type=content_type,
        )
