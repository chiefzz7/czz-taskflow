import { useState } from 'react';
import { AlertCircle, X, Upload, Loader2, PenLine, Trash2 } from 'lucide-react';
import type { SocialPost, EditRequest } from '../../types/social';
import { socialService } from '../../services/socialService';

interface ModalPrecisaEditarProps {
  post: SocialPost;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (updated: SocialPost) => void;
}

export default function ModalPrecisaEditar({ post, isOpen, onClose, onSaved }: ModalPrecisaEditarProps) {
  const [editNotes, setEditNotes] = useState(post.edit_notes ?? '');
  const [editExampleUrl, setEditExampleUrl] = useState(post.edit_example_url ?? '');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleUploadExample = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { url } = await socialService.uploadMedia(file);
      setEditExampleUrl(url);
    } catch {
      setError('Falha ao fazer upload do exemplo');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editNotes.trim()) return;
    setSaving(true);
    setError('');
    try {
      const data: EditRequest = {
        edit_notes: editNotes.trim(),
        edit_example_url: editExampleUrl.trim() || null,
      };
      const updated = await socialService.requestEdit(post.id, data);
      onSaved(updated);
      onClose();
    } catch {
      setError('Falha ao salvar solicita��o de edi��o');
    } finally {
      setSaving(false);
    }
  };

  const handleClearEdit = async () => {
    setSaving(true);
    try {
      const updated = await socialService.clearEditFlag(post.id);
      onSaved(updated);
      onClose();
    } catch {
      setError('Falha ao remover flag de edi��o');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl w-full max-w-lg"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <PenLine size={16} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">
                {post.needs_edit ? 'Editar Solicita��o' : 'Solicitar Edi��o'}
              </h2>
              <p className="text-[11px] text-gray-400 truncate max-w-[280px]">{post.title}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Existing edit flag indicator */}
          {post.needs_edit && post.edit_requested_by_name && (
            <div className="flex items-start gap-2.5 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl">
              <AlertCircle size={14} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-amber-700 dark:text-amber-300">
                <p className="font-semibold mb-0.5">Solicitado por {post.edit_requested_by_name}</p>
                <p className="text-amber-600 dark:text-amber-400">Esta arte j� est� marcada como "Precisa Editar". Voc� pode atualizar a solicita��o abaixo ou remover o flag.</p>
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1">
              O que precisa ser alterado? <span className="text-red-500">*</span>
            </label>
            <textarea
              autoFocus
              value={editNotes}
              onChange={e => setEditNotes(e.target.value)}
              placeholder="Descreva detalhadamente o que precisa ser modificado nesta arte/publica��o. Ex: Alterar a cor do texto para branco, ajustar o logo para a vers�o atualizada, etc."
              required
              rows={5}
              className="w-full px-3.5 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-xs text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
            />
            <p className="text-[10px] text-gray-400">{editNotes.length}/2000 caracteres</p>
          </div>

          {/* Example image */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
              Imagem de Refer�ncia <span className="text-gray-400 font-normal">(opcional)</span>
            </label>

            {editExampleUrl ? (
              <div className="relative rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 group">
                <img
                  src={editExampleUrl}
                  alt="Exemplo de refer�ncia"
                  className="w-full h-40 object-cover"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() => setEditExampleUrl('')}
                    className="flex items-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold transition-colors"
                  >
                    <Trash2 size={12} /> Remover
                  </button>
                </div>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-2 h-28 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl cursor-pointer hover:border-amber-400 dark:hover:border-amber-600 transition-colors bg-gray-50 dark:bg-gray-900/50">
                {uploading ? (
                  <Loader2 size={20} className="animate-spin text-amber-500" />
                ) : (
                  <>
                    <Upload size={20} className="text-gray-400" />
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Enviar imagem de refer�ncia
                    </span>
                    <span className="text-[10px] text-gray-400">JPG, PNG, GIF at� 10MB</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleUploadExample}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {error && (
            <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1.5">
              <AlertCircle size={12} /> {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-1 gap-3">
            {post.needs_edit && (
              <button
                type="button"
                onClick={handleClearEdit}
                disabled={saving}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-colors disabled:opacity-60"
              >
                <Trash2 size={13} /> Remover Flag
              </button>
            )}
            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving || !editNotes.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-xl transition-all disabled:opacity-60"
              >
                {saving && <Loader2 size={13} className="animate-spin" />}
                <PenLine size={13} />
                {post.needs_edit ? 'Atualizar Solicita��o' : 'Solicitar Edi��o'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
