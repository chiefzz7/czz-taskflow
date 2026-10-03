import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Share2, Plus, Columns3, Calendar, LayoutGrid, Search,
  Filter, Loader2, Sparkles, CheckCircle2, Clock, Eye, X,
  AlertTriangle, RefreshCw, Settings, PenLine
} from 'lucide-react';
import type { SocialPost, SocialPlatform, SocialPostStatus } from '../../types/social';
import { PLATFORM_INFO, SOCIAL_STATUS_LABELS } from '../../types/social';
import { socialService } from '../../services/socialService';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import SocialKanban from './SocialKanban';
import SocialScheduleCalendar from './SocialScheduleCalendar';
import SocialPostModal from './SocialPostModal';
import SocialSettingsPage from './SocialSettingsPage';
import ModalPrecisaEditar from '../../components/social/ModalPrecisaEditar';
import { cn } from '../../utils/cn';

type ActiveTab = 'kanban' | 'schedule' | 'gallery' | 'settings';

export default function SocialMediaPage() {
  const { isPersonal, currentEnterpriseId } = useWorkspace();
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('kanban');

  // Filtros
  const [busca, setBusca] = useState('');
  const [filtroPlataforma, setFiltroPlataforma] = useState<string>('todas');
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');

  // Modais
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<SocialPost | null>(null);
  const [artPreview, setArtPreview] = useState<{ url: string; title: string } | null>(null);
  const [postForEditRequest, setPostForEditRequest] = useState<SocialPost | null>(null);

  // Carregar posts
  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const data = await socialService.list({
        workspace: isPersonal ? 'personal' : 'enterprise',
        enterprise_id: isPersonal ? undefined : currentEnterpriseId || undefined,
      });
      setPosts(data);
    } catch {
      // silencioso
    } finally {
      setCarregando(false);
    }
  }, [isPersonal, currentEnterpriseId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // Atualizar status (usado no Kanban com drag & drop)
  const handleStatusChange = async (postId: string, newStatus: SocialPostStatus) => {
    // Optimistic update
    const previous = [...posts];
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, status: newStatus } : p))
    );

    try {
      const atualizado = await socialService.updateStatus(postId, newStatus);
      setPosts((prev) => prev.map((p) => (p.id === postId ? atualizado : p)));
    } catch {
      // Reverter se falhar
      setPosts(previous);
    }
  };

  // Excluir post
  const handleDeletePost = async (postId: string) => {
    if (!confirm('Deseja realmente excluir esta arte / publicação?')) return;
    try {
      await socialService.delete(postId);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch {
      alert('Erro ao excluir a publicação.');
    }
  };

  // Atualizar um post na lista (após edição de solicitação)
  const handlePostUpdated = (updated: SocialPost) => {
    setPosts(prev => prev.map(p => p.id === updated.id ? updated : p));
  };

  // Posts filtrados
  const postsFiltrados = useMemo(() => {
    return posts.filter((post) => {
      const matchBusca =
        !busca.trim() ||
        post.title.toLowerCase().includes(busca.toLowerCase()) ||
        (post.caption && post.caption.toLowerCase().includes(busca.toLowerCase())) ||
        (post.responsible_name && post.responsible_name.toLowerCase().includes(busca.toLowerCase()));

      const matchPlataforma =
        filtroPlataforma === 'todas' || post.platform === filtroPlataforma;

      const matchStatus =
        filtroStatus === 'todos' || post.status === filtroStatus;

      return matchBusca && matchPlataforma && matchStatus;
    });
  }, [posts, busca, filtroPlataforma, filtroStatus]);

  // Métricas rápidas
  const stats = useMemo(() => {
    const total = posts.length;
    const emProducao = posts.filter((p) => p.status === 'em_producao').length;
    const agendados = posts.filter((p) => p.status === 'pronto').length;
    const postados = posts.filter((p) => p.status === 'postado').length;
    const precisamEditar = posts.filter((p) => p.needs_edit).length;
    return { total, emProducao, agendados, postados, precisamEditar };
  }, [posts]);

  return (
    <div className="p-6 md:p-8 animate-fade-in flex flex-col min-h-full space-y-6">
      {/* Header com Título e Ação */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/10 dark:bg-indigo-400/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Share2 size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                Redes Sociais
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                  {posts.length} artes
                </span>
                {stats.precisamEditar > 0 && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                    <PenLine size={11} />
                    {stats.precisamEditar} precisam editar
                  </span>
                )}
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Gerenciador de produção visual, cronograma e agendamento de postagens
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={carregar}
            className="p-2.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
            title="Recarregar"
          >
            <RefreshCw size={17} className={carregando ? 'animate-spin' : ''} />
          </button>
          {activeTab !== 'settings' && (
            <button
              onClick={() => {
                setEditingPost(null);
                setModalOpen(true);
              }}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm shadow-sm transition-all hover:shadow-indigo-500/25 flex items-center gap-2"
            >
              <Plus size={18} /> Nova Publicação
            </button>
          )}
        </div>
      </div>

      {/* Cards de Métricas */}
      {activeTab !== 'settings' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 shadow-2xs">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Total de Publicações</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.total}</p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 shadow-2xs">
            <p className="text-xs font-medium text-blue-600 dark:text-blue-400">Em Produção de Arte</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">{stats.emProducao}</p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 shadow-2xs">
            <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Prontas / Agendadas</p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{stats.agendados}</p>
          </div>
          <div className={cn(
            'rounded-2xl border p-4 shadow-2xs',
            stats.precisamEditar > 0
              ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900'
              : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800'
          )}>
            <p className={cn(
              'text-xs font-medium',
              stats.precisamEditar > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-600 dark:text-gray-400'
            )}>
              {stats.precisamEditar > 0 ? '⚠ Precisam Editar' : 'Já Postadas'}
            </p>
            <p className={cn(
              'text-2xl font-bold mt-1',
              stats.precisamEditar > 0 ? 'text-amber-700 dark:text-amber-300' : 'text-gray-800 dark:text-gray-200'
            )}>
              {stats.precisamEditar > 0 ? stats.precisamEditar : stats.postados}
            </p>
          </div>
        </div>
      )}

      {/* Barra de Ferramentas: Navegação de Abas + Filtros */}
      <div className={cn(
        'flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-gray-900 p-3 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xs',
        activeTab === 'settings' && 'md:justify-start'
      )}>
        {/* Abas */}
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800/70 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('kanban')}
            className={cn(
              'flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all',
              activeTab === 'kanban'
                ? 'bg-white dark:bg-gray-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            )}
          >
            <Columns3 size={15} /> Quadro Kanban
          </button>
          <button
            onClick={() => setActiveTab('schedule')}
            className={cn(
              'flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all',
              activeTab === 'schedule'
                ? 'bg-white dark:bg-gray-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            )}
          >
            <Calendar size={15} /> Cronograma &amp; Horários
          </button>
          <button
            onClick={() => setActiveTab('gallery')}
            className={cn(
              'flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all',
              activeTab === 'gallery'
                ? 'bg-white dark:bg-gray-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            )}
          >
            <LayoutGrid size={15} /> Mural de Artes
          </button>
          {!isPersonal && currentEnterpriseId && (
            <button
              onClick={() => setActiveTab('settings')}
              className={cn(
                'flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all',
                activeTab === 'settings'
                  ? 'bg-white dark:bg-gray-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              )}
            >
              <Settings size={15} /> Configurações
            </button>
          )}
        </div>

        {/* Filtros — apenas quando não está em settings */}
        {activeTab !== 'settings' && (
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Busca */}
            <div className="relative flex-1 sm:w-48">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar arte..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Filtro Rede Social */}
            <select
              value={filtroPlataforma}
              onChange={(e) => setFiltroPlataforma(e.target.value)}
              className="px-2.5 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="todas">Todas as Redes</option>
              {Object.keys(PLATFORM_INFO).map((k) => (
                <option key={k} value={k}>
                  {PLATFORM_INFO[k as SocialPlatform].label}
                </option>
              ))}
            </select>

            {/* Filtro Status */}
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="px-2.5 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="todos">Todos os Status</option>
              {Object.keys(SOCIAL_STATUS_LABELS).map((k) => (
                <option key={k} value={k}>
                  {SOCIAL_STATUS_LABELS[k as SocialPostStatus]}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Conteúdo Principal */}
      {activeTab === 'settings' && !isPersonal && currentEnterpriseId ? (
        <SocialSettingsPage enterpriseId={currentEnterpriseId} />
      ) : carregando ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] gap-3">
          <Loader2 size={28} className="animate-spin text-indigo-600" />
          <p className="text-xs text-gray-500">Carregando painel de redes sociais...</p>
        </div>
      ) : activeTab === 'kanban' ? (
        <div className="flex-1">
          <SocialKanban
            posts={postsFiltrados}
            onStatusChange={handleStatusChange}
            onEditPost={(post) => {
              setEditingPost(post);
              setModalOpen(true);
            }}
            onDeletePost={handleDeletePost}
            onOpenArtPreview={(url, title) => setArtPreview({ url, title })}
            onRequestEdit={(post) => setPostForEditRequest(post)}
          />
        </div>
      ) : activeTab === 'schedule' ? (
        <SocialScheduleCalendar
          posts={postsFiltrados}
          onEditPost={(post) => {
            setEditingPost(post);
            setModalOpen(true);
          }}
          onOpenArtPreview={(url, title) => setArtPreview({ url, title })}
          onNewPostWithDate={(dateStr) => {
            setEditingPost(null);
            setModalOpen(true);
          }}
        />
      ) : (
        /* Mural de Artes (Galeria Visual) */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {postsFiltrados
            .filter((p) => p.media_url)
            .map((post) => {
              const plt = PLATFORM_INFO[post.platform] || PLATFORM_INFO.instagram;
              return (
                <div
                  key={post.id}
                  className={cn(
                    'bg-white dark:bg-gray-900 rounded-2xl border overflow-hidden shadow-sm hover:shadow-lg transition-all group',
                    post.needs_edit
                      ? 'border-amber-300 dark:border-amber-700'
                      : 'border-gray-200 dark:border-gray-800'
                  )}
                >
                  <div
                    className="relative h-48 bg-gray-950 overflow-hidden cursor-pointer"
                    onClick={() => setArtPreview({ url: post.media_url!, title: post.title })}
                  >
                    <img
                      src={post.media_url!}
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-2.5 left-2.5">
                      <span
                        className={cn(
                          'text-[10px] font-bold px-2 py-0.5 rounded-full shadow uppercase',
                          plt.badgeClass
                        )}
                      >
                        {plt.label}
                      </span>
                    </div>
                    {post.needs_edit && (
                      <div className="absolute top-2.5 right-2.5">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-white shadow flex items-center gap-1">
                          <PenLine size={9} /> Editar
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="p-4 space-y-2">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white line-clamp-1">
                      {post.title}
                    </h3>
                    {post.needs_edit && post.edit_notes && (
                      <p className="text-[11px] text-amber-600 dark:text-amber-400 line-clamp-2">
                        ✏ {post.edit_notes}
                      </p>
                    )}
                    <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100 dark:border-gray-800">
                      <span>{post.responsible_name || 'Equipe'}</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setPostForEditRequest(post)}
                          className="text-amber-600 dark:text-amber-400 font-semibold hover:underline"
                        >
                          <PenLine size={12} />
                        </button>
                        <button
                          onClick={() => {
                            setEditingPost(post);
                            setModalOpen(true);
                          }}
                          className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
                        >
                          Editar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* Modal de Criação e Edição */}
      <SocialPostModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingPost(null);
        }}
        onSaved={carregar}
        postToEdit={editingPost}
      />

      {/* Modal de Visualização da Arte em Tamanho Real */}
      {artPreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
          onClick={() => setArtPreview(null)}
        >
          <div
            className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setArtPreview(null)}
              className="absolute -top-10 right-0 text-white/80 hover:text-white p-1 rounded-full"
            >
              <X size={24} />
            </button>
            <img
              src={artPreview.url}
              alt={artPreview.title}
              className="max-h-[80vh] w-auto rounded-2xl shadow-2xl object-contain border border-white/10"
            />
            <p className="mt-3 text-white text-sm font-semibold text-center">
              {artPreview.title}
            </p>
          </div>
        </div>
      )}

      {/* Modal de Solicitação de Edição */}
      {postForEditRequest && (
        <ModalPrecisaEditar
          post={postForEditRequest}
          isOpen={!!postForEditRequest}
          onClose={() => setPostForEditRequest(null)}
          onSaved={(updated) => {
            handlePostUpdated(updated);
            setPostForEditRequest(null);
          }}
        />
      )}
    </div>
  );
}
