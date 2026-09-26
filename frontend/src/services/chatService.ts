import api from './api';
import type { Chat, Message, MessageCreate } from '../types/chat';
import type { User } from '../types/user';

export const chatService = {
  // ── Enterprise Chats ────────────────────────────────────────────────────────
  async listEnterpriseChats(enterpriseId: string): Promise<Chat[]> {
    const { data } = await api.get<Chat[]>(`/enterprises/${enterpriseId}/chats`);
    return data;
  },

  async createEnterpriseChannel(enterpriseId: string, name: string): Promise<Chat> {
    const { data } = await api.post<Chat>(`/enterprises/${enterpriseId}/chats`, {
      name,
      type: 'channel',
    });
    return data;
  },

  async getOrCreateEnterpriseDirectChat(enterpriseId: string, recipientId: string): Promise<Chat> {
    const { data } = await api.post<Chat>(`/enterprises/${enterpriseId}/chats/direct`, {
      recipient_id: recipientId,
      type: 'direct',
    });
    return data;
  },

  // ── Personal Independent Direct Chats ──────────────────────────────────────
  async listPersonalChats(): Promise<Chat[]> {
    const { data } = await api.get<Chat[]>('/chat/personal');
    return data;
  },

  async getOrCreatePersonalDirectChat(recipientId: string): Promise<Chat> {
    const { data } = await api.post<Chat>('/chat/personal/direct', {
      recipient_id: recipientId,
    });
    return data;
  },

  // ── Messages & History ─────────────────────────────────────────────────────
  async getMessages(chatId: string): Promise<Message[]> {
    const { data } = await api.get<Message[]>(`/chat/${chatId}/messages`);
    return data;
  },

  async sendMessage(chatId: string, payload: MessageCreate): Promise<Message> {
    const { data } = await api.post<Message>(`/chat/${chatId}/messages`, payload);
    return data;
  },

  // ── Attachment Upload ──────────────────────────────────────────────────────
  async uploadAttachment(file: File): Promise<{ url: string; filename: string; content_type: string }> {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await api.post<{ url: string; filename: string; content_type: string }>(
      '/chat/upload',
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      }
    );
    return data;
  },

  // ── Users for initiating chats ─────────────────────────────────────────────
  async listUsers(): Promise<User[]> {
    const { data } = await api.get<User[]>('/users/');
    return data;
  },
};

export default chatService;
