import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Calendar, Clock, User, MoreVertical, Edit2, Trash2,
  ExternalLink, Eye, GripVertical, Image as ImageIcon
} from 'lucide-react';
import type { SocialPost, SocialPostStatus } from '../../types/social';
import {
  SOCIAL_STATUS_ORDER,
  SOCIAL_STATUS_LABELS,
  SOCIAL_STATUS_COLORS,
  PLATFORM_INFO,
} from '../../types/social';
import { cn } from '../../utils/cn';

interface SocialKanbanProps {
  posts: SocialPost[];
  onStatusChange: (postId: string, newStatus: SocialPostStatus) => Promise<void>;
  onEditPost: (post: SocialPost) => void;
  onDeletePost: (postId: string) => void;
  onOpenArtPreview: (imageUrl: string, title: string) => void;
}

// ── Card de Arte / Post (Visual) ─────────────────────────────────────────────
function SocialCardContent({
  post,
  isDragging = false,
  onEdit,
  onDelete,
  onPreview,
}: {
  post: SocialPost;
  isDragging?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onPreview?: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const platform = PLATFORM_INFO[post.platform] || PLATFORM_INFO.instagram;

  const scheduledDate = post.scheduled_at ? new Date(post.scheduled_at) : null;
  const isPast = scheduledDate && scheduledDate < new Date() && post.status !== 'postado';

  return (
    <div
      className={cn(
        'bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 select-none overflow-hidden transition-all',
        isDragging
          ? 'shadow-2xl rotate-1 border-indigo-400 dark:border-indigo-600 scale-[1.02] opacity-95'
          : 'shadow-sm hover:shadow-md hover:border-gray-300 dark:hover:border-gray-700'
      )}
    >
      {/* Thumbnail da Arte anexada */}
      {post.media_url ? (
        <div
          className="relative h-36 bg-gray-950 overflow-hidden cursor-pointer group/art"
          onClick={(e) => {
            e.stopPropagation();
            onPreview?.();
          }}
        >
          <img
            src={post.media_url}
            alt={post.title}
            className="w-full h-full object-cover object-center group-hover/art:scale-105 transition-transform duration-300"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/art:opacity-100 transition-opacity flex items-center justify-center text-white gap-1.5 text-xs font-medium">
            <Eye size={16} /> Ver Arte
          </div>
          {/* Badge da Rede Social sobre a imagem */}
          <div className="absolute top-2.5 left-2.5">
            <span
              className={cn(
                'text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md uppercase tracking-wider',
                platform.badgeClass
              )}
            >
              {platform.label}
            </span>
          </div>
        </div>
      ) : (
        <div className="px-3.5 pt-3 flex items-center justify-between">
          <span
            className={cn(
              'text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider',
              platform.badgeClass
            )}
          >
            {platform.label}
          </span>
          <GripVertical
            size={14}
            className="text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
          />
        </div>
      )}

      {/* Conteúdo do Card */}
      <div className="p-3.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white leading-snug line-clamp-2">
            {post.title}
          </h3>

          {/* Menu de Ações */}
          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(!menuOpen);
              }}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <MoreVertical size={14} />
            </button>

            {menuOpen && (
              <div
                className="absolute right-0 mt-1 w-32 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 py-1 z-30 animate-fade-in"
                onClick={(e) => e.stopPropagation()}
              >
                {post.media_url && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onPreview?.();
                    }}
                    className="w-full px-3 py-1.5 text-left text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                  >
                    <Eye size={12} /> Ver Arte
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onEdit?.();
                  }}
                  className="w-full px-3 py-1.5 text-left text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  <Edit2 size={12} /> Editar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onDelete?.();
                  }}
                  className="w-full px-3 py-1.5 text-left text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-2"
                >
                  <Trash2 size={12} /> Excluir
                </button>
              </div>
            )}
          </div>
        </div>

        {post.caption && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 line-clamp-2">
            {post.caption}
          </p>
        )}

        {/* Rodapé: Agendamento & Responsável */}
        <div className="mt-3 pt-2.5 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
          {/* Data e hora de publicação */}
          {scheduledDate ? (
            <div
              className={cn(
                'flex items-center gap-1 font-medium',
                isPast
                  ? 'text-red-500 dark:text-red-400'
                  : 'text-gray-600 dark:text-gray-400'
              )}
              title="Data e hora da publicação"
            >
              <Calendar size={12} />
              <span>
                {scheduledDate.toLocaleDateString('pt-BR', {
                  day: 'numeric',
                  month: 'short',
                })}
              </span>
              <span className="text-gray-300 dark:text-gray-600">·</span>
              <Clock size={11} />
              <span>
                {scheduledDate.toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          ) : (
            <span className="text-gray-400 italic">Sem data</span>
          )}

          {/* Responsável pela arte */}
          <div
            className="flex items-center gap-1 max-w-[110px] truncate"
            title={post.responsible_name || 'Todos / Equipe'}
          >
            <div className="w-4 h-4 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-[9px] font-bold">
              {post.responsible_name ? post.responsible_name.charAt(0).toUpperCase() : 'T'}
            </div>
            <span className="truncate">
              {post.responsible_name ? post.responsible_name.split(' ')[0] : 'Todos'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sortable Item Wrapper ────────────────────────────────────────────────────
function SortableSocialCard({
  post,
  onEdit,
  onDelete,
  onPreview,
}: {
  post: SocialPost;
  onEdit: () => void;
  onDelete: () => void;
  onPreview: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: post.id,
      data: { post },
    });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="group relative cursor-grab active:cursor-grabbing focus:outline-none"
    >
      <SocialCardContent
        post={post}
        onEdit={onEdit}
        onDelete={onDelete}
        onPreview={onPreview}
      />
    </div>
  );
}

