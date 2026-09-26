export type MessageType = 'text' | 'image' | 'audio';
export type MessageStatus = 'sent' | 'delivered' | 'read';
export type ChatType = 'channel' | 'direct';

export interface ChatMember {
  id: string;
  chat_id: string;
  user_id: string;
  name?: string | null;
  avatar_url?: string | null;
  email?: string | null;
}

export interface Chat {
  id: string;
  enterprise_id?: string | null;
  name?: string | null;
  type: ChatType;
  created_at: string;
  members?: ChatMember[];
  other_user?: ChatMember | null;
  last_message?: string | null;
  last_message_at?: string | null;
}

export interface Message {
  id: string;
  chat_id: string;
  enterprise_id?: string | null;
  author_id: string;
  author_name?: string | null;
  author_avatar?: string | null;
  content: string;
  type: MessageType;
  attachment_url?: string | null;
  status: MessageStatus;
  created_at: string;
}

export interface MessageCreate {
  content: string;
  type?: MessageType;
  attachment_url?: string | null;
}

export interface WSMessage {
  id: string;
  chat_id: string;
  enterprise_id?: string | null;
  author_id: string;
  author_name?: string | null;
  author_avatar?: string | null;
  content: string;
  type: MessageType;
  attachment_url?: string | null;
  status: MessageStatus;
  created_at: string;
}
