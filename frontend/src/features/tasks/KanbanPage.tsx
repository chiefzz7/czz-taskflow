import { useEffect, useState, useCallback } from 'react';
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
import { Columns3, Loader2, GripVertical } from 'lucide-react';
import { taskService } from '../../services/taskService';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import type { Task, TaskStatus } from '../../types/task';
import { TASK_STATUS_ORDER, TASK_STATUS_LABELS, TASK_PRIORITY_LABELS } from '../../types/task';
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

// ── Card de tarefa (conteúdo visual) ─────────────────────────────────────────
function TaskCardContent({ task, isDragging = false }: { task: Task; isDragging?: boolean }) {
  const vence = task.due_at ? new Date(task.due_at) : null;
  const atrasada = vence && vence < new Date() && task.status !== 'done';

  return (
    <div className={cn(
      'bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-3 select-none transition-all',
      isDragging
        ? 'shadow-2xl rotate-1 border-indigo-300 dark:border-indigo-700 opacity-95 scale-[1.02]'
        : 'shadow-sm hover:shadow-md hover:border-gray-300 dark:hover:border-gray-700'
    )}>
      <div className="flex items-start gap-2">
        <div
          className={cn('w-2 h-2 rounded-full flex-shrink-0 mt-1.5', priorityDot[task.priority])}
          title={TASK_PRIORITY_LABELS[task.priority]}
        />
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 flex-1 line-clamp-2 leading-snug">
          {task.title}
        </p>
        <GripVertical
          size={14}
          className="text-gray-300 dark:text-gray-600 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
        />
      </div>
      {task.description && (
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5 ml-4 line-clamp-1">
          {task.description}
        </p>
      )}
      <div className="flex items-center justify-between mt-2 ml-4">
        {vence ? (
          <p className={cn('text-[10px] font-medium', atrasada ? 'text-red-500' : 'text-gray-400 dark:text-gray-500')}>
            {atrasada ? 'Atrasada · ' : ''}
            {vence.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}
          </p>
        ) : <span />}
        <span className={cn(
          'text-[10px] font-medium px-1.5 py-0.5 rounded-full',
          task.priority === 'urgent' ? 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400' :
          task.priority === 'high' ? 'bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-400' :
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
  status, label, tasks, isOver,
}: {
  status: TaskStatus;
  label: string;
  tasks: Task[];
  isOver: boolean;
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
        'flex-shrink-0 w-72 flex flex-col rounded-xl border border-gray-200 dark:border-gray-800 border-t-4 overflow-hidden transition-all',
        columnBorder[status],
        isOver
          ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800 ring-2 ring-indigo-400/30'
          : 'bg-gray-50 dark:bg-gray-900/50'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{label}</span>
          <span className={cn(
            'text-xs px-1.5 py-0.5 rounded-full font-medium',
            isOver
              ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
          )}>
            {tasks.length}
          </span>
        </div>
      </div>

      {/* Cards */}
      <div className={cn(
        'flex-1 px-3 pb-3 space-y-2 min-h-[140px] transition-colors',
        isOver && 'bg-indigo-50/30 dark:bg-indigo-950/10'
      )}>
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => <SortableTaskCard key={task.id} task={task} />)}
        </SortableContext>

        {tasks.length === 0 && (
          <div className={cn(
            'h-20 flex items-center justify-center border-2 border-dashed rounded-lg transition-colors',
            isOver
              ? 'border-indigo-400 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30'
              : 'border-gray-200 dark:border-gray-700'
          )}>
            <p className={cn('text-xs font-medium', isOver ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-600')}>
              {isOver ? 'Soltar aqui' : 'Sem tarefas'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Página Kanban ─────────────────────────────────────────────────────────────
export default function KanbanPage() {
  const { isPersonal, currentEnterpriseId } = useWorkspace();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [overColumn, setOverColumn] = useState<TaskStatus | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const dados = isPersonal
        ? await taskService.listPersonal()
        : currentEnterpriseId ? await taskService.listEnterprise(currentEnterpriseId) : [];
      setTasks(dados);
    } catch { /* silent */ }
    finally { setCarregando(false); }
  }, [isPersonal, currentEnterpriseId]);

  useEffect(() => { carregar(); }, [carregar]);

  // ── Colunas (excluindo arquivadas por padrão) ──────────────────────────────
  const visibleStatuses: TaskStatus[] = TASK_STATUS_ORDER.filter((s) => s !== 'archived');

  const isVisibleStatus = (val: string): val is TaskStatus =>
    (visibleStatuses as string[]).includes(val);

  const tasksByStatus = (status: TaskStatus) => tasks.filter((t) => t.status === status);

  // ── Drag handlers ─────────────────────────────────────────────────────────
  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === event.active.id);
    setActiveTask(task ?? null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    if (!over) { setOverColumn(null); return; }

    // over pode ser uma coluna (id = status) ou um card (id = task.id)
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

    // Determinar o status alvo
    const overId = String(over.id);
    let targetStatus: TaskStatus | null = null;

    if (isVisibleStatus(overId)) {
      targetStatus = overId;
    } else {
      const overTask = tasks.find((t) => t.id === overId);
      targetStatus = overTask?.status ?? null;
    }

    if (!targetStatus || targetStatus === draggedTask.status) return;

    // Optimistic update
    setTasks((prev) => prev.map((t) =>
      t.id === draggedTaskId ? { ...t, status: targetStatus } : t
    ));

    try {
      const atualizada = await taskService.updateStatus(draggedTaskId, targetStatus);
      setTasks((prev) => prev.map((t) => t.id === draggedTaskId ? atualizada : t));
    } catch {
      // Reverter em caso de erro
      setTasks((prev) => prev.map((t) =>
        t.id === draggedTaskId ? { ...t, status: draggedTask.status } : t
      ));
    }
  };

  if (carregando) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 size={24} className="animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 animate-fade-in flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6 flex-shrink-0">
        <Columns3 size={22} className="text-indigo-600 dark:text-indigo-400" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Quadro Kanban</h1>
        <span className="ml-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full">
          {tasks.length} tarefa{tasks.length !== 1 ? 's' : ''}
        </span>
        <span className="ml-auto text-xs text-gray-400 dark:text-gray-500 hidden sm:block">
          Arraste os cards entre colunas para mover tarefas
        </span>
      </div>

      {/* Kanban board */}
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
            />
          ))}
        </div>

        {/* Drag overlay — card fantasma que segue o cursor */}
        <DragOverlay dropAnimation={{
          duration: 200,
          easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
        }}>
          {activeTask ? (
            <div className="w-72">
              <TaskCardContent task={activeTask} isDragging />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
