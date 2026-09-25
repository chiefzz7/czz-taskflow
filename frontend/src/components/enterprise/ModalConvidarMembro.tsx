import { useState, useEffect } from 'react';
import {
  X, Copy, Check, Mail, UserPlus, Link2, RefreshCw,
  Shield, Briefcase, AlertCircle, Loader2, Users
} from 'lucide-react';
import { enterpriseService } from '../../services/enterpriseService';
import type { EnterpriseCustomRole, EnterpriseRole, InviteCodeResponse } from '../../types/enterprise';
import type { User } from '../../types/user';
import { ROLE_LABELS } from '../../types/enterprise';
import { cn } from '../../utils/cn';

interface ModalConvidarMembroProps {
  enterpriseId: string;
  enterpriseName: string;
  cargos: EnterpriseCustomRole[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function ModalConvidarMembro({
  enterpriseId,
  enterpriseName,
  cargos,
  onClose,
  onSuccess,
}: ModalConvidarMembroProps) {
  const [tab, setTab] = useState<'link' | 'email' | 'user'>('link');
  const [inviteData, setInviteData] = useState<InviteCodeResponse | null>(null);
  const [loadingCode, setLoadingCode] = useState(false);
  const [copied, setCopied] = useState(false);

  // Email form
  const [email, setEmail] = useState('');
  const [cargoId, setCargoId] = useState<string>(cargos[0]?.id || '');
  const [role, setRole] = useState<EnterpriseRole>('member');
  const [jobTitle, setJobTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // User list form
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [searchUser, setSearchUser] = useState('');

  useEffect(() => {
    // Load invite code
    setLoadingCode(true);
    enterpriseService.getInviteCode(enterpriseId)
      .then(setInviteData)
      .catch(() => {})
      .finally(() => setLoadingCode(false));
  }, [enterpriseId]);

  useEffect(() => {
    if (tab === 'user' && allUsers.length === 0) {
      setLoadingUsers(true);
      enterpriseService.listAllUsers()
        .then(setAllUsers)
        .catch(() => {})
        .finally(() => setLoadingUsers(false));
    }
  }, [tab, allUsers.length]);

  const handleCopy = () => {
    if (!inviteData) return;
    const fullLink = `${window.location.origin}${inviteData.invite_link}`;
    navigator.clipboard.writeText(fullLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleCopyCode = () => {
    if (!inviteData) return;
    navigator.clipboard.writeText(inviteData.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleRegenerateCode = async () => {
    setLoadingCode(true);
    try {
      const res = await enterpriseService.regenerateInviteCode(enterpriseId);
      setInviteData(res);
      setSuccessMsg('Código de convite regenerado!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch {
      setError('Erro ao regenerar código');
    } finally {
      setLoadingCode(false);
    }
  };

  const handleInviteEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    setError('');
    setSuccessMsg('');

    try {
      await enterpriseService.addMember(enterpriseId, {
        email: email.trim().toLowerCase(),
        role,
        custom_role_id: cargoId || null,
        job_title: jobTitle.trim() || null,
      });

      setSuccessMsg('Convite enviado com sucesso!');
      setEmail('');
      setJobTitle('');
      onSuccess();
      setTimeout(() => {
        setSuccessMsg('');
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Falha ao convidar por e-mail');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) return;
    setSubmitting(true);
    setError('');
    setSuccessMsg('');

    try {
      await enterpriseService.addMember(enterpriseId, {
        user_id: selectedUserId,
        role,
        custom_role_id: cargoId || null,
        job_title: jobTitle.trim() || null,
      });

      setSuccessMsg('Membro adicionado com sucesso!');
      setSelectedUserId('');
      setJobTitle('');
      onSuccess();
      setTimeout(() => {
        setSuccessMsg('');
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Falha ao adicionar membro');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredUsers = allUsers.filter(u =>
    u.name.toLowerCase().includes(searchUser.toLowerCase()) ||
    u.email.toLowerCase().includes(searchUser.toLowerCase())
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 w-full max-w-lg my-8 animate-slide-up flex flex-col overflow-hidden max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-gray-800">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <UserPlus size={20} className="text-indigo-600 dark:text-indigo-400" />
              Convidar para {enterpriseName}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Adicione pessoas à sua equipe e defina seus cargos
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-800 px-6 bg-gray-50/50 dark:bg-gray-900/50">
          <button
            onClick={() => { setTab('link'); setError(''); setSuccessMsg(''); }}
            className={cn(
              'flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition-colors',
              tab === 'link'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            )}
          >
            <Link2 size={15} />
            Link / Código
          </button>
          <button
            onClick={() => { setTab('email'); setError(''); setSuccessMsg(''); }}
            className={cn(
              'flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition-colors',
              tab === 'email'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            )}
          >
            <Mail size={15} />
            Convidar por E-mail
          </button>
          <button
            onClick={() => { setTab('user'); setError(''); setSuccessMsg(''); }}
            className={cn(
              'flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition-colors',
              tab === 'user'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            )}
          >
            <Users size={15} />
            Buscar Usuários
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl text-red-600 dark:text-red-300 text-xs">
              <AlertCircle size={15} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-xl text-emerald-600 dark:text-emerald-300 text-xs">
              <Check size={15} className="flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* TAB 1: Link & Code */}
          {tab === 'link' && (
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Link de Convite Direto
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-600 dark:text-gray-300 font-mono truncate">
                    {loadingCode ? (
                      <span className="text-gray-400 flex items-center gap-2">
                        <Loader2 size={13} className="animate-spin" /> Carregando link...
                      </span>
                    ) : (
                      `${window.location.origin}${inviteData?.invite_link || ''}`
                    )}
                  </div>
                  <button
                    onClick={handleCopy}
                    disabled={loadingCode || !inviteData}
                    className="flex items-center gap-1.5 px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    {copied ? 'Copiado!' : 'Copiar'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Código de Entrada Rápida
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold tracking-widest text-indigo-600 dark:text-indigo-400 text-center font-mono">
                    {loadingCode ? '...' : (inviteData?.invite_code || '---')}
                  </div>
                  <button
                    onClick={handleCopyCode}
                    disabled={loadingCode || !inviteData}
                    className="flex items-center gap-1.5 px-3 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-medium transition-colors"
                  >
                    <Copy size={14} />
                    Copiar Código
                  </button>
                </div>
                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-2">
                  Compartilhe este código ou link com qualquer colaborador. Eles entrarão imediatamente com status de membro ativo.
                </p>
              </div>

              <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center">
                <span className="text-xs text-gray-400 dark:text-gray-500">Quer invalidar o link antigo?</span>
                <button
                  type="button"
                  onClick={handleRegenerateCode}
                  disabled={loadingCode}
                  className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium transition-colors"
                >
                  <RefreshCw size={13} className={cn(loadingCode && 'animate-spin')} />
                  Gerar novo código
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: Email */}
          {tab === 'email' && (
            <form onSubmit={handleInviteEmail} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  E-mail do Colaborador *
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-3 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ex: colaborador@empresa.com"
                    required
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1.5">
                    <Shield size={14} className="text-amber-500" />
                    Nível de Acesso
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as EnterpriseRole)}
                    className="w-full px-3 py-2.5 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="member">Membro (Padrão)</option>
                    <option value="manager">Gerente</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Título Personalizado (opcional)
                </label>
                <input
                  type="text"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="ex: Especialista em Vendas B2B, Lead Designer"
                  className="w-full px-3.5 py-2.5 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting || !email.trim()}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition-colors disabled:opacity-60 flex items-center gap-2"
                >
                  {submitting && <Loader2 size={14} className="animate-spin" />}
                  Enviar Convite
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: Registered User Search */}
          {tab === 'user' && (
            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Selecionar Usuário da Plataforma *
                </label>
                <input
                  type="text"
                  value={searchUser}
                  onChange={(e) => setSearchUser(e.target.value)}
                  placeholder="Filtrar por nome ou e-mail..."
                  className="w-full px-3.5 py-2 mb-2 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />

                <div className="max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-800 rounded-xl divide-y divide-gray-100 dark:divide-gray-800">
                  {loadingUsers ? (
                    <div className="p-4 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
                      <Loader2 size={14} className="animate-spin" /> Carregando usuários...
                    </div>
                  ) : filteredUsers.length === 0 ? (
                    <div className="p-4 text-center text-xs text-gray-400">Nenhum usuário encontrado</div>
                  ) : (
                    filteredUsers.map((u) => (
                      <button
                        type="button"
                        key={u.id}
                        onClick={() => setSelectedUserId(u.id)}
                        className={cn(
                          'w-full text-left px-3 py-2 flex items-center gap-2.5 text-xs transition-colors',
                          selectedUserId === u.id
                            ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-semibold'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                        )}
                      >
                        <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/60 flex items-center justify-center text-[10px] font-bold text-indigo-700 dark:text-indigo-300">
                          {u.name[0]?.toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="truncate font-medium">{u.name}</p>
                          <p className="text-[10px] text-gray-400 truncate">{u.email}</p>
                        </div>
                        {selectedUserId === u.id && <Check size={14} className="text-indigo-600" />}
                      </button>
                    ))
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1.5">
                    <Briefcase size={14} className="text-indigo-500" />
                    Cargo
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
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1.5">
                    <Shield size={14} className="text-amber-500" />
                    Nível de Acesso
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as EnterpriseRole)}
                    className="w-full px-3 py-2.5 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="member">Membro (Padrão)</option>
                    <option value="manager">Gerente</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Título Personalizado (opcional)
                </label>
                <input
                  type="text"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="ex: Tech Lead, Desenvolvedor Frontend"
                  className="w-full px-3.5 py-2.5 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting || !selectedUserId}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition-colors disabled:opacity-60 flex items-center gap-2"
                >
                  {submitting && <Loader2 size={14} className="animate-spin" />}
                  Adicionar Membro
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
