import { useEffect, useState, useCallback } from 'react';
import { Plus, Search, Loader2, CheckSquare, AlertCircle, Clock, MoreHorizontal, Trash2, CheckCircle2, Circle, Repeat } from 'lucide-react';
import { taskService } from '../../services/taskService';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import type { Task, TaskStatus } from '../../types/task';
import { TASK_STATUS_LABELS, TASK_PRIORITY_LABELS, TASK_STATUS_ORDER } from '../../types/task';
import { cn } from '../../utils/cn';
import ModalCriarTarefa from '../../components/tasks/ModalCriarTarefa';
import { formatRecurrenceLabel } from '../../utils/recurrence';

const priorityColors: Record<string, string> = {
  urgent: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950',
  high: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950',
  medium: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950',
  low: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950',
  none: 'text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800',
};

const statusColors: Record<string, string> = {
  done: 'text-emerald-600 dark:text-emerald-400',
  in_progress: 'text-blue-600 dark:text-blue-400',
  review: 'text-violet-600 dark:text-violet-400',
  todo: 'text-amber-600 dark:text-amber-400',
  backlog: 'text-gray-500 dark:text-gray-400',
  archived: 'text-gray-400 dark:text-gray-600',
};

// ── Linha de Tarefa ───────────────────────────────────────────────────────────
function LinhaTarefa({ task, onMudarStatus, onExcluir }: {
  task: Task;
  onMudarStatus: (id: string, status: TaskStatus) => void;
  onExcluir: (id: string) => void;
}) {
  const [menuAberto, setMenuAberto] = useState(false);
  const concluida = task.status === 'done';
  const vence = task.due_at ? new Date(task.due_at) : null;
  const atrasada = vence && vence < new Date() && !concluida;

  const avancarStatus = () => {
    const proximo: Record<TaskStatus, TaskStatus> = {
      backlog: 'todo', todo: 'in_progress', in_progress: 'review',
      review: 'done', done: 'todo', archived: 'todo',
    };
    onMudarStatus(task.id, proximo[task.status]);
  };

  return (
    <div className="group flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800 last:border-0 transition-colors">
      <button onClick={avancarStatus} className={cn('flex-shrink-0 transition-colors', concluida ? 'text-emerald-500' : 'text-gray-300 dark:text-gray-600 hover:text-indigo-400')}>
        {concluida ? <CheckCircle2 size={18} /> : <Circle size={18} />}
      </button>
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-medium text-gray-900 dark:text-gray-100 truncate', concluida && 'line-through text-gray-400 dark:text-gray-600')}>
          {task.title}
        </p>
        {task.description && <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">{task.description}</p>}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {task.recurrence && (
          <span 
            className="flex items-center gap-1 text-[11px] font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-full"
            title={formatRecurrenceLabel(task.recurrence)}
          >
            <Repeat size={11} />
            <span className="hidden md:inline">{formatRecurrenceLabel(task.recurrence)}</span>
          </span>
        )}
        {vence && (
          <span className={cn('text-xs flex items-center gap-1', atrasada ? 'text-red-500' : 'text-gray-400 dark:text-gray-500')}>
            <Clock size={11} />
            {vence.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}
          </span>
        )}
        <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-full', priorityColors[task.priority])}>
          {TASK_PRIORITY_LABELS[task.priority]}
        </span>
        <span className={cn('hidden sm:inline text-xs font-medium', statusColors[task.status])}>
          {TASK_STATUS_LABELS[task.status]}
        </span>
        <div className="relative">
          <button onClick={() => setMenuAberto(!menuAberto)}
            className="p-1 rounded text-gray-300 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-400 opacity-0 group-hover:opacity-100 transition-all">
            <MoreHorizontal size={16} />
          </button>
          {menuAberto && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuAberto(false)} />
              <div className="absolute right-0 top-7 z-20 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg py-1 w-36 animate-slide-up">
                <button onClick={() => { onExcluir(task.id); setMenuAberto(false); }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950">
                  <Trash2 size={13} /> Excluir
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Página de Tarefas ─────────────────────────────────────────────────────────
export default function TasksPage() {
  const { isPersonal, currentEnterpriseId } = useWorkspace();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [mostrarCriar, setMostrarCriar] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const params = { status: filtroStatus || undefined, search: busca || undefined };
      const dados = isPersonal
        ? await taskService.listPersonal(params)
        : currentEnterpriseId ? await taskService.listEnterprise(currentEnterpriseId, params) : [];
      setTasks(dados);
    } catch { /* silent */ }
    finally { setCarregando(false); }
  }, [isPersonal, currentEnterpriseId, busca, filtroStatus]);

  useEffect(() => { carregar(); }, [carregar]);

  const mudarStatus = async (id: string, status: TaskStatus) => {
    try {
      const atualizada = await taskService.updateStatus(id, status);
      setTasks((prev) => prev.map((t) => t.id === id ? atualizada : t));
    } catch { /* silent */ }
  };

  const excluir = async (id: string) => {
    try {
      await taskService.delete(id);
      setTasks((prev) => prev.filter((t) => t.id !== id));
    } catch { /* silent */ }
  };

  const statusOpcoes = [
    { value: '', label: 'Todos os status' },
    ...TASK_STATUS_ORDER.map((k) => ({ value: k, label: TASK_STATUS_LABELS[k] })),
  ];

  return (
    <div className="p-6 md:p-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <CheckSquare size={22} className="text-indigo-600 dark:text-indigo-400" />
            {isPersonal ? 'Minhas Tarefas' : 'Tarefas da Equipe'}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{tasks.length} tarefa{tasks.length !== 1 ? 's' : ''}</p>
        </div>
        <button id="create-task-btn" onClick={() => setMostrarCriar(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm shadow-indigo-500/20">
          <Plus size={16} /> Nova Tarefa
        </button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={busca} onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar tarefas..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}
          className="px-3 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500">
          {statusOpcoes.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        {carregando ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-indigo-600" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <CheckSquare size={36} className="text-gray-300 dark:text-gray-700 mb-3" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">Nenhuma tarefa encontrada</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              {busca || filtroStatus ? 'Tente ajustar os filtros' : 'Crie sua primeira tarefa para começar'}
            </p>
            {!busca && !filtroStatus && (
              <button onClick={() => setMostrarCriar(true)} className="mt-4 flex items-center gap-1.5 text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
                <Plus size={14} /> Criar tarefa
              </button>
            )}
          </div>
        ) : (
          tasks.map((task) => (
            <LinhaTarefa key={task.id} task={task} onMudarStatus={mudarStatus} onExcluir={excluir} />
          ))
        )}
      </div>

      {mostrarCriar && <ModalCriarTarefa onClose={() => setMostrarCriar(false)} onCriada={(t) => setTasks((p) => [t, ...p])} />}
    </div>
  );
}
