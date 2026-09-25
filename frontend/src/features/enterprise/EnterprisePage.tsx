import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Building2, Plus, Users, Settings, Loader2, ArrowRight,
  AlertTriangle, Briefcase, UserPlus, KeyRound, Mail,
  Edit2, Trash2, Shield, Check, Copy, MoreVertical,
  Search, ShieldAlert, Sparkles, LogOut
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { enterpriseService } from '../../services/enterpriseService';
import type {
  Enterprise,
  EnterpriseMember,
  EnterpriseCustomRole,
  EnterpriseInvitation
} from '../../types/enterprise';
import { ROLE_LABELS } from '../../types/enterprise';
import ModalConvidarMembro from '../../components/enterprise/ModalConvidarMembro';
import ModalEditarMembro from '../../components/enterprise/ModalEditarMembro';
import ModalCargo from '../../components/enterprise/ModalCargo';
import ModalEntrarEmpresa from '../../components/enterprise/ModalEntrarEmpresa';
import { cn } from '../../utils/cn';

const roleBadgeStyles: Record<string, string> = {
  admin: 'bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/60',
  manager: 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/60',
  member: 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700',
};

export default function EnterprisePage() {
  const { user } = useAuth();
  const { setEnterprise, setPersonal, currentEnterpriseId, isEnterprise, workspace } = useWorkspace();
  const [searchParams, setSearchParams] = useSearchParams();

  const [enterprises, setEnterprises] = useState<Enterprise[]>([]);
  const [members, setMembers] = useState<EnterpriseMember[]>([]);
  const [cargos, setCargos] = useState<EnterpriseCustomRole[]>([]);
  const [invitations, setInvitations] = useState<EnterpriseInvitation[]>([]);

  const [activeTab, setActiveTab] = useState<'members' | 'cargos' | 'invites' | 'organizations'>('members');
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showCargoModal, setShowCargoModal] = useState(false);
  const [cargoToEdit, setCargoToEdit] = useState<EnterpriseCustomRole | null>(null);
  const [memberToEdit, setMemberToEdit] = useState<EnterpriseMember | null>(null);

  // Create enterprise form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [successNotice, setSuccessNotice] = useState('');

  const activeEnterprise = useMemo(() => {
    return enterprises.find(e => e.id === currentEnterpriseId) || (workspace.type === 'enterprise' ? workspace.enterprise : enterprises[0]);
  }, [enterprises, currentEnterpriseId, workspace]);

  // Load enterprises
  const loadEnterprises = async () => {
    try {
      const data = await enterpriseService.list();
      setEnterprises(data);
      if (data.length > 0 && !currentEnterpriseId && !isEnterprise) {
        setEnterprise(data[0]);
      }
    } catch {
      setError('Falha ao carregar empresas');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEnterprises();
  }, []);

  // Handle URL join code (e.g. ?join=TF-123456)
  useEffect(() => {
    const joinCode = searchParams.get('join');
    if (joinCode) {
      enterpriseService.joinByCode(joinCode)
        .then((ent) => {
          setEnterprise(ent);
          setSuccessNotice(`Você entrou com sucesso na empresa ${ent.name}!`);
          searchParams.delete('join');
          setSearchParams(searchParams);
          loadEnterprises();
        })
        .catch((err) => {
          setError(err?.response?.data?.detail || 'Código de convite inválido');
        });
    }
  }, [searchParams]);

  // Load active enterprise data (members, cargos, invitations)
  const loadEnterpriseDetails = async () => {
    if (!activeEnterprise) return;
    try {
      const [membersData, cargosData, invitesData] = await Promise.all([
        enterpriseService.listMembers(activeEnterprise.id),
        enterpriseService.listRoles(activeEnterprise.id),
        enterpriseService.listInvitations(activeEnterprise.id).catch(() => []),
      ]);
      setMembers(membersData);
      setCargos(cargosData);
      setInvitations(invitesData);
    } catch {
      // not admin or error
    }
  };

  useEffect(() => {
    if (activeEnterprise) {
      loadEnterpriseDetails();
    }
  }, [activeEnterprise?.id]);

  const handleCreateEnterprise = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    setError('');

    try {
      const created = await enterpriseService.create({
        name: newName.trim(),
        description: newDesc.trim() || null,
      });
      setEnterprises((prev) => [created, ...prev]);
      setEnterprise(created);
      setShowCreateForm(false);
      setNewName('');
      setNewDesc('');
      setSuccessNotice(`Empresa "${created.name}" criada com sucesso!`);
      setTimeout(() => setSuccessNotice(''), 4000);
    } catch {
      setError('Falha ao criar empresa');
    } finally {
      setCreating(false);
    }
  };

  const handleRemoveMember = async (memberUserId: string, memberName: string) => {
    if (!activeEnterprise) return;
    if (!window.confirm(`Tem certeza que deseja remover ${memberName} da empresa?`)) return;

    try {
      await enterpriseService.removeMember(activeEnterprise.id, memberUserId);
      setMembers(prev => prev.filter(m => m.user_id !== memberUserId));
      setSuccessNotice('Membro removido da empresa');
      setTimeout(() => setSuccessNotice(''), 3000);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Erro ao remover membro');
      setTimeout(() => setError(''), 4000);
    }
  };

  const handleDeleteCargo = async (cargoId: string, cargoName: string) => {
    if (!activeEnterprise) return;
    if (!window.confirm(`Deseja excluir o cargo "${cargoName}"? Membros com este cargo continuarão na equipe sem cargo atribuído.`)) return;

    try {
      await enterpriseService.deleteRole(activeEnterprise.id, cargoId);
      setCargos(prev => prev.filter(c => c.id !== cargoId));
      loadEnterpriseDetails();
      setSuccessNotice('Cargo excluído com sucesso');
      setTimeout(() => setSuccessNotice(''), 3000);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Erro ao excluir cargo');
      setTimeout(() => setError(''), 4000);
    }
  };

  const handleCancelInvite = async (invitationId: string) => {
    if (!activeEnterprise) return;
    try {
      await enterpriseService.cancelInvitation(activeEnterprise.id, invitationId);
      setInvitations(prev => prev.filter(i => i.id !== invitationId));
      setSuccessNotice('Convite cancelado');
      setTimeout(() => setSuccessNotice(''), 3000);
    } catch (err: any) {
      setError('Erro ao cancelar convite');
    }
  };

  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return members;
    const q = searchQuery.toLowerCase();
    return members.filter(m =>
      m.user?.name?.toLowerCase().includes(q) ||
      m.user?.email?.toLowerCase().includes(q) ||
      m.custom_role?.name?.toLowerCase().includes(q) ||
      m.job_title?.toLowerCase().includes(q)
    );
  }, [members, searchQuery]);

  // Current user's role in active enterprise
  const currentUserRole = useMemo(() => {
    if (!user || !members.length) return 'member';
    const currentMember = members.find(m => m.user_id === user.id);
    return currentMember?.role || 'member';
  }, [user, members]);

  const canManage = currentUserRole === 'admin' || currentUserRole === 'manager';

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Building2 size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                {activeEnterprise ? activeEnterprise.name : 'Empresa'}
                {activeEnterprise && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    Organização
                  </span>
                )}
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Gerencie membros, atribua cargos personalizados e convide novos colaboradores
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center flex-wrap gap-2">
          <button
            onClick={() => setShowJoinModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-xl transition-all shadow-xs"
          >
            <KeyRound size={15} className="text-indigo-500" />
            Entrar com Código
          </button>

          {activeEnterprise && canManage && (
            <>
              <button
                onClick={() => { setCargoToEdit(null); setShowCargoModal(true); }}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 rounded-xl transition-all shadow-xs"
              >
                <Briefcase size={15} />
                Adicionar Cargo
              </button>

              <button
                onClick={() => setShowInviteModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-sm shadow-indigo-600/20"
              >
                <UserPlus size={15} />
                Convidar Pessoas
              </button>
            </>
          )}

          <button
            onClick={() => setShowCreateForm(prev => !prev)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
          >
            <Plus size={15} />
            Nova Empresa
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="flex items-center gap-2 p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl text-red-600 dark:text-red-300 text-xs">
          <AlertTriangle size={16} className="flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successNotice && (
        <div className="flex items-center gap-2 p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-xl text-emerald-600 dark:text-emerald-300 text-xs">
          <Check size={16} className="flex-shrink-0" />
          <span>{successNotice}</span>
        </div>
      )}

      {/* Inline Create Form */}
      {showCreateForm && (
        <form onSubmit={handleCreateEnterprise} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 space-y-4 animate-slide-up shadow-sm">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Building2 size={16} className="text-indigo-600" />
            Criar Nova Empresa
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              autoFocus
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nome da organização *"
              required
              className="px-3.5 py-2.5 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <input
              type="text"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Descrição (opcional)"
              className="px-3.5 py-2.5 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="px-4 py-2 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={creating || !newName.trim()}
              className="px-5 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors flex items-center gap-2 disabled:opacity-60"
            >
              {creating && <Loader2 size={14} className="animate-spin" />}
              Criar Empresa
            </button>
          </div>
        </form>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-px">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('members')}
            className={cn(
              'flex items-center gap-2 py-2.5 px-4 text-xs font-semibold border-b-2 transition-all',
              activeTab === 'members'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
            )}
          >
            <Users size={16} />
            Membros ({members.length})
          </button>

          <button
            onClick={() => setActiveTab('cargos')}
            className={cn(
              'flex items-center gap-2 py-2.5 px-4 text-xs font-semibold border-b-2 transition-all',
              activeTab === 'cargos'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
            )}
          >
            <Briefcase size={16} />
            Cargos da Empresa ({cargos.length})
          </button>

          <button
            onClick={() => setActiveTab('invites')}
            className={cn(
              'flex items-center gap-2 py-2.5 px-4 text-xs font-semibold border-b-2 transition-all',
              activeTab === 'invites'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
            )}
          >
            <Mail size={16} />
            Convites Pendentes {invitations.length > 0 && `(${invitations.length})`}
          </button>

          <button
            onClick={() => setActiveTab('organizations')}
            className={cn(
              'flex items-center gap-2 py-2.5 px-4 text-xs font-semibold border-b-2 transition-all',
              activeTab === 'organizations'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
            )}
          >
            <Building2 size={16} />
            Trocar Empresa ({enterprises.length})
          </button>
        </div>
      </div>

      {/* TAB 1: MEMBERS */}
      {activeTab === 'members' && (
        <div className="space-y-4">
          {/* Subheader & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search size={15} className="absolute left-3.5 top-2.5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar membro, email ou cargo..."
                className="w-full pl-9 pr-3.5 py-2 text-xs bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {canManage && (
              <button
                onClick={() => setShowInviteModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-semibold transition-colors border border-indigo-200 dark:border-indigo-800/80"
              >
                <UserPlus size={14} />
                Adicionar Membro à Equipe
              </button>
            )}
          </div>

          {/* Members Table / Cards */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={24} className="animate-spin text-indigo-600" />
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-8">
              <Users size={36} className="text-gray-300 dark:text-gray-700 mx-auto mb-3" />
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Nenhum membro encontrado</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                {searchQuery ? 'Tente buscar com outros termos' : 'Comece convidando seus colegas para a empresa'}
              </p>
              {canManage && !searchQuery && (
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold"
                >
                  <UserPlus size={14} /> Convidar Pessoas
                </button>
              )}
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-xs">
              <div className="divide-y divide-gray-100 dark:divide-gray-800/80">
                {filteredMembers.map((member) => {
                  const isCurrentUser = member.user_id === user?.id;
                  const isOwner = activeEnterprise?.owner_id === member.user_id;

                  return (
                    <div
                      key={member.id}
                      className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50/70 dark:hover:bg-gray-800/40 transition-colors"
                    >
                      {/* User Info */}
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
                            {isOwner && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
                                Proprietário
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                            {member.user?.email}
                          </p>
                        </div>
                      </div>

                      {/* Cargo & Access level */}
                      <div className="flex items-center flex-wrap gap-2.5 sm:justify-end">
                        {/* Custom Cargo badge */}
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
                          <span className="text-[11px] text-gray-400 italic">Sem cargo definido</span>
                        )}

                        {/* System Role Badge */}
                        <span className={cn('text-[11px] font-semibold px-2.5 py-0.5 rounded-full', roleBadgeStyles[member.role] || roleBadgeStyles.member)}>
                          {ROLE_LABELS[member.role] || member.role}
                        </span>

                        {/* Edit & Remove Actions */}
                        {canManage && (
                          <div className="flex items-center gap-1 ml-2">
                            <button
                              onClick={() => setMemberToEdit(member)}
                              title="Editar cargo e permissões"
                              className="p-1.5 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                            >
                              <Edit2 size={14} />
                            </button>

                            {!isOwner && !isCurrentUser && currentUserRole === 'admin' && (
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
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CARGOS */}
      {activeTab === 'cargos' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Briefcase size={17} className="text-indigo-600 dark:text-indigo-400" />
                Cargos e Funções da Organização
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Cargos definem a especialidade do colaborador e serão usados para regras de acesso e privacidade
              </p>
            </div>

            {canManage && (
              <button
                onClick={() => { setCargoToEdit(null); setShowCargoModal(true); }}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-xs"
              >
                <Plus size={14} /> Novo Cargo
              </button>
            )}
          </div>

          {cargos.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-8">
              <Briefcase size={36} className="text-gray-300 dark:text-gray-700 mx-auto mb-3" />
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Nenhum cargo cadastrado ainda</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Crie cargos para estruturar as funções da sua empresa</p>
              {canManage && (
                <button
                  onClick={() => { setCargoToEdit(null); setShowCargoModal(true); }}
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold"
                >
                  <Plus size={14} /> Criar Primeiro Cargo
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {cargos.map((cargo) => {
                const membersWithCargo = members.filter(m => m.custom_role_id === cargo.id);

                return (
                  <div
                    key={cargo.id}
                    className="p-5 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 flex flex-col justify-between hover:shadow-md transition-shadow relative group"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div
                          className="px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1.5"
                          style={{
                            backgroundColor: `${cargo.color}15`,
                            color: cargo.color,
                            borderColor: `${cargo.color}35`,
                            borderWidth: '1px'
                          }}
                        >
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cargo.color }} />
                          {cargo.name}
                        </div>

                        {canManage && (
                          <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => { setCargoToEdit(cargo); setShowCargoModal(true); }}
                              title="Editar cargo"
                              className="p-1 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              onClick={() => handleDeleteCargo(cargo.id, cargo.name)}
                              title="Excluir cargo"
                              className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-md transition-colors"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        )}
                      </div>

                      {cargo.description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-4">
                          {cargo.description}
                        </p>
                      )}
                    </div>

                    <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-[11px] text-gray-400 dark:text-gray-500">
                      <span className="flex items-center gap-1">
                        <Users size={13} />
                        {membersWithCargo.length} {membersWithCargo.length === 1 ? 'colaborador' : 'colaboradores'}
                      </span>
                      <span>Criado em {new Date(cargo.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: INVITATIONS */}
      {activeTab === 'invites' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Mail size={17} className="text-indigo-600 dark:text-indigo-400" />
                Convites Pendentes
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Pessoas convidadas por e-mail que ainda não finalizaram o cadastro ou entrada
              </p>
            </div>

            {canManage && (
              <button
                onClick={() => setShowInviteModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition-colors"
              >
                <UserPlus size={14} /> Novo Convite
              </button>
            )}
          </div>

          {invitations.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-8">
              <Mail size={36} className="text-gray-300 dark:text-gray-700 mx-auto mb-3" />
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Nenhum convite pendente</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Todos os colaboradores convidados já estão ativos na empresa</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden divide-y divide-gray-100 dark:divide-gray-800">
              {invitations.map((inv) => (
                <div key={inv.id} className="p-4 sm:px-6 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-amber-50 dark:bg-amber-950 flex items-center justify-center text-amber-600 dark:text-amber-400">
                      <Mail size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-900 dark:text-white">{inv.email}</p>
                      <p className="text-[11px] text-gray-400">
                        Convidado em {new Date(inv.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {inv.custom_role && (
                      <span
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: `${inv.custom_role.color}15`,
                          color: inv.custom_role.color,
                        }}
                      >
                        {inv.custom_role.name}
                      </span>
                    )}

                    <span className="text-[10px] uppercase font-semibold tracking-wide px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                      Pendente
                    </span>

                    {canManage && (
                      <button
                        onClick={() => handleCancelInvite(inv.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        title="Cancelar convite"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: ORGANIZATIONS */}
      {activeTab === 'organizations' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Building2 size={17} className="text-indigo-600 dark:text-indigo-400" />
              Minhas Empresas ({enterprises.length})
            </h2>
            <button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold"
            >
              <Plus size={14} /> Nova Empresa
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {enterprises.map((e) => {
              const isActive = activeEnterprise?.id === e.id;
              return (
                <div
                  key={e.id}
                  onClick={() => setEnterprise(e)}
                  className={cn(
                    'p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between gap-3',
                    isActive
                      ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 shadow-md'
                      : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-indigo-300 dark:hover:border-indigo-700'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                      isActive ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                    )}>
                      <Building2 size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-gray-900 dark:text-white text-sm truncate">{e.name}</p>
                        {isActive && (
                          <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900 px-2 py-0.5 rounded-full">
                            Ativa
                          </span>
                        )}
                      </div>
                      {e.description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{e.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-gray-400 pt-2 border-t border-gray-100 dark:border-gray-800">
                    <span>Criada em {new Date(e.created_at).toLocaleDateString()}</span>
                    {isActive ? (
                      <span className="text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1">
                        Selecionada <Check size={12} />
                      </span>
                    ) : (
                      <span className="text-gray-500 hover:text-indigo-600 font-medium flex items-center gap-1">
                        Alternar <ArrowRight size={12} />
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Switch to Personal workspace banner */}
      {isEnterprise && (
        <div className="p-4 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800/50 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-xs text-indigo-700 dark:text-indigo-300 font-medium">
            Você está operando no espaço de trabalho da empresa <strong>{activeEnterprise?.name}</strong>.
          </p>
          <button
            onClick={setPersonal}
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1.5 self-start sm:self-auto"
          >
            Voltar ao espaço Pessoal <ArrowRight size={14} />
          </button>
        </div>
      )}

      {/* Modals */}
      {showInviteModal && activeEnterprise && (
        <ModalConvidarMembro
          enterpriseId={activeEnterprise.id}
          enterpriseName={activeEnterprise.name}
          cargos={cargos}
          onClose={() => setShowInviteModal(false)}
          onSuccess={loadEnterpriseDetails}
        />
      )}

      {showCargoModal && activeEnterprise && (
        <ModalCargo
          enterpriseId={activeEnterprise.id}
          cargoToEdit={cargoToEdit}
          onClose={() => { setShowCargoModal(false); setCargoToEdit(null); }}
          onSuccess={loadEnterpriseDetails}
        />
      )}

      {memberToEdit && activeEnterprise && (
        <ModalEditarMembro
          enterpriseId={activeEnterprise.id}
          member={memberToEdit}
          cargos={cargos}
          onClose={() => setMemberToEdit(null)}
          onSuccess={loadEnterpriseDetails}
        />
      )}

      {showJoinModal && (
        <ModalEntrarEmpresa
          onClose={() => setShowJoinModal(false)}
          onSuccess={(ent) => {
            setEnterprise(ent);
            setSuccessNotice(`Você entrou na empresa ${ent.name}!`);
            loadEnterprises();
          }}
        />
      )}
    </div>
  );
}
