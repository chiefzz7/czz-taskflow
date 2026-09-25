import { useState } from 'react';
import { X, KeyRound, AlertCircle, Loader2, Check } from 'lucide-react';
import { enterpriseService } from '../../services/enterpriseService';
import type { Enterprise } from '../../types/enterprise';

interface ModalEntrarEmpresaProps {
  onClose: () => void;
  onSuccess: (enterprise: Enterprise) => void;
}

export default function ModalEntrarEmpresa({ onClose, onSuccess }: ModalEntrarEmpresaProps) {
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setSubmitting(true);
    setError('');

    try {
      const enterprise = await enterpriseService.joinByCode(code.trim().toUpperCase());
      onSuccess(enterprise);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Código de convite inválido ou expirado');
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
              <KeyRound size={18} className="text-indigo-600 dark:text-indigo-400" />
              Entrar em uma Empresa
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Digite o código de convite compartilhado com você
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
              Código de Convite *
            </label>
            <input
              autoFocus
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="ex: TF-A1B2C3"
              required
              className="w-full px-3.5 py-3 text-sm font-mono uppercase tracking-wider text-center bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
            />
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1.5 text-center">
              Você pode obter este código com o administrador ou gerente da empresa.
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
              disabled={submitting || !code.trim()}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition-colors disabled:opacity-60 flex items-center gap-2"
            >
              {submitting && <Loader2 size={14} className="animate-spin" />}
              Entrar na Empresa
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
