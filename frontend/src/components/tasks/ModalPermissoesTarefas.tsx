import { useState, useEffect, useCallback } from 'react';
import {
  X, Shield, Check, Loader2, Save, Users, Info, AlertTriangle
} from 'lucide-react';
import type { TaskSettings } from '../../types/task';
import type { EnterpriseCustomRole } from '../../types/enterprise';
import { taskService } from '../../services/taskService';
import { enterpriseService } from '../../services/enterpriseService';
import { cn } from '../../utils/cn';

interface ModalPermissoesTarefasProps {
  enterpriseId: string;
  onClose: () => void;
  onSaved?: () => void;
}

const PERMISSION_KEYS = [
  'can_create_task',
  'can_delegate_task',
  'can_move_to_in_progress',
  'can_move_to_review',
  'can_finalize_task',
] as const;

type PermissionKey = typeof PERMISSION_KEYS[number];

const PERMISSION_LABELS: Record<PermissionKey, string> = {
  can_create_task: 'Criar Tarefas',
  can_delegate_task: 'Delegar / Atribuir Tarefas',
  can_move_to_in_progress: 'Iniciar Tarefa (Em Andamento)',
  can_move_to_review: 'Mover para Revisão',
  can_finalize_task: 'Finalizar Tarefa (Concluída)',
};

const PERMISSION_DESCRIPTIONS: Record<PermissionKey, string> = {
  can_create_task: 'Quem pode criar tarefas no workspace da empresa. Deixe em "Qualquer Membro" para que toda a equipe possa cadastrar demandas.',
  can_delegate_task: 'Quem pode delegar e atribuir responsáveis às tarefas. Geralmente gestores e cargos superiores atribuem tarefas aos membros.',
  can_move_to_in_progress: 'Quem pode mover uma tarefa para "Em Andamento". Membros atribuídos à tarefa sempre podem iniciar seu próprio trabalho.',
  can_move_to_review: 'Quem pode enviar uma tarefa realizada para aprovação/revisão.',
  can_finalize_task: 'Quem tem autoridade para aprovar e marcar uma tarefa como "Concluída". Recomendado: apenas gestores e administradores.',
};

