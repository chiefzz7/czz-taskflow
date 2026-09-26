import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  MessageSquare, Hash, User as UserIcon, Plus, Send, Paperclip,
  Image as ImageIcon, Search, ArrowLeft, Wifi, WifiOff,
  Building2, Lock, X, Check, CheckCheck, Loader2, Volume2
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { chatService } from '../../services/chatService';
import { enterpriseService } from '../../services/enterpriseService';
import type { Chat, Message, ChatMember } from '../../types/chat';
import type { User } from '../../types/user';
import type { Enterprise, EnterpriseMember } from '../../types/enterprise';
import { cn } from '../../utils/cn';

export default function ChatPage() {
  const { user } = useAuth();
  const { workspace } = useWorkspace();

  // Active chat tab: 'enterprise' | 'personal'
  const isEnterpriseWorkspace = workspace.type === 'enterprise';
  const [activeTab, setActiveTab] = useState<'enterprise' | 'personal'>(
    isEnterpriseWorkspace ? 'enterprise' : 'personal'
  );

  // Enterprises list if user is switching
  const [userEnterprises, setUserEnterprises] = useState<Enterprise[]>([]);
  const [selectedEnterpriseId, setSelectedEnterpriseId] = useState<string | null>(
    isEnterpriseWorkspace ? workspace.enterprise.id : null
  );

  // Chats & Messages state
  const [enterpriseChats, setEnterpriseChats] = useState<Chat[]>([]);
  const [personalChats, setPersonalChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingChats, setLoadingChats] = useState<boolean>(true);
  const [loadingMessages, setLoadingMessages] = useState<boolean>(false);
  const [sending, setSending] = useState<boolean>(false);

  // New message input
  const [inputText, setInputText] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [attachment, setAttachment] = useState<{ file: File; previewUrl: string; type: 'image' | 'audio' } | null>(null);
  const [uploadingAttachment, setUploadingAttachment] = useState<boolean>(false);

  // Modals
  const [showNewChannelModal, setShowNewChannelModal] = useState<boolean>(false);
  const [newChannelName, setNewChannelName] = useState<string>('');
  const [creatingChannel, setCreatingChannel] = useState<boolean>(false);

  const [showNewDirectModal, setShowNewDirectModal] = useState<boolean>(false);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [enterpriseMembers, setEnterpriseMembers] = useState<EnterpriseMember[]>([]);
  const [userSearchTerm, setUserSearchTerm] = useState<string>('');
  const [startingDirectChat, setStartingDirectChat] = useState<boolean>(false);

  // WebSocket state
  const [wsConnected, setWsConnected] = useState<boolean>(false);
  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Image lightbox
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

  // Keep selectedEnterpriseId in sync with workspace context
  useEffect(() => {
    if (workspace.type === 'enterprise') {
      setSelectedEnterpriseId(workspace.enterprise.id);
      setActiveTab('enterprise');
    }
  }, [workspace]);

  // Load user enterprises for switching when not inside enterprise workspace
  useEffect(() => {
    async function loadEnterprises() {
      try {
        const ents = await enterpriseService.list();
        setUserEnterprises(ents);
        if (!selectedEnterpriseId && ents.length > 0) {
          setSelectedEnterpriseId(ents[0].id);
        }
      } catch (err) {
        console.error('Erro ao listar empresas do usuário:', err);
      }
    }
    loadEnterprises();
  }, []);

  // ── Load Chats ─────────────────────────────────────────────────────────────
  const loadChats = useCallback(async () => {
    setLoadingChats(true);
    try {
      if (activeTab === 'enterprise' && selectedEnterpriseId) {
        const chats = await chatService.listEnterpriseChats(selectedEnterpriseId);
        setEnterpriseChats(chats);
        // Auto-select first channel if none selected
        if (!activeChat || activeChat.enterprise_id !== selectedEnterpriseId) {
          const first = chats[0];
          if (first) setActiveChat(first);
        }
      } else if (activeTab === 'personal') {
        const chats = await chatService.listPersonalChats();
        setPersonalChats(chats);
        if (!activeChat || activeChat.enterprise_id) {
          const first = chats[0];
          if (first) setActiveChat(first);
        }
      }
    } catch (err) {
      console.error('Erro ao carregar conversas:', err);
    } finally {
      setLoadingChats(false);
    }
  }, [activeTab, selectedEnterpriseId, activeChat]);

  useEffect(() => {
    loadChats();
  }, [activeTab, selectedEnterpriseId]);

  // ── Load Messages for Active Chat ──────────────────────────────────────────
  const loadActiveChatMessages = useCallback(async (chatId: string) => {
    setLoadingMessages(true);
    try {
      const msgs = await chatService.getMessages(chatId);
      setMessages(msgs);
    } catch (err) {
      console.error('Erro ao carregar mensagens:', err);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    if (activeChat) {
      loadActiveChatMessages(activeChat.id);
    } else {
      setMessages([]);
    }
  }, [activeChat?.id]);

  // Scroll to bottom on messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── WebSocket Connection for Active Chat ───────────────────────────────────
  useEffect(() => {
    if (!activeChat) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setWsConnected(false);
      return;
    }

    const token = localStorage.getItem('taskflow_token');
    if (!token) return;

    let wsBase = import.meta.env.VITE_WS_URL || '';
    if (!wsBase) {
      const isHttps = window.location.protocol === 'https:';
      wsBase = `${isHttps ? 'wss:' : 'ws:'}//${window.location.host}`;
    }

    // Ensure clean WS URL
    wsBase = wsBase.replace(/\/+$/, '');
    const wsUrl = `${wsBase}/ws/chat/${activeChat.id}?token=${encodeURIComponent(token)}`;

    let isSubscribed = true;
    let socket: WebSocket;

    try {
      socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        if (isSubscribed) setWsConnected(true);
      };

      socket.onmessage = (event) => {
        if (!isSubscribed) return;
        try {
          const data = JSON.parse(event.data);
          if (data.id && data.chat_id === activeChat.id) {
            setMessages((prev) => {
              // Avoid duplicates
              if (prev.some((m) => m.id === data.id)) return prev;
              return [...prev, data as Message];
            });
          }
        } catch (e) {
          console.error('Erro ao processar mensagem do websocket:', e);
        }
      };

      socket.onclose = () => {
        if (isSubscribed) setWsConnected(false);
      };

      socket.onerror = () => {
        if (isSubscribed) setWsConnected(false);
      };
    } catch (e) {
      console.error('Erro ao conectar websocket:', e);
    }

    return () => {
      isSubscribed = false;
      if (socket) {
        socket.close();
      }
    };
  }, [activeChat?.id]);

  // ── Send Message ───────────────────────────────────────────────────────────
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeChat || (!inputText.trim() && !attachment)) return;

    setSending(true);
    let attachmentUrl = '';
    let msgType: 'text' | 'image' | 'audio' = 'text';

    try {
      if (attachment) {
        setUploadingAttachment(true);
        const uploadRes = await chatService.uploadAttachment(attachment.file);
        attachmentUrl = uploadRes.url;
        msgType = attachment.type;
        setAttachment(null);
      }

      const content = inputText.trim();
      setInputText('');

      // Send via WebSocket if connected, otherwise fallback to HTTP
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            content,
            type: msgType,
            attachment_url: attachmentUrl || null,
          })
        );
      } else {
        const saved = await chatService.sendMessage(activeChat.id, {
          content,
          type: msgType,
          attachment_url: attachmentUrl || null,
        });
        setMessages((prev) => [...prev, saved]);
      }
    } catch (err) {
      console.error('Erro ao enviar mensagem:', err);
    } finally {
      setSending(false);
      setUploadingAttachment(false);
    }
  };

  // ── Handle Attachment Selection ────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    const isAudio = file.type.startsWith('audio/');

    if (!isImage && !isAudio) {
      alert('Por favor, selecione uma imagem ou arquivo de áudio.');
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setAttachment({
      file,
      previewUrl,
      type: isImage ? 'image' : 'audio',
    });
  };

  // ── Create Channel ─────────────────────────────────────────────────────────
  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEnterpriseId || !newChannelName.trim()) return;

    setCreatingChannel(true);
    try {
      const channel = await chatService.createEnterpriseChannel(selectedEnterpriseId, newChannelName.trim());
      setEnterpriseChats((prev) => [channel, ...prev]);
      setActiveChat(channel);
      setShowNewChannelModal(false);
      setNewChannelName('');
    } catch (err) {
      console.error('Erro ao criar canal:', err);
    } finally {
      setCreatingChannel(false);
    }
  };

  // ── Open Direct Chat Modal & Search Users ──────────────────────────────────
  const handleOpenDirectChatModal = async () => {
    setShowNewDirectModal(true);
    setUserSearchTerm('');
    try {
      if (activeTab === 'enterprise' && selectedEnterpriseId) {
        const members = await enterpriseService.listMembers(selectedEnterpriseId);
        setEnterpriseMembers(members.filter((m) => m.user_id !== user?.id));
      } else {
        const users = await chatService.listUsers();
        setAvailableUsers(users.filter((u) => u.id !== user?.id));
      }
    } catch (err) {
      console.error('Erro ao carregar usuários:', err);
    }
  };

  const handleStartDirectChat = async (targetUserId: string) => {
    setStartingDirectChat(true);
    try {
      let chat: Chat;
      if (activeTab === 'enterprise' && selectedEnterpriseId) {
        chat = await chatService.getOrCreateEnterpriseDirectChat(selectedEnterpriseId, targetUserId);
        setEnterpriseChats((prev) => {
          if (prev.some((c) => c.id === chat.id)) return prev;
          return [chat, ...prev];
        });
      } else {
        chat = await chatService.getOrCreatePersonalDirectChat(targetUserId);
        setPersonalChats((prev) => {
          if (prev.some((c) => c.id === chat.id)) return prev;
          return [chat, ...prev];
        });
      }
      setActiveChat(chat);
      setShowNewDirectModal(false);
    } catch (err) {
      console.error('Erro ao iniciar chat direto:', err);
    } finally {
      setStartingDirectChat(false);
    }
  };

  // Filter current chats
  const currentChatList = activeTab === 'enterprise' ? enterpriseChats : personalChats;
  const filteredChats = currentChatList.filter((c) => {
    const name = c.name || c.other_user?.name || '';
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const channels = filteredChats.filter((c) => c.type === 'channel');
  const directChats = filteredChats.filter((c) => c.type === 'direct');

  return (
    <div className="flex h-[calc(100vh-6rem)] md:h-[calc(100vh-5rem)] bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
      {/* ── SIDEBAR: Chats & Channels ──────────────────────────────────────── */}
      <div
        className={cn(
          'w-full md:w-80 lg:w-96 flex flex-col border-r border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950/40 transition-all',
          activeChat ? 'hidden md:flex' : 'flex'
        )}
      >
        {/* Header & Tabs */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Chat & Mensagens
            </h1>
          </div>

          {/* Scope Selector: Empresa vs Particular */}
          <div className="grid grid-cols-2 p-1 bg-gray-200 dark:bg-gray-800/80 rounded-xl text-xs font-semibold">
            <button
              onClick={() => {
                setActiveTab('enterprise');
                setActiveChat(null);
              }}
              className={cn(
                'flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all',
                activeTab === 'enterprise'
                  ? 'bg-white dark:bg-gray-900 text-indigo-600 dark:text-indigo-400 shadow-sm font-bold'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              )}
            >
              <Building2 className="w-3.5 h-3.5" />
              Empresa
            </button>
            <button
              onClick={() => {
                setActiveTab('personal');
                setActiveChat(null);
              }}
              className={cn(
                'flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all',
                activeTab === 'personal'
                  ? 'bg-white dark:bg-gray-900 text-indigo-600 dark:text-indigo-400 shadow-sm font-bold'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              )}
            >
              <Lock className="w-3.5 h-3.5" />
              Particular
            </button>
          </div>

          {/* Enterprise selector dropdown if in enterprise tab */}
          {activeTab === 'enterprise' && (
            <div>
              {userEnterprises.length > 1 ? (
                <select
                  value={selectedEnterpriseId || ''}
                  onChange={(e) => {
                    setSelectedEnterpriseId(e.target.value);
                    setActiveChat(null);
                  }}
                  className="w-full text-xs font-medium bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1.5 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {userEnterprises.map((ent) => (
                    <option key={ent.id} value={ent.id}>
                      {ent.name}
                    </option>
                  ))}
                </select>
              ) : userEnterprises.length === 1 ? (
                <div className="flex items-center gap-1.5 px-2 py-1 bg-indigo-50 dark:bg-indigo-950/40 rounded-lg text-xs font-medium text-indigo-700 dark:text-indigo-300">
                  <Building2 className="w-3.5 h-3.5" />
                  <span className="truncate">{userEnterprises[0].name}</span>
                </div>
              ) : (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Você ainda não possui nenhuma empresa vinculada.
                </p>
              )}
            </div>
          )}

          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar canal ou conversa..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Channels & Direct Conversations List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {loadingChats ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-500 mb-2" />
              <span className="text-xs">Carregando conversas...</span>
            </div>
          ) : (
            <>
              {/* Enterprise Channels Section */}
              {activeTab === 'enterprise' && (
                <div>
                  <div className="flex items-center justify-between px-2 mb-1.5">
                    <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                      Canais de Equipe
                    </span>
                    <button
                      onClick={() => setShowNewChannelModal(true)}
                      className="p-1 hover:bg-gray-200 dark:hover:bg-gray-800 rounded text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                      title="Criar novo canal"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="space-y-0.5">
                    {channels.length === 0 ? (
                      <p className="text-xs text-gray-400 px-2 py-1">Nenhum canal encontrado</p>
                    ) : (
                      channels.map((chat) => (
                        <button
                          key={chat.id}
                          onClick={() => setActiveChat(chat)}
                          className={cn(
                            'w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-left transition-all',
                            activeChat?.id === chat.id
                              ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900'
                          )}
                        >
                          <Hash className="w-4 h-4 opacity-75 shrink-0" />
                          <span className="truncate flex-1">{chat.name}</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Direct Messages Section */}
              <div>
                <div className="flex items-center justify-between px-2 mb-1.5">
                  <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                    {activeTab === 'enterprise' ? 'Mensagens Diretas' : 'Conversas Particulares'}
                  </span>
                  <button
                    onClick={handleOpenDirectChatModal}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-800 rounded text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                    title="Iniciar nova conversa direta"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-1">
                  {directChats.length === 0 ? (
                    <div className="text-center py-6 px-3">
                      <p className="text-xs text-gray-400">Nenhuma conversa direta ainda.</p>
                      <button
                        onClick={handleOpenDirectChatModal}
                        className="mt-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        + Iniciar conversa
                      </button>
                    </div>
                  ) : (
                    directChats.map((chat) => {
                      const other = chat.other_user;
                      const isSelected = activeChat?.id === chat.id;

                      return (
                        <button
                          key={chat.id}
                          onClick={() => setActiveChat(chat)}
                          className={cn(
                            'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs text-left transition-all',
                            isSelected
                              ? 'bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/80 shadow-sm'
                              : 'hover:bg-gray-100 dark:hover:bg-gray-900'
                          )}
                        >
                          <div className="relative shrink-0">
                            {other?.avatar_url ? (
                              <img
                                src={other.avatar_url}
                                alt={other.name || 'Usuário'}
                                className="w-8 h-8 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs">
                                {(other?.name || chat.name || 'U').charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span
                                className={cn(
                                  'font-semibold truncate',
                                  isSelected
                                    ? 'text-indigo-900 dark:text-indigo-200'
                                    : 'text-gray-900 dark:text-gray-100'
                                )}
                              >
                                {other?.name || chat.name || 'Usuário'}
                              </span>
                            </div>
                            {chat.last_message && (
                              <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
                                {chat.last_message}
                              </p>
                            )}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── CHAT PANE: Active Chat & Messages ──────────────────────────────── */}
      <div className={cn('flex-1 flex flex-col h-full bg-white dark:bg-gray-900', !activeChat ? 'hidden md:flex' : 'flex')}>
        {activeChat ? (
          <>
            {/* Active Chat Header */}
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-gray-900 z-10">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveChat(null)}
                  className="md:hidden p-1.5 -ml-1 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>

                {activeChat.type === 'channel' ? (
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    <Hash className="w-5 h-5" />
                  </div>
                ) : activeChat.other_user?.avatar_url ? (
                  <img
                    src={activeChat.other_user.avatar_url}
                    alt={activeChat.other_user.name || ''}
                    className="w-9 h-9 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                    {(activeChat.other_user?.name || activeChat.name || 'U').charAt(0).toUpperCase()}
                  </div>
                )}

                <div>
                  <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                    {activeChat.type === 'channel' ? `# ${activeChat.name}` : activeChat.other_user?.name || activeChat.name}
                    {activeChat.enterprise_id ? (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900">
                        Empresa
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-900">
                        Particular
                      </span>
                    )}
                  </h2>
                  <p className="text-[11px] text-gray-400">
                    {activeChat.type === 'channel'
                      ? 'Canal compartilhado com toda a equipe'
                      : activeChat.other_user?.email || 'Conversa direta'}
                  </p>
                </div>
              </div>

              {/* Status indicator */}
              <div className="flex items-center gap-1.5 text-[11px] font-medium">
                {wsConnected ? (
                  <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Ao vivo
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-amber-500 dark:text-amber-400">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    Reconectando...
                  </span>
                )}
              </div>
            </div>

            {/* Messages Body */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-gray-50/30 dark:bg-gray-950/20">
              {loadingMessages ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <Loader2 className="w-7 h-7 animate-spin text-indigo-500 mb-2" />
                  <span className="text-xs">Carregando mensagens...</span>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 py-12">
                  <MessageSquare className="w-12 h-12 text-indigo-300 dark:text-indigo-700 mb-3" />
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Nenhuma mensagem ainda</p>
                  <p className="text-xs text-gray-400 mt-1 max-w-xs">
                    Diga olá para iniciar esta conversa em tempo real!
                  </p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMine = msg.author_id === user?.id;
                  const time = new Date(msg.created_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <div
                      key={msg.id}
                      className={cn('flex items-end gap-2.5', isMine ? 'justify-end' : 'justify-start')}
                    >
                      {!isMine && (
                        <div className="shrink-0 mb-1">
                          {msg.author_avatar ? (
                            <img
                              src={msg.author_avatar}
                              alt={msg.author_name || 'U'}
                              className="w-7 h-7 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-[10px]">
                              {(msg.author_name || 'U').charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                      )}

                      <div className={cn('max-w-[85%] md:max-w-[70%]')}>
                        {!isMine && (
                          <span className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-1 ml-1">
                            {msg.author_name}
                          </span>
                        )}

                        <div
                          className={cn(
                            'p-3.5 rounded-2xl shadow-sm space-y-2',
                            isMine
                              ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-br-none'
                              : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200/80 dark:border-gray-700/60 rounded-bl-none'
                          )}
                        >
                          {/* Image Attachment */}
                          {msg.type === 'image' && msg.attachment_url && (
                            <div className="rounded-lg overflow-hidden border border-black/10 dark:border-white/10 max-w-sm">
                              <img
                                src={msg.attachment_url}
                                alt="Anexo"
                                onClick={() => setLightboxImg(msg.attachment_url || null)}
                                className="w-full max-h-64 object-cover cursor-pointer hover:opacity-95 transition-opacity"
                              />
                            </div>
                          )}

                          {/* Audio Attachment */}
                          {msg.type === 'audio' && msg.attachment_url && (
                            <div className="py-1">
                              <audio controls className="w-full max-w-xs h-10 rounded">
                                <source src={msg.attachment_url} />
                                Seu navegador não suporta reprodução de áudio.
                              </audio>
                            </div>
                          )}

                          {/* Text Content */}
                          {msg.content && (
                            <p className="text-xs md:text-sm whitespace-pre-wrap break-words leading-relaxed">
                              {msg.content}
                            </p>
                          )}

                          <div
                            className={cn(
                              'flex items-center justify-end gap-1 text-[10px]',
                              isMine ? 'text-indigo-200' : 'text-gray-400'
                            )}
                          >
                            <span>{time}</span>
                            {isMine && <CheckCheck className="w-3.5 h-3.5 text-indigo-200" />}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <div className="p-3 md:p-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
              {/* Attachment Preview */}
              {attachment && (
                <div className="mb-2 p-2 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl border border-indigo-200 dark:border-indigo-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {attachment.type === 'image' ? (
                      <img
                        src={attachment.previewUrl}
                        alt="Preview"
                        className="w-10 h-10 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                        <Volume2 className="w-5 h-5" />
                      </div>
                    )}
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate max-w-xs">
                      {attachment.file.name}
                    </span>
                  </div>
                  <button
                    onClick={() => setAttachment(null)}
                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*,audio/*"
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors shrink-0"
                  title="Anexar imagem ou áudio"
                >
                  <Paperclip className="w-5 h-5" />
                </button>

                <input
                  type="text"
                  placeholder="Escreva uma mensagem..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  disabled={sending || uploadingAttachment}
                  className="flex-1 bg-gray-100 dark:bg-gray-800 border-none rounded-xl px-4 py-2.5 text-xs md:text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />

                <button
                  type="submit"
                  disabled={(!inputText.trim() && !attachment) || sending || uploadingAttachment}
                  className="p-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white rounded-xl shadow-sm transition-all shrink-0 flex items-center justify-center"
                >
                  {sending || uploadingAttachment ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-gray-50/20 dark:bg-gray-950/10">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-4 shadow-sm">
              <MessageSquare className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Selecione uma conversa</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm">
              Escolha um canal ou conversa na lista à esquerda para ver o histórico e conversar em tempo real.
            </p>
          </div>
        )}
      </div>

      {/* ── MODAL: Novo Canal ──────────────────────────────────────────────── */}
      {showNewChannelModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Hash className="w-5 h-5 text-indigo-600" />
                Criar Novo Canal
              </h3>
              <button
                onClick={() => setShowNewChannelModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateChannel} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Nome do Canal
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">#</span>
                  <input
                    type="text"
                    required
                    placeholder="ex: projetos, anuncios, suporte"
                    value={newChannelName}
                    onChange={(e) => setNewChannelName(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-xs md:text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewChannelModal(false)}
                  className="px-4 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!newChannelName.trim() || creatingChannel}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  {creatingChannel ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  Criar Canal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Nova Conversa Direta ───────────────────────────────────── */}
      {showNewDirectModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <UserIcon className="w-5 h-5 text-indigo-600" />
                {activeTab === 'enterprise' ? 'Conversar com Membro da Empresa' : 'Nova Conversa Particular'}
              </h3>
              <button
                onClick={() => setShowNewDirectModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search user input */}
            <div className="relative mb-3">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar usuário por nome ou email..."
                value={userSearchTerm}
                onChange={(e) => setUserSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* User results list */}
            <div className="max-h-60 overflow-y-auto space-y-1 divide-y divide-gray-100 dark:divide-gray-800">
              {activeTab === 'enterprise' ? (
                enterpriseMembers
                  .filter((m) => {
                    const term = userSearchTerm.toLowerCase();
                    const name = m.user?.name || '';
                    const email = m.user?.email || '';
                    return name.toLowerCase().includes(term) || email.toLowerCase().includes(term);
                  })
                  .map((m) => {
                    const memberName = m.user?.name || 'Membro';
                    const memberEmail = m.user?.email || '';
                    const memberAvatar = m.user?.avatar_url;

                    return (
                      <button
                        key={m.user_id}
                        onClick={() => handleStartDirectChat(m.user_id)}
                        disabled={startingDirectChat}
                        className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-left transition-colors"
                      >
                        {memberAvatar ? (
                          <img src={memberAvatar} alt={memberName} className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs">
                            {memberName.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <span className="block text-xs font-semibold text-gray-900 dark:text-white truncate">
                            {memberName}
                          </span>
                          <span className="block text-[11px] text-gray-400 truncate">{memberEmail}</span>
                        </div>
                      </button>
                    );
                  })
              ) : (
                availableUsers
                  .filter((u) => {
                    const term = userSearchTerm.toLowerCase();
                    return (
                      (u.name || '').toLowerCase().includes(term) ||
                      (u.email || '').toLowerCase().includes(term)
                    );
                  })
                  .map((u) => (
                    <button
                      key={u.id}
                      onClick={() => handleStartDirectChat(u.id)}
                      disabled={startingDirectChat}
                      className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-left transition-colors"
                    >
                      {u.avatar_url ? (
                        <img src={u.avatar_url} alt={u.name} className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs">
                          {(u.name || 'U').charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <span className="block text-xs font-semibold text-gray-900 dark:text-white truncate">
                          {u.name}
                        </span>
                        <span className="block text-[11px] text-gray-400 truncate">{u.email}</span>
                      </div>
                    </button>
                  ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── LIGHTBOX: Visualizador de Imagem ───────────────────────────────── */}
      {lightboxImg && (
        <div
          onClick={() => setLightboxImg(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img src={lightboxImg} alt="Visualização" className="max-w-full max-h-[85vh] rounded-xl object-contain" />
            <button
              onClick={() => setLightboxImg(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 p-2"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
