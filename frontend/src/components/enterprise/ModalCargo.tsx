import { useState } from 'react';
import { X, Briefcase, AlertCircle, Loader2, Check } from 'lucide-react';
import { enterpriseService } from '../../services/enterpriseService';
import type { EnterpriseCustomRole } from '../../types/enterprise';
import { cn } from '../../utils/cn';

interface ModalCargoProps {
  enterpriseId: string;
  cargoToEdit?: EnterpriseCustomRole | null;
  onClose: () => void;
  onSuccess: () => void;
}

const PRESET_COLORS = [
  { hex: '#6366f1', label: 'Índigo' },
  { hex: '#8b5cf6', label: 'Roxo' },
  { hex: '#ec4899', label: 'Rosa' },
  { hex: '#ef4444', label: 'Vermelho' },
  { hex: '#f97316', label: 'Laranja' },
  { hex: '#f59e0b', label: 'Âmbar' },
  { hex: '#10b981', label: 'Esmeralda' },
  { hex: '#06b6d4', label: 'Ciano' },
  { hex: '#3b82f6', label: 'Azul' },
  { hex: '#64748b', label: 'Cinza' },
];

export default function ModalCargo({
  enterpriseId,
  cargoToEdit,
  onClose,
  onSuccess,
}: ModalCargoProps) {
  const [name, setName] = useState(cargoToEdit?.name || '');
  const [description, setDescription] = useState(cargoToEdit?.description || '');
  const [color, setColor] = useState(cargoToEdit?.color || PRESET_COLORS[0].hex);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const isEditing = !!cargoToEdit;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    setError('');

    try {
      if (isEditing) {
        await enterpriseService.updateRole(enterpriseId, cargoToEdit.id, {
          name: name.trim(),
          description: description.trim() || null,
          color,
        });
      } else {
        await enterpriseService.createRole(enterpriseId, {
          name: name.trim(),
          description: description.trim() || null,
          color,
        });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Erro ao salvar cargo');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 w-full max-w-md my-8 animate-slide-up flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-gray-800">
          <div>
            <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Briefcase size={18} className="text-indigo-600 dark:text-indigo-400" />
              {isEditing ? 'Editar Cargo' : 'Novo Cargo da Empresa'}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Defina as atribuições e identidade visual deste cargo
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl text-red-600 dark:text-red-300 text-xs">
              <AlertCircle size={15} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Nome do Cargo *
            </label>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ex: Desenvolvedor Frontend, Gerente Financeiro..."
              required
              className="w-full px-3.5 py-2.5 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Descrição das Responsabilidades
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva brevemente o escopo e as funções..."
              rows={2}
              className="w-full px-3.5 py-2 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              Cor do Badge do Cargo
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {PRESET_COLORS.map((preset) => (
                <button
                  key={preset.hex}
                  type="button"
                  onClick={() => setColor(preset.hex)}
                  title={preset.label}
                  className={cn(
                    'w-7 h-7 rounded-full flex items-center justify-center transition-transform hover:scale-110 shadow-xs',
                    color === preset.hex && 'ring-2 ring-offset-2 ring-indigo-500'
                  )}
                  style={{ backgroundColor: preset.hex }}
                >
                  {color === preset.hex && <Check size={14} className="text-white drop-shadow-xs" />}
                </button>
              ))}
            </div>

            {/* Preview */}
            <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <span className="text-xs text-gray-500 dark:text-gray-400">Prévia visual:</span>
              <span
                className="text-xs font-semibold px-2.5 py-1 rounded-full text-white shadow-xs"
                style={{ backgroundColor: color }}
              >
                {name.trim() || 'Nome do Cargo'}
              </span>
            </div>
          </div>

          <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 rounded-xl">
            <p className="text-[11px] text-indigo-700 dark:text-indigo-300 leading-relaxed">
              💡 <strong>Privilégios e Restrições:</strong> Este cargo estará disponível para ser atribuído a qualquer colaborador. Futuramente, você poderá configurar regras específicas de visibilidade e ações para cada cargo.
            </p>
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-gray-100 dark:border-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting || !name.trim()}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition-colors disabled:opacity-60 flex items-center gap-2"
            >
              {submitting && <Loader2 size={14} className="animate-spin" />}
              {isEditing ? 'Atualizar Cargo' : 'Criar Cargo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