// ── Coluna do Kanban ──────────────────────────────────────────────────────────
function SocialKanbanColumn({
  status,
  label,
  posts,
  isOver,
  onEdit,
  onDelete,
  onPreview,
}: {
  status: SocialPostStatus;
  label: string;
  posts: SocialPost[];
  isOver: boolean;
  onEdit: (post: SocialPost) => void;
  onDelete: (postId: string) => void;
  onPreview: (url: string, title: string) => void;
}) {
  const { setNodeRef } = useDroppable({
    id: status,
    data: { type: 'column', status },
  });

  const colors = SOCIAL_STATUS_COLORS[status];

  return (
    <div
      ref={setNodeRef}
      id={`social-column-${status}`}
      className={cn(
        'flex-shrink-0 w-80 flex flex-col rounded-2xl border border-gray-200 dark:border-gray-800 border-t-4 overflow-hidden transition-all',
        colors.border,
        isOver
          ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-300 dark:border-indigo-700 ring-2 ring-indigo-400/30'
          : 'bg-gray-50/60 dark:bg-gray-900/50'
      )}
    >
      {/* Header da Coluna */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className={cn('w-2 h-2 rounded-full', colors.dot)} />
          <h2 className="text-sm font-bold text-gray-800 dark:text-gray-200">{label}</h2>
          <span
            className={cn(
              'text-xs px-2 py-0.5 rounded-full font-bold',
              colors.badge
            )}
          >
            {posts.length}
          </span>
        </div>
      </div>

      {/* Cards na Coluna */}
      <div
        className={cn(
          'flex-1 p-3 space-y-3 min-h-[160px] overflow-y-auto max-h-[calc(100vh-280px)] transition-colors',
          isOver && 'bg-indigo-50/30 dark:bg-indigo-950/10'
        )}
      >
        <SortableContext
          items={posts.map((p) => p.id)}
          strategy={verticalListSortingStrategy}
        >
          {posts.map((post) => (
            <SortableSocialCard
              key={post.id}
              post={post}
              onEdit={() => onEdit(post)}
              onDelete={() => onDelete(post.id)}
              onPreview={() =>
                post.media_url && onPreview(post.media_url, post.title)
              }
            />
          ))}
        </SortableContext>

        {posts.length === 0 && (
          <div
            className={cn(
              'h-28 flex flex-col items-center justify-center border-2 border-dashed rounded-xl transition-colors',
              isOver
                ? 'border-indigo-400 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30'
                : 'border-gray-200 dark:border-gray-700'
            )}
          >
            <ImageIcon
              size={20}
              className={cn(
                'mb-1',
                isOver ? 'text-indigo-500' : 'text-gray-300 dark:text-gray-600'
              )}
            />
            <p
              className={cn(
                'text-xs font-medium',
                isOver
                  ? 'text-indigo-600 dark:text-indigo-400'
                  : 'text-gray-400 dark:text-gray-500'
              )}
            >
              {isOver ? 'Soltar arte aqui' : 'Nenhuma arte nesta etapa'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Componente Principal Kanban ───────────────────────────────────────────────
export default function SocialKanban({
  posts,
  onStatusChange,
  onEditPost,
  onDeletePost,
  onOpenArtPreview,
}: SocialKanbanProps) {
  const [activePost, setActivePost] = useState<SocialPost | null>(null);
  const [overColumn, setOverColumn] = useState<SocialPostStatus | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const isVisibleStatus = (val: string): val is SocialPostStatus =>
    (SOCIAL_STATUS_ORDER as string[]).includes(val);

  const postsByStatus = (status: SocialPostStatus) =>
    posts.filter((p) => p.status === status);

  const handleDragStart = (event: DragStartEvent) => {
    const post = posts.find((p) => p.id === event.active.id);
    setActivePost(post ?? null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    if (!over) {
      setOverColumn(null);
      return;
    }

    const overId = String(over.id);
    if (isVisibleStatus(overId)) {
      setOverColumn(overId);
      return;
    }
    const overPost = posts.find((p) => p.id === overId);
    if (overPost) {
      setOverColumn(overPost.status);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActivePost(null);
    setOverColumn(null);

    if (!over || !active) return;

    const draggedPostId = String(active.id);
    const draggedPost = posts.find((p) => p.id === draggedPostId);
    if (!draggedPost) return;

    const overId = String(over.id);
    let targetStatus: SocialPostStatus | null = null;

    if (isVisibleStatus(overId)) {
      targetStatus = overId;
    } else {
      const overPost = posts.find((p) => p.id === overId);
      targetStatus = overPost?.status ?? null;
    }

    if (!targetStatus || targetStatus === draggedPost.status) return;

    await onStatusChange(draggedPostId, targetStatus);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-5 overflow-x-auto pb-6 flex-1 items-start">
        {SOCIAL_STATUS_ORDER.map((status) => (
          <SocialKanbanColumn
            key={status}
            status={status}
            label={SOCIAL_STATUS_LABELS[status]}
            posts={postsByStatus(status)}
            isOver={overColumn === status}
            onEdit={onEditPost}
            onDelete={onDeletePost}
            onPreview={onOpenArtPreview}
          />
        ))}
      </div>

      {/* Drag Overlay (Card fantasma) */}
      <DragOverlay
        dropAnimation={{
          duration: 200,
          easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
        }}
      >
        {activePost ? (
          <div className="w-80">
            <SocialCardContent post={activePost} isDragging />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
