import { useState } from 'react';
import { X, Shield, Briefcase, AlertCircle, Loader2, UserCheck } from 'lucide-react';
import { enterpriseService } from '../../services/enterpriseService';
import type { EnterpriseCustomRole, EnterpriseMember, EnterpriseRole, MemberStatus } from '../../types/enterprise';

interface ModalEditarMembroProps {
  enterpriseId: string;
  member: EnterpriseMember;
  cargos: EnterpriseCustomRole[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function ModalEditarMembro({
  enterpriseId,
  member,
  cargos,
  onClose,
  onSuccess,
}: ModalEditarMembroProps) {
  const [role, setRole] = useState<EnterpriseRole>(member.role);
  const [cargoId, setCargoId] = useState<string>(member.custom_role_id || '');
  const [jobTitle, setJobTitle] = useState(member.job_title || '');
  const [status, setStatus] = useState<MemberStatus>(member.status);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      await enterpriseService.updateMemberRole(enterpriseId, member.user_id, {
        role,
        custom_role_id: cargoId || null,
        job_title: jobTitle.trim() || null,
        status,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Erro ao atualizar membro');
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
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/60 flex items-center justify-center text-sm font-bold text-indigo-700 dark:text-indigo-300">
              {member.user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">
                Editar Membro
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {member.user?.name || member.user?.email || 'Colaborador'}
              </p>
            </div>
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
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1.5">
              <Briefcase size={14} className="text-indigo-500" />
              Cargo na Empresa
            </label>
            <select
              value={cargoId}
              onChange={(e) => setCargoId(e.target.value)}
              className="w-full px-3 py-2.5 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Sem cargo específico</option>
              {cargos.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
              O cargo identifica a função e especialidade da pessoa dentro da empresa.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1.5">
              <Shield size={14} className="text-amber-500" />
              Nível de Acesso (Permissões no Sistema)
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as EnterpriseRole)}
              className="w-full px-3 py-2.5 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="member">Membro (Visualiza e executa tarefas atribuídas)</option>
              <option value="manager">Gerente (Gerencia tarefas, equipes e cargos)</option>
              <option value="admin">Administrador (Controle total da organização)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Título Personalizado / Especialidade
            </label>
            <input
              type="text"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="ex: Coordenador de TI, Tech Lead Sênior"
              className="w-full px-3.5 py-2.5 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1.5">
              <UserCheck size={14} className="text-emerald-500" />
              Status do Membro
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as MemberStatus)}
              className="w-full px-3 py-2.5 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="active">Ativo (Acesso normal)</option>
              <option value="inactive">Inativo (Acesso pausado)</option>
            </select>
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
              disabled={submitting}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition-colors disabled:opacity-60 flex items-center gap-2"
            >
              {submitting && <Loader2 size={14} className="animate-spin" />}
              Salvar Alterações
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
