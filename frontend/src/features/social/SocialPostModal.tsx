import React, { useState, useEffect, useRef } from 'react';
import {
  X, Upload, Image as ImageIcon, Calendar, Clock,
  Users, Trash2, Loader2, Sparkles, Check, AlertCircle,
} from 'lucide-react';
import type {
  SocialPost,
  SocialPostCreate,
  SocialPostUpdate,
  SocialPlatform,
  SocialPostStatus,
  SocialMediaType,
} from '../../types/social';
import {
  SOCIAL_STATUS_LABELS,
  PLATFORM_INFO,
  MEDIA_TYPE_LABELS,
} from '../../types/social';
import { socialService } from '../../services/socialService';
import { enterpriseService } from '../../services/enterpriseService';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { useAuth } from '../../contexts/AuthContext';
import type { EnterpriseMember } from '../../types/enterprise';

interface SocialPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  postToEdit?: SocialPost | null;
  initialStatus?: SocialPostStatus;
}

export default function SocialPostModal({
  isOpen,
  onClose,
  onSaved,
  postToEdit,
  initialStatus = 'ideia',
}: SocialPostModalProps) {
  const { isPersonal, currentEnterpriseId } = useWorkspace();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [platform, setPlatform] = useState<SocialPlatform>('instagram');
  const [status, setStatus] = useState<SocialPostStatus>(initialStatus);
  const [mediaType, setMediaType] = useState<SocialMediaType>('image');
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  
  // Data e hora de agendamento
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('10:00');

  // Membro responsável
  const [responsibleId, setResponsibleId] = useState<string>('');
  const [members, setMembers] = useState<EnterpriseMember[]>([]);

  // Estados de upload e submissão
  const [uploading, setUploading] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    if (postToEdit) {
      setTitle(postToEdit.title);
      setCaption(postToEdit.caption || '');
      setPlatform(postToEdit.platform);
      setStatus(postToEdit.status);
      setMediaType(postToEdit.media_type || 'image');
      setMediaUrl(postToEdit.media_url || null);
      setResponsibleId(postToEdit.responsible_id || '');

      if (postToEdit.scheduled_at) {
        const d = new Date(postToEdit.scheduled_at);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const hh = String(d.getHours()).padStart(2, '0');
        const min = String(d.getMinutes()).padStart(2, '0');
        setScheduledDate(`${yyyy}-${mm}-${dd}`);
        setScheduledTime(`${hh}:${min}`);
      } else {
        setScheduledDate('');
        setScheduledTime('10:00');
      }
    } else {
      setTitle('');
      setCaption('');
      setPlatform('instagram');
      setStatus(initialStatus);
      setMediaType('image');
      setMediaUrl(null);
      setResponsibleId('');
      // Data padrão: amanhã às 10:00
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const yyyy = tomorrow.getFullYear();
      const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
      const dd = String(tomorrow.getDate()).padStart(2, '0');
      setScheduledDate(`${yyyy}-${mm}-${dd}`);
      setScheduledTime('10:00');
    }
    setErro(null);

    // Carregar membros se estiver no modo enterprise
    if (!isPersonal && currentEnterpriseId) {
      enterpriseService
        .listMembers(currentEnterpriseId)
        .then((data) => setMembers(data))
        .catch(() => setMembers([]));
    }
  }, [isOpen, postToEdit, initialStatus, isPersonal, currentEnterpriseId]);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setErro(null);
    try {
      const res = await socialService.uploadMedia(file);
      // Se a URL for relativa (/uploads/...), apontamos pro backend
      const fullUrl = res.url.startsWith('http') ? res.url : `http://localhost:8000${res.url}`;
      setMediaUrl(fullUrl);
    } catch {
      // Fallback para preview local caso o backend de storage dê erro de CORS/rede
      const localUrl = URL.createObjectURL(file);
      setMediaUrl(localUrl);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErro('Informe o título da arte / publicação');
      return;
    }

    setSalvando(true);
    setErro(null);

    let scheduledAtIso: string | null = null;
    if (scheduledDate) {
      try {
        const [y, m, d] = scheduledDate.split('-').map(Number);
        const [hh, mm] = scheduledTime.split(':').map(Number);
        const dateObj = new Date(y, m - 1, d, hh || 0, mm || 0);
        scheduledAtIso = dateObj.toISOString();
      } catch {
        scheduledAtIso = null;
      }
    }

    const selectedMember = members.find((m) => m.user_id === responsibleId);
    const responsibleName = responsibleId ? selectedMember?.user?.name : null;

    try {
      if (postToEdit) {
        const payload: SocialPostUpdate = {
          title: title.trim(),
          caption: caption.trim() || null,
          platform,
          status,
          media_type: mediaType,
          media_url: mediaUrl,
          scheduled_at: scheduledAtIso,
          responsible_id: responsibleId || null,
          responsible_name: responsibleName || null,
        };
        await socialService.update(postToEdit.id, payload);
      } else {
        const payload: SocialPostCreate = {
          title: title.trim(),
          caption: caption.trim() || undefined,
          platform,
          status,
          media_type: mediaType,
          media_url: mediaUrl || undefined,
          scheduled_at: scheduledAtIso,
          responsible_id: responsibleId || undefined,
          responsible_name: responsibleName || undefined,
          workspace: isPersonal ? 'personal' : 'enterprise',
          enterprise_id: isPersonal ? undefined : currentEnterpriseId || undefined,
        };
        await socialService.create(payload);
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { detail?: string } } };
      setErro(errorObj.response?.data?.detail || 'Erro ao salvar a publicação.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/10 dark:bg-indigo-400/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Sparkles size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {postToEdit ? 'Editar Arte / Publicação' : 'Nova Arte / Publicação'}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Gerencie a produção visual e o agendamento nas redes
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {erro && (
          <div className="mx-6 mt-4 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
            <AlertCircle size={16} className="flex-shrink-0" />
            <span>{erro}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Título */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
              Título / Tema da Arte <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Lançamento do novo produto, Dica da Semana..."
              className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Anexo da Arte (Upload & Preview) */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
              Anexo da Arte / Imagem
            </label>

            {mediaUrl ? (
              <div className="relative group rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-950 flex items-center justify-center max-h-60">
                <img
                  src={mediaUrl}
                  alt="Prévia da arte"
                  className="w-full h-52 object-cover object-center"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 bg-white text-gray-900 rounded-lg text-xs font-semibold shadow hover:bg-gray-100 flex items-center gap-1.5"
                  >
                    <Upload size={14} /> Trocar Imagem
                  </button>
                  <button
                    type="button"
                    onClick={() => setMediaUrl(null)}
                    className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-semibold shadow hover:bg-red-700 flex items-center gap-1.5"
                  >
                    <Trash2 size={14} /> Remover
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-indigo-500 dark:hover:border-indigo-400 rounded-xl p-6 text-center cursor-pointer transition-colors bg-gray-50/50 dark:bg-gray-800/30 group"
              >
                {uploading ? (
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Loader2 size={24} className="animate-spin text-indigo-600" />
                    <p className="text-xs text-gray-500">Enviando imagem...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <ImageIcon size={20} />
                    </div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Clique para anexar a arte ou arraste o arquivo aqui
                    </p>
                    <p className="text-xs text-gray-400">
                      PNG, JPG, WEBP, MP4 (Feed, Story, Reels ou Carrossel)
                    </p>
                  </div>
                )}
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>

          {/* Seleção de Rede Social */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
              Rede Social de Destino
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {(Object.keys(PLATFORM_INFO) as SocialPlatform[]).map((plt) => {
                const info = PLATFORM_INFO[plt];
                const isSelected = platform === plt;
                return (
                  <button
                    key={plt}
                    type="button"
                    onClick={() => setPlatform(plt)}
                    className={`flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 ring-2 ring-indigo-500/20'
                        : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <span className={`w-2.5 h-2.5 rounded-full ${info.bg}`} />
                    {info.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Formato e Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                Formato da Mídia
              </label>
              <select
                value={mediaType}
                onChange={(e) => setMediaType(e.target.value as SocialMediaType)}
                className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {(Object.keys(MEDIA_TYPE_LABELS) as SocialMediaType[]).map((mt) => (
                  <option key={mt} value={mt}>
                    {MEDIA_TYPE_LABELS[mt]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                Status no Workflow (Kanban)
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as SocialPostStatus)}
                className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {(Object.keys(SOCIAL_STATUS_LABELS) as SocialPostStatus[]).map((st) => (
                  <option key={st} value={st}>
                    {SOCIAL_STATUS_LABELS[st]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Agendamento: Data e Hora */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
              Agendamento de Postagem (Dia e Horário)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="relative">
                <Calendar
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="relative">
                <Clock
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Membro Responsável pela Arte/Post */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
              Membro Responsável
            </label>
            <div className="relative">
              <Users
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <select
                value={responsibleId}
                onChange={(e) => setResponsibleId(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Equipe Toda / Qualquer Membro</option>
                {isPersonal ? (
                  <option value={user?.id || ''}>{user?.name} (Você)</option>
                ) : (
                  members.map((m) => (
                    <option key={m.user_id} value={m.user_id}>
                      {m.user?.name || m.user_id} ({m.role})
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          {/* Legenda e Hashtags */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
              Legenda da Publicação & Hashtags
            </label>
            <textarea
              rows={3}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Escreva a copy da postagem, emojis e hashtags que devem acompanhar a arte..."
              className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          {/* Footer Ações */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando || uploading}
              className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {salvando ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Check size={16} />
                  {postToEdit ? 'Salvar Alterações' : 'Criar Publicação'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
