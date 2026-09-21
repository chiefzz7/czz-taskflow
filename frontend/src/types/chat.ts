export type MessageType = 'text' | 'image' | 'audio';
export type MessageStatus = 'sent' | 'delivered' | 'read';
export type ChatType = 'channel' | 'direct';

export interface Chat {
  id: string;
  enterprise_id: string;
  name: string;
  type: ChatType;
  created_at: string;
}

export interface Message {
  id: string;
  chat_id: string;
  enterprise_id: string;
  author_id: string;
  author_name?: string | null;
  author_avatar?: string | null;
  content: string;
  type: MessageType;
  attachment_url: string | null;
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
  enterprise_id: string;
  author_id: string;
  author_name?: string | null;
  author_avatar?: string | null;
  content: string;
  type: MessageType;
  attachment_url: string | null;
  status: MessageStatus;
  created_at: string;
}