export default function ModalPermissoesTarefas({ enterpriseId, onClose, onSaved }: ModalPermissoesTarefasProps) {
  const [cargos, setCargos] = useState<EnterpriseCustomRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const [permissions, setPermissions] = useState<Record<PermissionKey, string[] | null>>({
    can_create_task: null,
    can_delegate_task: null,
    can_move_to_in_progress: null,
    can_move_to_review: null,
    can_finalize_task: [], // Por padrão: apenas gestores/admins!
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [settingsData, cargosData] = await Promise.all([
        taskService.getSettings(enterpriseId),
        enterpriseService.listRoles(enterpriseId).catch(() => []),
      ]);
      setCargos(cargosData);
      setPermissions({
        can_create_task: settingsData.can_create_task ?? null,
        can_delegate_task: settingsData.can_delegate_task ?? null,
        can_move_to_in_progress: settingsData.can_move_to_in_progress ?? null,
        can_move_to_review: settingsData.can_move_to_review ?? null,
        can_finalize_task: settingsData.can_finalize_task ?? [],
      });
    } catch {
      setError('Falha ao carregar configurações de tarefas.');
    } finally {
      setLoading(false);
    }
  }, [enterpriseId]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleRole = (key: PermissionKey, roleId: string) => {
    setPermissions(prev => {
      const current = prev[key];
      if (current === null) {
        return { ...prev, [key]: [roleId] };
      }
      if (current.includes(roleId)) {
        const next = current.filter(id => id !== roleId);
        return { ...prev, [key]: next };
      } else {
        return { ...prev, [key]: [...current, roleId] };
      }
    });
  };

  const setAllAllowed = (key: PermissionKey) => {
    setPermissions(prev => ({ ...prev, [key]: null }));
  };

  const setNoneAllowed = (key: PermissionKey) => {
    setPermissions(prev => ({ ...prev, [key]: [] }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await taskService.updateSettings(enterpriseId, permissions);
      setSaved(true);
      if (onSaved) onSaved();
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError('Falha ao salvar permissões. Verifique se você é gestor ou administrador.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 w-full max-w-2xl my-8 animate-slide-up flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Shield size={19} />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                Permissões do Kanban de Tarefas
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Defina quais cargos podem delegar, iniciar, revisar e aprovar tarefas
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-2 text-xs text-red-700 dark:text-red-300">
              <AlertTriangle size={15} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 size={24} className="animate-spin text-indigo-600" />
              <p className="text-xs text-gray-500 dark:text-gray-400">Carregando permissões...</p>
            </div>
          ) : (
            <>
              {cargos.length === 0 && (
                <div className="p-4 flex items-center gap-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-xl text-xs text-amber-700 dark:text-amber-300">
                  <Info size={16} className="text-amber-600 dark:text-amber-400 flex-shrink-0" />
                  <p>
                    Nenhum cargo personalizado foi criado ainda. Você pode cadastrar cargos na aba "Cargos" da Empresa para controle granular.
                    Por enquanto, você pode restringir ações a apenas Gestores/Admins ou liberar para Qualquer Membro.
                  </p>
                </div>
              )}

              <div className="space-y-4">
                {PERMISSION_KEYS.map((key) => {
                  const currentRoles = permissions[key];
                  const isAll = currentRoles === null;
                  const isNone = Array.isArray(currentRoles) && currentRoles.length === 0;

                  return (
                    <div
                      key={key}
                      className="p-4 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60 rounded-xl space-y-3"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-0.5 flex-1">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">
                            {PERMISSION_LABELS[key]}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                            {PERMISSION_DESCRIPTIONS[key]}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className={cn(
                            'text-[11px] font-semibold px-2.5 py-0.5 rounded-full border',
                            isAll
                              ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                              : isNone
                                ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                                : 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                          )}>
                            {isAll ? 'Qualquer Membro' : isNone ? 'Apenas Gestores/Admin' : `${currentRoles!.length} cargo(s) selecionado(s)`}
                          </span>
                        </div>
                      </div>

                      {/* Botões de Ação Rápida */}
                      <div className="flex items-center gap-2 pt-1 border-t border-gray-100 dark:border-gray-700/40">
                        <button
                          type="button"
                          onClick={() => setAllAllowed(key)}
                          className={cn(
                            'px-2.5 py-1 text-xs rounded-lg font-medium transition-colors',
                            isAll
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600'
                          )}
                        >
                          Qualquer Membro
                        </button>
                        <button
                          type="button"
                          onClick={() => setNoneAllowed(key)}
                          className={cn(
                            'px-2.5 py-1 text-xs rounded-lg font-medium transition-colors',
                            isNone
                              ? 'bg-amber-600 text-white shadow-xs'
                              : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600'
                          )}
                        >
                          Apenas Gestores
                        </button>
                      </div>

                      {/* Pills de Cargos */}
                      {cargos.length > 0 && (
                        <div className="pt-1.5 flex flex-wrap gap-1.5">
                          {cargos.map((cargo) => {
                            const isSelected = !isAll && Array.isArray(currentRoles) && currentRoles.includes(cargo.id);
                            return (
                              <button
                                key={cargo.id}
                                type="button"
                                onClick={() => toggleRole(key, cargo.id)}
                                className={cn(
                                  'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all',
                                  isSelected
                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                    : 'bg-white dark:bg-gray-700/60 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-indigo-300'
                                )}
                              >
                                <span
                                  className="w-2 h-2 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: cargo.color || '#6366f1' }}
                                />
                                {cargo.name}
                                {isSelected && <Check size={12} className="ml-0.5" />}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Explicação Geral */}
              <div className="flex gap-3 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 rounded-xl text-xs text-blue-700 dark:text-blue-300">
                <Info size={15} className="flex-shrink-0 mt-0.5 text-blue-500" />
                <div className="space-y-1">
                  <p className="font-semibold">Regras essenciais do fluxo de trabalho:</p>
                  <ul className="space-y-1 text-blue-600 dark:text-blue-400">
                    <li>• <strong>Administradores e Gestores</strong> têm permissão irrestrita para delegar, mover e finalizar tarefas.</li>
                    <li>• <strong>Colaboradores atribuídos</strong> sempre podem iniciar suas próprias tarefas e enviá-las para revisão.</li>
                    <li>• <strong>Finalizar Tarefa</strong> é a etapa de aprovação definitiva, garantindo que o gestor valide a entrega.</li>
                  </ul>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between flex-shrink-0 bg-gray-50/50 dark:bg-gray-900/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
          >
            Fechar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition-all shadow-sm shadow-indigo-500/20"
          >
            {saving ? (
              <Loader2 size={13} className="animate-spin" />
            ) : saved ? (
              <Check size={13} />
            ) : (
              <Save size={13} />
            )}
            {saved ? 'Salvo com sucesso!' : saving ? 'Salvando...' : 'Salvar Permissões'}
          </button>
        </div>
      </div>
    </div>
  );
}
