import { useEffect, useState, useMemo } from 'react';
import {
  Users, Loader2, Shield, User, Briefcase, UserPlus,
  Search, Edit2, Trash2, Check, AlertCircle
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { enterpriseService } from '../../services/enterpriseService';
import type { EnterpriseMember, EnterpriseCustomRole } from '../../types/enterprise';
import { ROLE_LABELS } from '../../types/enterprise';
import ModalConvidarMembro from '../../components/enterprise/ModalConvidarMembro';
import ModalEditarMembro from '../../components/enterprise/ModalEditarMembro';
import { cn } from '../../utils/cn';

const roleBadgeStyles: Record<string, string> = {
  admin: 'bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/60',
  manager: 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/60',
  member: 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700',
};

export default function MembersPage() {
  const { user } = useAuth();
  const { isPersonal, currentEnterpriseId, workspace } = useWorkspace();
  const [members, setMembers] = useState<EnterpriseMember[]>([]);
  const [cargos, setCargos] = useState<EnterpriseCustomRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [memberToEdit, setMemberToEdit] = useState<EnterpriseMember | null>(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const enterpriseName = workspace.type === 'enterprise' ? workspace.enterprise.name : 'Empresa';

  const loadData = async () => {
    if (isPersonal || !currentEnterpriseId) {
      setIsLoading(false);
      return;
    }
    try {
      const [membersData, cargosData] = await Promise.all([
        enterpriseService.listMembers(currentEnterpriseId),
        enterpriseService.listRoles(currentEnterpriseId),
      ]);
      setMembers(membersData);
      setCargos(cargosData);
    } catch {
      setError('Falha ao carregar membros');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [isPersonal, currentEnterpriseId]);

  const currentUserMember = useMemo(() => {
    return members.find(m => m.user_id === user?.id);
  }, [members, user]);

  const canManage = currentUserMember?.role === 'admin' || currentUserMember?.role === 'manager';

  const handleRemoveMember = async (targetUserId: string, targetName: string) => {
    if (!currentEnterpriseId) return;
    if (!window.confirm(`Deseja remover ${targetName} da empresa?`)) return;

    try {
      await enterpriseService.removeMember(currentEnterpriseId, targetUserId);
      setMembers(prev => prev.filter(m => m.user_id !== targetUserId));
      setNotice('Membro removido com sucesso');
      setTimeout(() => setNotice(''), 3000);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Erro ao remover membro');
      setTimeout(() => setError(''), 4000);
    }
  };

  const filteredMembers = useMemo(() => {
    if (!search.trim()) return members;
    const q = search.toLowerCase();
    return members.filter(m =>
      m.user?.name?.toLowerCase().includes(q) ||
      m.user?.email?.toLowerCase().includes(q) ||
      m.custom_role?.name?.toLowerCase().includes(q) ||
      m.job_title?.toLowerCase().includes(q)
    );
  }, [members, search]);

  if (isPersonal || !currentEnterpriseId) {
    return (
      <div className="p-6 md:p-8 flex flex-col items-center justify-center min-h-[400px] text-center">
        <Users size={48} className="text-gray-300 dark:text-gray-700 mb-4" />
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Membros da Equipe</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">
          Alterne para um espaço de trabalho de empresa para visualizar e gerenciar a equipe.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
            <Users size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              Membros da Equipe
              <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                {members.length} {members.length === 1 ? 'colaborador' : 'colaboradores'}
              </span>
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Gerencie colaboradores, cargos e níveis de acesso em {enterpriseName}
            </p>
          </div>
        </div>

        {canManage && (
          <button
            onClick={() => setShowInviteModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-xs self-start sm:self-auto"
          >
            <UserPlus size={15} />
            Convidar Membro
          </button>
        )}
      </div>

      {notice && (
        <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-xl text-emerald-600 dark:text-emerald-300 text-xs">
          <Check size={15} />
          <span>{notice}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl text-red-600 dark:text-red-300 text-xs">
          <AlertCircle size={15} />
          <span>{error}</span>
        </div>
      )}

      {/* Search Input */}
      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3.5 top-2.5 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome, e-mail ou cargo..."
          className="w-full pl-9 pr-3.5 py-2 text-xs bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Members list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-indigo-600" />
        </div>
      ) : filteredMembers.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-8">
          <Users size={36} className="text-gray-300 dark:text-gray-700 mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Nenhum membro encontrado</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            {search ? 'Tente outros filtros de busca' : 'Convide colaboradores para fazerem parte da sua equipe'}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden divide-y divide-gray-100 dark:divide-gray-800">
          {filteredMembers.map((member) => {
            const isCurrentUser = member.user_id === user?.id;

            return (
              <div
                key={member.id}
                className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50/70 dark:hover:bg-gray-800/40 transition-colors"
              >
                {/* Colaborador info */}
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-indigo-200 dark:from-indigo-950 dark:to-indigo-900 flex items-center justify-center flex-shrink-0 text-sm font-bold text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/50">
                    {member.user?.name?.[0]?.toUpperCase() || member.user?.email?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                        {member.user?.name || member.user?.email}
                      </span>
                      {isCurrentUser && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                          Você
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{member.user?.email}</p>
                  </div>
                </div>

                {/* Cargo & Badges */}
                <div className="flex items-center flex-wrap gap-2.5 sm:justify-end">
                  {member.custom_role ? (
                    <div
                      className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold shadow-xs"
                      style={{
                        backgroundColor: `${member.custom_role.color}15`,
                        borderColor: `${member.custom_role.color}40`,
                        borderWidth: '1px',
                        color: member.custom_role.color,
                      }}
                    >
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: member.custom_role.color }}
                      />
                      <span>{member.custom_role.name}</span>
                    </div>
                  ) : member.job_title ? (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                      <Briefcase size={12} className="text-gray-400" />
                      <span>{member.job_title}</span>
                    </div>
                  ) : (
                    <span className="text-[11px] text-gray-400 italic">Sem cargo</span>
                  )}

                  <span className={cn('text-[11px] font-semibold px-2.5 py-0.5 rounded-full', roleBadgeStyles[member.role] || roleBadgeStyles.member)}>
                    {ROLE_LABELS[member.role] || member.role}
                  </span>

                  {canManage && (
                    <div className="flex items-center gap-1 ml-2">
                      <button
                        onClick={() => setMemberToEdit(member)}
                        title="Editar cargo e papel"
                        className="p-1.5 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                      >
                        <Edit2 size={14} />
                      </button>

                      {!isCurrentUser && currentUserMember?.role === 'admin' && (
                        <button
                          onClick={() => handleRemoveMember(member.user_id, member.user?.name || member.user_id)}
                          title="Remover da empresa"
                          className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {showInviteModal && currentEnterpriseId && (
        <ModalConvidarMembro
          enterpriseId={currentEnterpriseId}
          enterpriseName={enterpriseName}
          cargos={cargos}
          onClose={() => setShowInviteModal(false)}
          onSuccess={loadData}
        />
      )}

      {memberToEdit && currentEnterpriseId && (
        <ModalEditarMembro
          enterpriseId={currentEnterpriseId}
          member={memberToEdit}
          cargos={cargos}
          onClose={() => setMemberToEdit(null)}
          onSuccess={loadData}
        />
      )}
    </div>
  );
}
