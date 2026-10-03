import { useState, useEffect, useCallback } from 'react';
import {
  Settings, Shield, Check, Loader2, Save, Users, ChevronDown,
  ChevronUp, Info, Share2, AlertTriangle, ToggleLeft, ToggleRight,
  Globe, Video, AtSign, X,
} from 'lucide-react';

import type { SocialSettings } from '../../types/social';
import type { EnterpriseCustomRole } from '../../types/enterprise';
import { PLATFORM_INFO, STATUS_TRANSITION_LABELS } from '../../types/social';
import { socialService } from '../../services/socialService';
import { enterpriseService } from '../../services/enterpriseService';
import { cn } from '../../utils/cn';

interface SocialSettingsPageProps {
  enterpriseId: string;
}

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  instagram: <Share2 size={16} />,
  youtube: <Globe size={16} />,
  facebook: <Globe size={16} />,
  linkedin: <Globe size={16} />,
  threads: <AtSign size={16} />,
  tiktok: <Video size={16} />,
  twitter: <Globe size={16} />,
};

const PERMISSION_KEYS = [
  'can_move_to_producao',
  'can_move_to_revisao',
  'can_approve',
  'can_mark_posted',
  'can_request_edit',
] as const;

type PermissionKey = typeof PERMISSION_KEYS[number];

const PERMISSION_DESCRIPTIONS: Record<PermissionKey, string> = {
  can_move_to_producao: 'Define quem pode mover uma ideia para o estágio de produção de arte. Deixe em "Qualquer membro" para que qualquer um possa iniciar a produção.',
  can_move_to_revisao: 'Define quem pode enviar um post para revisão/aprovação. Geralmente o designer ou criador da arte.',
  can_approve: 'Quem pode aprovar uma arte e marcá-la como Pronta / Agendada. Recomendado: apenas gerentes e gestores.',
  can_mark_posted: 'Quem pode marcar um post como efetivamente Postado. Geralmente o responsável pelo gerenciamento de mídias.',
  can_request_edit: 'Quem pode solicitar alterações em uma arte com notas detalhadas. Deixe em "Qualquer membro" para feedback aberto.',
};

