import { useEffect, useState, useCallback, useMemo } from 'react';
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
  Columns3, Loader2, GripVertical, Plus, Search, Calendar,
  Shield, User as UserIcon, Users, AlertCircle, X, CheckCircle2,
  Clock, Filter
} from 'lucide-react';
import { taskService } from '../../services/taskService';
import { enterpriseService } from '../../services/enterpriseService';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { useAuth } from '../../contexts/AuthContext';
import type { Task, TaskStatus, TaskPriority, TaskSettings } from '../../types/task';
import type { EnterpriseMember } from '../../types/enterprise';
import { TASK_STATUS_ORDER, TASK_STATUS_LABELS, TASK_PRIORITY_LABELS } from '../../types/task';
import ModalCriarTarefa from '../../components/tasks/ModalCriarTarefa';
import ModalPermissoesTarefas from '../../components/tasks/ModalPermissoesTarefas';
import { cn } from '../../utils/cn';

// ── Cores por coluna ─────────────────────────────────────────────────────────
const columnBorder: Record<string, string> = {
  backlog: 'border-t-gray-400',
  todo: 'border-t-amber-400',
  in_progress: 'border-t-blue-500',
  review: 'border-t-violet-500',
  done: 'border-t-emerald-500',
  archived: 'border-t-gray-300',
};

const priorityDot: Record<string, string> = {
  urgent: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-amber-400',
  low: 'bg-blue-400',
  none: 'bg-gray-300 dark:bg-gray-600',
};

type PeriodFilter = 'all' | 'today' | 'week' | 'month';

// ── Card de tarefa (conteúdo visual) ─────────────────────────────────────────
function TaskCardContent({ task, isDragging = false }: { task: Task; isDragging?: boolean }) {
  const vence = task.due_at ? new Date(task.due_at) : null;
  const atrasada = vence && vence < new Date() && task.status !== 'done';

  return (
    <div className={cn(
      'bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-3.5 select-none transition-all shadow-xs',
      isDragging
        ? 'shadow-2xl rotate-1 border-indigo-400 dark:border-indigo-600 opacity-95 scale-[1.02] ring-2 ring-indigo-400/30'
        : 'hover:shadow-md hover:border-gray-300 dark:hover:border-gray-700'
    )}>
      {/* Title & Grip */}
      <div className="flex items-start gap-2">
        <div
          className={cn('w-2 h-2 rounded-full flex-shrink-0 mt-1.5', priorityDot[task.priority])}
          title={TASK_PRIORITY_LABELS[task.priority]}
        />
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex-1 line-clamp-2 leading-snug">
          {task.title}
        </p>
        <GripVertical
          size={14}
          className="text-gray-300 dark:text-gray-600 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
        />
      </div>

      {/* Description */}
      {task.description && (
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5 ml-4 line-clamp-2">
          {task.description}
        </p>
      )}

      {/* Responsible User Badge */}
      {task.responsible_name && (
        <div className="flex items-center gap-1.5 mt-2.5 ml-4">
          <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center text-[10px] font-bold text-white uppercase shadow-xs">
            {task.responsible_name.charAt(0)}
          </div>
          <span className="text-[11px] text-gray-600 dark:text-gray-300 font-medium truncate max-w-[130px]">
            {task.responsible_name}
          </span>
          {task.assignee_names && task.assignee_names.length > 1 && (
            <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium bg-gray-100 dark:bg-gray-800 px-1 py-0.2 rounded-full">
              +{task.assignee_names.length - 1}
            </span>
          )}
        </div>
      )}

      {/* Footer: Date & Priority */}
      <div className="flex items-center justify-between mt-3 ml-4 pt-2 border-t border-gray-100 dark:border-gray-800/80">
        {vence ? (
          <p className={cn('text-[10px] font-medium flex items-center gap-1', atrasada ? 'text-red-500 font-semibold' : 'text-gray-400 dark:text-gray-500')}>
            <Clock size={11} />
            {atrasada ? 'Atrasada · ' : ''}
            {vence.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}
          </p>
        ) : <span />}

        <span className={cn(
          'text-[10px] font-medium px-2 py-0.5 rounded-full',
          task.priority === 'urgent' ? 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 font-semibold' :
          task.priority === 'high' ? 'bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-400' :
          task.priority === 'medium' ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400' :
          'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
        )}>
          {TASK_PRIORITY_LABELS[task.priority]}
        </span>
      </div>
    </div>
  );
}

// ── Card arrastável ───────────────────────────────────────────────────────────
function SortableTaskCard({ task }: { task: Task }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { task },
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
      <TaskCardContent task={task} />
    </div>
  );
}