export default function SocialSettingsPage({ enterpriseId }: SocialSettingsPageProps) {
  const [settings, setSettings] = useState<SocialSettings | null>(null);
  const [cargos, setCargos] = useState<EnterpriseCustomRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [expandedSection, setExpandedSection] = useState<string | null>('permissions');

  // Local editable state
  const [permissions, setPermissions] = useState<Record<PermissionKey, string[] | null>>({
    can_move_to_producao: null,
    can_move_to_revisao: null,
    can_approve: null,
    can_mark_posted: null,
    can_request_edit: null,
  });
  const [activePlatforms, setActivePlatforms] = useState<string[]>(Object.keys(PLATFORM_INFO));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [settingsData, cargosData] = await Promise.all([
        socialService.getSettings(enterpriseId),
        enterpriseService.listRoles(enterpriseId),
      ]);
      setSettings(settingsData);
      setCargos(cargosData);

      // Initialize local state from loaded settings
      setPermissions({
        can_move_to_producao: settingsData.can_move_to_producao,
        can_move_to_revisao: settingsData.can_move_to_revisao,
        can_approve: settingsData.can_approve,
        can_mark_posted: settingsData.can_mark_posted,
        can_request_edit: settingsData.can_request_edit,
      });
      setActivePlatforms(settingsData.active_platforms ?? Object.keys(PLATFORM_INFO));
    } catch {
      setError('Falha ao carregar configurações');
    } finally {
      setLoading(false);
    }
  }, [enterpriseId]);

  useEffect(() => { load(); }, [load]);

  const togglePermissionRole = (key: PermissionKey, roleId: string) => {
    setPermissions(prev => {
      const current = prev[key];
      if (current === null) {
        // Was "qualquer um"  restrict to just this role
        return { ...prev, [key]: [roleId] };
      }
      if (current.includes(roleId)) {
        const next = current.filter(id => id !== roleId);
        // If empty after removing, revert to "qualquer um" (null)
        return { ...prev, [key]: next.length === 0 ? null : next };
      }
      return { ...prev, [key]: [...current, roleId] };
    });
  };

  const setPermissionToAll = (key: PermissionKey) => {
    setPermissions(prev => ({ ...prev, [key]: null }));
  };

  const setPermissionToNone = (key: PermissionKey) => {
    setPermissions(prev => ({ ...prev, [key]: [] }));
  };

  const togglePlatform = (platform: string) => {
    setActivePlatforms(prev =>
      prev.includes(platform)
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await socialService.updateSettings(enterpriseId, {
        ...permissions,
        active_platforms: activePlatforms,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError('Falha ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={24} className="animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Settings size={17} className="text-indigo-600 dark:text-indigo-400" />
            Configurações de Redes Sociais
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Defina quais cargos podem realizar cada ação no workflow de publicação
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-all shadow-sm disabled:opacity-60"
        >
          {saving ? (
            <Loader2 size={14} className="animate-spin" />
          ) : saved ? (
            <Check size={14} />
          ) : (
            <Save size={14} />
          )}
          {saved ? 'Salvo!' : saving ? 'Salvando...' : 'Salvar Configurações'}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl text-red-600 dark:text-red-300 text-xs">
          <AlertTriangle size={14} />
          {error}
        </div>
      )}

      {/* Active Platforms Section */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-xs">
        <button
          onClick={() => setExpandedSection(prev => prev === 'platforms' ? null : 'platforms')}
          className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white">
              <Share2 size={16} />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">Plataformas Ativas</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{activePlatforms.length} de {Object.keys(PLATFORM_INFO).length} plataformas ativas</p>
            </div>
          </div>
          {expandedSection === 'platforms' ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
        </button>

        {expandedSection === 'platforms' && (
          <div className="px-5 pb-5 border-t border-gray-100 dark:border-gray-800">
            <p className="text-xs text-gray-500 dark:text-gray-400 pt-4 pb-3">
              Selecione quais redes sociais serão exibidas nas opções de publicação desta empresa.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.entries(PLATFORM_INFO).map(([key, info]) => {
                const isActive = activePlatforms.includes(key);
                return (
                  <button
                    key={key}
                    onClick={() => togglePlatform(key)}
                    className={cn(
                      'flex items-center gap-2.5 px-3 py-2.5 rounded-xl border-2 text-xs font-semibold transition-all',
                      isActive
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300'
                        : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 opacity-60'
                    )}
                  >
                    <span className="flex-shrink-0 text-current">
                      {PLATFORM_ICONS[key]}
                    </span>
                    {info.label}
                    {isActive && <Check size={12} className="ml-auto flex-shrink-0 text-indigo-500" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Permissions Section */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-xs">
        <button
          onClick={() => setExpandedSection(prev => prev === 'permissions' ? null : 'permissions')}
          className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white">
              <Shield size={16} />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">Permissões de Workflow</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Controle quem pode realizar cada ação no fluxo de publicação</p>
            </div>
          </div>
          {expandedSection === 'permissions' ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
        </button>

        {expandedSection === 'permissions' && (
          <div className="border-t border-gray-100 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
            {cargos.length === 0 && (
              <div className="p-5 flex items-center gap-3 bg-amber-50 dark:bg-amber-950/20">
                <Info size={16} className="text-amber-600 dark:text-amber-400 flex-shrink-0" />
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  Nenhum cargo personalizado foi criado ainda. Crie cargos na aba "Empresa" para configurar permissões granulares.
                  Por enquanto, todas as ações estão liberadas para qualquer membro.
                </p>
              </div>
            )}

            {PERMISSION_KEYS.map((key) => {
              const currentRoles = permissions[key]; // null = todos, [] = ninguém, [...] = só esses
              const isAll = currentRoles === null;
              const isNone = Array.isArray(currentRoles) && currentRoles.length === 0;

              return (
                <div key={key} className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-gray-900 dark:text-white">
                        {STATUS_TRANSITION_LABELS[key]}
                      </p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                        {PERMISSION_DESCRIPTIONS[key]}
                      </p>
                    </div>
                    {/* Quick toggle: all vs restricted */}
                    <button
                      onClick={() => isAll ? setPermissionToNone(key) : setPermissionToAll(key)}
                      title={isAll ? 'Clique para restringir por cargo' : 'Clique para liberar para todos'}
                      className="flex-shrink-0 mt-0.5"
                    >
                      {isAll ? (
                        <ToggleRight size={22} className="text-emerald-500" />
                      ) : (
                        <ToggleLeft size={22} className="text-gray-400" />
                      )}
                    </button>
                  </div>

                  {/* Status chip */}
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      'text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide',
                      isAll
                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                        : isNone
                          ? 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300'
                          : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                    )}>
                      {isAll ? 'Qualquer Membro' : isNone ? 'Ninguém' : `${currentRoles!.length} cargo(s) selecionado(s)`}
                    </span>
                    {!isAll && (
                      <button
                        onClick={() => setPermissionToAll(key)}
                        className="text-[10px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 underline transition-colors"
                      >
                        Liberar para todos
                      </button>
                    )}
                  </div>

                  {/* Role selector */}
                  {cargos.length > 0 && !isAll && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {cargos.map((cargo) => {
                        const selected = Array.isArray(currentRoles) && currentRoles.includes(cargo.id);
                        return (
                          <button
                            key={cargo.id}
                            onClick={() => togglePermissionRole(key, cargo.id)}
                            className={cn(
                              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border-2 transition-all',
                              selected
                                ? 'border-current opacity-100'
                                : 'border-transparent opacity-50 hover:opacity-75'
                            )}
                            style={{
                              backgroundColor: selected ? `${cargo.color}20` : `${cargo.color}10`,
                              color: cargo.color,
                              borderColor: selected ? cargo.color : 'transparent',
                            }}
                          >
                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cargo.color }} />
                            {cargo.name}
                            {selected && <Check size={10} className="ml-0.5" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="flex gap-3 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 rounded-xl text-xs text-blue-700 dark:text-blue-300">
        <Info size={14} className="flex-shrink-0 mt-0.5 text-blue-500" />
        <div className="space-y-1.5">
          <p className="font-semibold">Como funcionam as permissões de workflow:</p>
          <ul className="space-y-1 text-blue-600 dark:text-blue-400">
            <li>• <strong>Qualquer membro</strong>: a ação fica disponível para todos os membros da empresa</li>
            <li>• <strong>Cargos selecionados</strong>: apenas membros com aquele cargo personalizado podem realizar a ação</li>
            <li>• <strong>Ninguém</strong>: a ação fica desabilitada para todos (exceto administradores)</li>
            <li>• Administradores (<strong>admin</strong>) sempre podem realizar todas as ações</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