// ── Coluna do Kanban ──────────────────────────────────────────────────────────
function KanbanColumn({
  status, label, tasks, isOver, onAddTask,
}: {
  status: TaskStatus;
  label: string;
  tasks: Task[];
  isOver: boolean;
  onAddTask?: () => void;
}) {
  const { setNodeRef } = useDroppable({
    id: status,
    data: { type: 'column', status },
  });

  return (
    <div
      ref={setNodeRef}
      id={`column-${status}`}
      className={cn(
        'flex-shrink-0 w-72 flex flex-col rounded-2xl border border-gray-200 dark:border-gray-800 border-t-4 overflow-hidden transition-all shadow-xs',
        columnBorder[status],
        isOver
          ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800 ring-2 ring-indigo-400/30'
          : 'bg-gray-50/90 dark:bg-gray-900/40'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-gray-800 dark:text-gray-200">{label}</span>
          <span className={cn(
            'text-xs px-2 py-0.5 rounded-full font-bold',
            isOver
              ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300'
              : 'bg-gray-200/80 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
          )}>
            {tasks.length}
          </span>
        </div>
        {status === 'todo' && onAddTask && (
          <button
            onClick={onAddTask}
            title="Criar tarefa"
            className="p-1 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-gray-200/50 dark:hover:bg-gray-800 transition-colors"
          >
            <Plus size={15} />
          </button>
        )}
      </div>

      {/* Cards */}
      <div className={cn(
        'flex-1 px-3 pb-3 space-y-2.5 min-h-[160px] transition-colors overflow-y-auto',
        isOver && 'bg-indigo-50/30 dark:bg-indigo-950/10'
      )}>
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => <SortableTaskCard key={task.id} task={task} />)}
        </SortableContext>

        {tasks.length === 0 && (
          <div className={cn(
            'h-24 flex flex-col items-center justify-center border-2 border-dashed rounded-xl transition-colors',
            isOver
              ? 'border-indigo-400 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30'
              : 'border-gray-200 dark:border-gray-800/80'
          )}>
            <p className={cn('text-xs font-medium', isOver ? 'text-indigo-600 dark:text-indigo-400 font-semibold' : 'text-gray-400 dark:text-gray-500')}>
              {isOver ? 'Soltar aqui' : 'Nenhuma tarefa'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Página Kanban ─────────────────────────────────────────────────────────────
export default function KanbanPage() {
  const { isPersonal, currentEnterpriseId, isEnterprise } = useWorkspace();
  const { user } = useAuth();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<EnterpriseMember[]>([]);
  const [taskSettings, setTaskSettings] = useState<TaskSettings | null>(null);

  const [carregando, setCarregando] = useState(true);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [overColumn, setOverColumn] = useState<TaskStatus | null>(null);

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Filters state
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all');
  const [responsibleFilter, setResponsibleFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Toast / alert banner
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'error' | 'success' } | null>(null);

  const showToast = (text: string, type: 'error' | 'success' = 'error') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage((prev) => (prev?.text === text ? null : prev));
    }, 4500);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const dadosPromise = isPersonal
        ? taskService.listPersonal()
        : currentEnterpriseId ? taskService.listEnterprise(currentEnterpriseId) : Promise.resolve([]);

      if (!isPersonal && currentEnterpriseId) {
        const [dados, membersData, settingsData] = await Promise.all([
          dadosPromise,
          enterpriseService.listMembers(currentEnterpriseId).catch(() => []),
          taskService.getSettings(currentEnterpriseId).catch(() => null),
        ]);
        setTasks(dados);
        setMembers(membersData);
        setTaskSettings(settingsData);
      } else {
        const dados = await dadosPromise;
        setTasks(dados);
        setMembers([]);
        setTaskSettings(null);
      }
    } catch {
      /* silent */
    } finally {
      setCarregando(false);
    }
  }, [isPersonal, currentEnterpriseId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // Current user's membership role in enterprise
  const currentMember = useMemo(() => {
    if (!user || isPersonal || !members.length) return null;
    return members.find((m) => m.user_id === user.id) || null;
  }, [user, isPersonal, members]);

  const isManagerOrAdmin = useMemo(() => {
    if (!currentMember) return false;
    return currentMember.role === 'admin' || currentMember.role === 'manager';
  }, [currentMember]);

  // ── Filtragem das Tarefas ──────────────────────────────────────────────────
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // 1. Filtro de Período (Data)
      if (periodFilter !== 'all') {
        const rawDate = task.due_at || task.planned_start_at || task.created_at;
        const taskDate = new Date(rawDate);
        const now = new Date();

        if (periodFilter === 'today') {
          const isToday =
            taskDate.getFullYear() === now.getFullYear() &&
            taskDate.getMonth() === now.getMonth() &&
            taskDate.getDate() === now.getDate();
          if (!isToday) return false;
        } else if (periodFilter === 'week') {
          const startOfWeek = new Date(now);
          startOfWeek.setDate(now.getDate() - now.getDay());
          startOfWeek.setHours(0, 0, 0, 0);
          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(startOfWeek.getDate() + 7);
          endOfWeek.setHours(23, 59, 59, 999);
          if (taskDate < startOfWeek || taskDate > endOfWeek) return false;
        } else if (periodFilter === 'month') {
          const isThisMonth =
            taskDate.getFullYear() === now.getFullYear() &&
            taskDate.getMonth() === now.getMonth();
          if (!isThisMonth) return false;
        }
      }

      // 2. Filtro de Responsável
      if (responsibleFilter === 'me') {
        const isMine =
          task.creator_id === user?.id ||
          task.responsible_id === user?.id ||
          (task.assignee_ids && task.assignee_ids.includes(user?.id || ''));
        if (!isMine) return false;
      } else if (responsibleFilter !== 'all') {
        const matchesUser =
          task.responsible_id === responsibleFilter ||
          (task.assignee_ids && task.assignee_ids.includes(responsibleFilter));
        if (!matchesUser) return false;
      }

      // 3. Filtro de Prioridade
      if (priorityFilter !== 'all') {
        if (task.priority !== priorityFilter) return false;
      }

      // 4. Busca por Texto
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = task.title.toLowerCase().includes(q);
        const matchDesc = task.description?.toLowerCase().includes(q);
        const matchResp = task.responsible_name?.toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchResp) return false;
      }

      return true;
    });
  }, [tasks, periodFilter, responsibleFilter, priorityFilter, searchQuery, user?.id]);

  // ── Colunas visíveis ───────────────────────────────────────────────────────
  const visibleStatuses: TaskStatus[] = TASK_STATUS_ORDER.filter((s) => s !== 'archived');

  const isVisibleStatus = (val: string): val is TaskStatus =>
    (visibleStatuses as string[]).includes(val);

  const tasksByStatus = (status: TaskStatus) =>
    filteredTasks.filter((t) => t.status === status);

  // ── Drag handlers ─────────────────────────────────────────────────────────
  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === event.active.id);
    setActiveTask(task ?? null);
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
    const overTask = tasks.find((t) => t.id === overId);
    if (overTask) {
      setOverColumn(overTask.status);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);
    setOverColumn(null);

    if (!over || !active) return;

    const draggedTaskId = String(active.id);
    const draggedTask = tasks.find((t) => t.id === draggedTaskId);
    if (!draggedTask) return;

    const overId = String(over.id);
    let targetStatus: TaskStatus | null = null;

    if (isVisibleStatus(overId)) {
      targetStatus = overId;
    } else {
      const overTask = tasks.find((t) => t.id === overId);
      targetStatus = overTask?.status ?? null;
    }

    if (!targetStatus || targetStatus === draggedTask.status) return;

    // ── Validação client-side para o destino "Concluída" (done) ──────────────
    if (isEnterprise && targetStatus === 'done' && !isManagerOrAdmin) {
      // Verifica se o cargo customizado do usuário está autorizado em can_finalize_task
      const allowedRoles = taskSettings?.can_finalize_task;
      const userCargoId = currentMember?.custom_role_id;
      const isCargoAuthorized =
        allowedRoles && userCargoId && allowedRoles.includes(userCargoId);

      if (!isCargoAuthorized) {
        showToast(
          'Apenas gestores ou cargos autorizados podem definir a tarefa como Finalizada. Mova para "Em Revisão" para aprovação do gestor.',
          'error'
        );
        return;
      }
    }

    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === draggedTaskId ? { ...t, status: targetStatus! } : t))
    );

    try {
      const atualizada = await taskService.updateStatus(draggedTaskId, targetStatus);
      setTasks((prev) =>
        prev.map((t) => (t.id === draggedTaskId ? atualizada : t))
      );
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || 'Erro ao mover tarefa. Permissão negada.';
      showToast(msg, 'error');

      // Reverter em caso de erro
      setTasks((prev) =>
        prev.map((t) =>
          t.id === draggedTaskId ? { ...t, status: draggedTask.status } : t
        )
      );
    }
  };

  if (carregando) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 size={26} className="animate-spin text-indigo-600" />
        <p className="text-xs text-gray-400">Carregando quadro Kanban...</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 animate-fade-in flex flex-col h-full space-y-4">
      {/* Toast Alert Banner */}
      {toastMessage && (
        <div className={cn(
          'fixed top-5 right-5 z-50 max-w-md p-4 rounded-2xl shadow-xl border flex items-start gap-3 animate-slide-up',
          toastMessage.type === 'error'
            ? 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
            : 'bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
        )}>
          {toastMessage.type === 'error' ? (
            <AlertCircle size={18} className="shrink-0 text-red-500 mt-0.5" />
          ) : (
            <CheckCircle2 size={18} className="shrink-0 text-emerald-500 mt-0.5" />
          )}
          <p className="text-xs font-semibold leading-relaxed flex-1">{toastMessage.text}</p>
          <button
            onClick={() => setToastMessage(null)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-xs">
            <Columns3 size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Quadro Kanban</h1>
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                {filteredTasks.length} de {tasks.length}
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {isEnterprise
                ? 'Tarefas da empresa com workflow de aprovação e delegação'
                : 'Suas tarefas pessoais privadas'}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {isEnterprise && (
            <button
              onClick={() => setShowSettingsModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-xl transition-all shadow-xs"
            >
              <Shield size={14} className="text-indigo-600 dark:text-indigo-400" />
              Permissões de Workflow
            </button>
          )}

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-indigo-500/20"
          >
            <Plus size={15} />
            Nova Tarefa
          </button>
        </div>
      </div>

      {/* ── Toolbar de Filtros (Período, Responsável, Prioridade, Busca) ─────── */}
      <div className="p-3 bg-white dark:bg-gray-900/90 border border-gray-200 dark:border-gray-800 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-xs">
        {/* Filtro de Período */}
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
          <Calendar size={13} className="ml-2 text-gray-400 hidden sm:block" />
          {(
            [
              { key: 'all', label: 'Todo o Período' },
              { key: 'today', label: 'Hoje' },
              { key: 'week', label: 'Esta Semana' },
              { key: 'month', label: 'Este Mês' },
            ] as const
          ).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setPeriodFilter(key)}
              className={cn(
                'px-2.5 py-1 text-xs font-medium rounded-lg transition-all',
                periodFilter === key
                  ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 font-bold shadow-xs'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Filtro de Responsável & Prioridade & Busca */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Responsável (se for empresa) */}
          {isEnterprise && (
            <div className="flex items-center gap-1.5">
              <UserIcon size={14} className="text-gray-400" />
              <select
                value={responsibleFilter}
                onChange={(e) => setResponsibleFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-200 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="all">Todos os Responsáveis</option>
                <option value="me">Minhas Tarefas</option>
                {members.map((m) => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.user?.name || m.user?.email || 'Membro'}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Prioridade */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-200 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="all">Todas Prioridades</option>
            {Object.entries(TASK_PRIORITY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>

          {/* Busca por texto */}
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar tarefas..."
              className="pl-7 pr-3 py-1.5 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium w-36 sm:w-48 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Quadro Kanban ─────────────────────────────────────────────────── */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4 flex-1">
          {visibleStatuses.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              label={TASK_STATUS_LABELS[status]}
              tasks={tasksByStatus(status)}
              isOver={overColumn === status}
              onAddTask={() => setShowCreateModal(true)}
            />
          ))}
        </div>

        {/* Drag overlay — card fantasma */}
        <DragOverlay
          dropAnimation={{
            duration: 200,
            easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
          }}
        >
          {activeTask ? (
            <div className="w-72">
              <TaskCardContent task={activeTask} isDragging />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* ── Modal Criar Tarefa ────────────────────────────────────────────── */}
      {showCreateModal && (
        <ModalCriarTarefa
          onClose={() => setShowCreateModal(false)}
          onCriada={(nova) => {
            setTasks((prev) => [nova, ...prev]);
            showToast('Tarefa criada com sucesso!', 'success');
          }}
        />
      )}

      {/* ── Modal Permissões de Workflow ──────────────────────────────────── */}
      {showSettingsModal && currentEnterpriseId && (
        <ModalPermissoesTarefas
          enterpriseId={currentEnterpriseId}
          onClose={() => setShowSettingsModal(false)}
          onSaved={() => {
            carregar();
            showToast('Permissões de workflow atualizadas com sucesso!', 'success');
          }}
        />
      )}
    </div>
  );
}
