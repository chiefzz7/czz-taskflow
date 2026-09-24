import { useState, useMemo, useCallback, useEffect, JSX } from 'react';
import {
  ChevronLeft, ChevronRight, Calendar as CalendarIcon,
  Clock, AlertCircle, CheckCircle2, LayoutGrid,
  List, CalendarDays, Flame, ArrowUp, Minus, Filter, Loader2,
  Plus, Repeat, Sparkles
} from 'lucide-react';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { taskService } from '../../services/taskService';
import { cn } from '../../utils/cn';
import type { Task, TaskStatus, TaskPriority } from '../../types/task';
import { TASK_STATUS_LABELS, TASK_PRIORITY_LABELS } from '../../types/task';
import ModalCriarTarefa from '../../components/tasks/ModalCriarTarefa';
import { projectRecurringTasks, formatRecurrenceLabel } from '../../utils/recurrence';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const dateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const sameDay = (a: Date, b: Date) => dateKey(a) === dateKey(b);

const isoToDate = (iso: string | null): Date | null =>
  iso ? new Date(iso) : null;

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

const fmtShort = (d: Date) =>
  d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });

const WEEK_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
const MONTH_FULL_LABELS = [
  'Janeiro','Fevereiro','Marco','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'
];

// ─── Status styling ───────────────────────────────────────────────────────────
const STATUS_STYLE: Record<TaskStatus, { dot: string; badge: string; label: string }> = {
  backlog:     { dot: 'bg-gray-400',    badge: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400', label: 'Backlog' },
  todo:        { dot: 'bg-blue-400',    badge: 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400', label: 'A Fazer' },
  in_progress: { dot: 'bg-amber-400',   badge: 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400', label: 'Em Andamento' },
  review:      { dot: 'bg-purple-400',  badge: 'bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-400', label: 'Em Revisao' },
  done:        { dot: 'bg-green-400',   badge: 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400', label: 'Concluida' },
  archived:    { dot: 'bg-slate-300',   badge: 'bg-slate-100 dark:bg-slate-800 text-slate-500', label: 'Arquivada' },
};

const PRIORITY_ICON: Record<TaskPriority, JSX.Element> = {
  none:   <Minus size={11} className="text-gray-400" />,
  low:    <ArrowUp size={11} className="text-blue-400 rotate-180" />,
  medium: <ArrowUp size={11} className="text-amber-400" />,
  high:   <ArrowUp size={11} className="text-orange-500" />,
  urgent: <Flame size={11} className="text-red-500" />,
};

// ─── Task Card (shared) ───────────────────────────────────────────────────────
function TaskChip({ task, compact = false }: { task: Task; compact?: boolean }) {
  const st = STATUS_STYLE[task.status];
  return (
    <div
      className={cn(
        'flex items-center gap-1.5 rounded-lg border text-left transition-all cursor-default group',
        compact
          ? 'px-1.5 py-1 text-[10px] bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800'
          : 'px-2.5 py-2 text-xs bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-sm'
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', st.dot)} />
      <span className="font-medium text-gray-800 dark:text-gray-200 truncate leading-snug flex-1">
        {task.title}
      </span>
      {task.recurrence && (
        <span title={formatRecurrenceLabel(task.recurrence)} className="flex items-center">
          <Repeat size={10} className="text-indigo-500 shrink-0" />
        </span>
      )}
    </div>
  );
}

// ─── Task Detail Card ─────────────────────────────────────────────────────────
function TaskDetailCard({ task }: { task: Task }) {
  const st = STATUS_STYLE[task.status];
  const hasTime = !!task.due_at;
  const recLabel = formatRecurrenceLabel(task.recurrence);

  return (
    <div className="p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-md transition-all space-y-2.5 group">
      <div className="flex items-start gap-2 justify-between">
        <div className="flex items-start gap-1.5 flex-1 min-w-0">
          <span className={cn('w-2 h-2 rounded-full shrink-0 mt-1', st.dot)} />
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white leading-snug line-clamp-2">
              {task.title}
            </p>
            {recLabel && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600 dark:text-indigo-400 mt-0.5">
                <Repeat size={11} /> {recLabel}
              </span>
            )}
          </div>
        </div>
        <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0', st.badge)}>
          {st.label}
        </span>
      </div>
      {task.description && (
        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed pl-3.5">
          {task.description}
        </p>
      )}
      <div className="flex items-center gap-3 pl-3.5 pt-1 border-t border-gray-100 dark:border-gray-800 flex-wrap">
        <span className="flex items-center gap-1 text-[11px] text-gray-500">
          {PRIORITY_ICON[task.priority]}
          {TASK_PRIORITY_LABELS[task.priority]}
        </span>
        {hasTime && (
          <span className="flex items-center gap-1 text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
            <Clock size={10} />
            {fmtTime(task.due_at!)}
          </span>
        )}
        {task.status === 'done' && (
          <span className="flex items-center gap-1 text-[11px] text-green-600 font-medium ml-auto">
            <CheckCircle2 size={10} /> Concluida
          </span>
        )}
      </div>
    </div>
  );
}

// ─── VIEW TYPES ───────────────────────────────────────────────────────────────
type ViewMode = 'month' | 'week' | 'day';

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function CalendarPage() {
  const { isPersonal, currentEnterpriseId } = useWorkspace();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [current, setCurrent] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');

  // Modal create task
  const [mostrarCriar, setMostrarCriar] = useState(false);
  const [dataCriacaoInicial, setDataCriacaoInicial] = useState<string | null>(null);

  // ── Load tasks ──────────────────────────────────────────────────────────────
  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const data = isPersonal
        ? await taskService.listPersonal({})
        : currentEnterpriseId
        ? await taskService.listEnterprise(currentEnterpriseId, {})
        : [];
      setTasks(data);
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, [isPersonal, currentEnterpriseId]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  // ── Projected tasks with recurring occurrences expanded ────────────────────
  const visibleTasks = useMemo(() => {
    // Project across current view window (prev month to next 2 months)
    const startRange = new Date(current.getFullYear(), current.getMonth() - 1, 1);
    const endRange = new Date(current.getFullYear(), current.getMonth() + 3, 0);
    return projectRecurringTasks(tasks, startRange, endRange);
  }, [tasks, current]);

  // ── Filtered tasks ──────────────────────────────────────────────────────────
  const filteredTasks = useMemo(
    () => visibleTasks.filter(t => statusFilter === 'all' || t.status === statusFilter),
    [visibleTasks, statusFilter]
  );

  // ── Tasks by date key ───────────────────────────────────────────────────────
  const tasksByDate = useMemo(() => {
    const map: Record<string, Task[]> = {};
    filteredTasks.forEach(t => {
      const d = isoToDate(t.due_at) || isoToDate(t.planned_start_at);
      if (!d) return;
      const k = dateKey(d);
      (map[k] = map[k] || []).push(t);
    });
    return map;
  }, [filteredTasks]);

  // ── Navigation ──────────────────────────────────────────────────────────────
  const navigate = useCallback((dir: -1 | 1) => {
    setCurrent(prev => {
      const d = new Date(prev);
      if (viewMode === 'month') d.setMonth(d.getMonth() + dir);
      else if (viewMode === 'week') d.setDate(d.getDate() + dir * 7);
      else d.setDate(d.getDate() + dir);
      return d;
    });
  }, [viewMode]);

  const goToday = () => {
    const t = new Date();
    setCurrent(t);
    setSelectedDay(t);
  };

  // ── Month grid ──────────────────────────────────────────────────────────────
  const monthGrid = useMemo(() => {
    const y = current.getFullYear();
    const m = current.getMonth();
    const firstDay = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const prevDays = new Date(y, m, 0).getDate();
    const days: { date: Date; cur: boolean }[] = [];
    for (let i = firstDay - 1; i >= 0; i--) days.push({ date: new Date(y, m - 1, prevDays - i), cur: false });
    for (let i = 1; i <= daysInMonth; i++) days.push({ date: new Date(y, m, i), cur: true });
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) days.push({ date: new Date(y, m + 1, i), cur: false });
    return days;
  }, [current]);

  // ── Week days (current week) ─────────────────────────────────────────────────
  const weekDays = useMemo(() => {
    const d = new Date(current);
    const day = d.getDay();
    d.setDate(d.getDate() - day);
    return Array.from({ length: 7 }, (_, i) => {
      const nd = new Date(d);
      nd.setDate(d.getDate() + i);
      return nd;
    });
  }, [current]);

  // ── Day tasks ───────────────────────────────────────────────────────────────
  const dayTasks = useMemo(() => {
    const key = dateKey(selectedDay);
    return tasksByDate[key] || [];
  }, [tasksByDate, selectedDay]);

  // ── Header label ───────────────────────────────────────────────────────────
  const headerLabel = useMemo(() => {
    if (viewMode === 'month') return `${MONTH_FULL_LABELS[current.getMonth()]} ${current.getFullYear()}`;
    if (viewMode === 'week') {
      const start = weekDays[0];
      const end = weekDays[6];
      if (start.getMonth() === end.getMonth())
        return `${start.getDate()} - ${end.getDate()} de ${MONTH_FULL_LABELS[start.getMonth()]} ${start.getFullYear()}`;
      return `${fmtShort(start)} - ${fmtShort(end)} ${end.getFullYear()}`;
    }
    return selectedDay.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }, [viewMode, current, weekDays, selectedDay]);

  // ── Stats ───────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = filteredTasks.length;
    const done = filteredTasks.filter(t => t.status === 'done').length;
    const overdue = filteredTasks.filter(t => t.due_at && new Date(t.due_at) < new Date() && t.status !== 'done').length;
    const today = filteredTasks.filter(t => {
      const d = isoToDate(t.due_at);
      return d && sameDay(d, new Date());
    }).length;
    return { total, done, overdue, today };
  }, [filteredTasks]);

  return (
    <div className="flex flex-col h-full gap-0">
      {/* ── Topbar ─────────────────────────────────────────────────────────── */}
      <div className="px-6 pt-6 pb-4 flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-500/20">
              <CalendarIcon size={15} className="text-white" />
            </div>
            Calendario de Tarefas
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 ml-10">
            Organize e visualize suas tarefas por data
          </p>
        </div>

        {/* Stats pills & Action button */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950 rounded-full text-xs font-semibold text-indigo-700 dark:text-indigo-300">
            <CalendarIcon size={12} /> {stats.today} hoje
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 dark:bg-green-950 rounded-full text-xs font-semibold text-green-700 dark:text-green-300">
            <CheckCircle2 size={12} /> {stats.done} concluidas
          </div>
          {stats.overdue > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 dark:bg-red-950 rounded-full text-xs font-semibold text-red-700 dark:text-red-300">
              <AlertCircle size={12} /> {stats.overdue} atrasadas
            </div>
          )}

          <button
            onClick={() => {
              setDataCriacaoInicial(dateKey(new Date()));
              setMostrarCriar(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-500/20 transition-all cursor-pointer ml-1"
          >
            <Plus size={14} /> Nova Tarefa
          </button>
        </div>
      </div>

      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <div className="px-6 py-3 flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-gray-950 border-b border-gray-100 dark:border-gray-800/60">
        {/* Navigation */}
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors">
            <ChevronLeft size={18} />
          </button>
          <button onClick={goToday} className="px-3 py-1 text-xs font-semibold bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg transition-colors">
            Hoje
          </button>
          <button onClick={() => navigate(1)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors">
            <ChevronRight size={18} />
          </button>
          <span className="text-sm font-semibold text-gray-900 dark:text-white capitalize ml-1">{headerLabel}</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Status filter */}
          <div className="flex items-center gap-1.5">
            <Filter size={13} className="text-gray-400" />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as TaskStatus | 'all')}
              className="text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Todos os status</option>
              {(Object.keys(TASK_STATUS_LABELS) as TaskStatus[]).map(s => (
                <option key={s} value={s}>{TASK_STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>

          {/* View mode switcher */}
          <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-xl p-1 gap-0.5">
            {([['month', <LayoutGrid size={14} />, 'Mensal'], ['week', <CalendarDays size={14} />, 'Semanal'], ['day', <List size={14} />, 'Diario']] as const).map(
              ([mode, icon, label]) => (
                <button
                  key={mode}
                  onClick={() => { setViewMode(mode); if (mode === 'day') setSelectedDay(new Date(current)); }}
                  className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all',
                    viewMode === mode
                      ? 'bg-white dark:bg-gray-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                  )}
                >
                  {icon} {label}
                </button>
              )
            )}
          </div>
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto p-6">

        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="text-indigo-500 animate-spin" />
          </div>
        )}

        {/* ══════════════ MONTHLY VIEW ══════════════ */}
        {!loading && viewMode === 'month' && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
            {/* Day-of-week header */}
            <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-800">
              {WEEK_LABELS.map(w => (
                <div key={w} className="py-3 text-center text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                  {w}
                </div>
              ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 divide-x divide-y divide-gray-100 dark:divide-gray-800">
              {monthGrid.map(({ date, cur }, idx) => {
                const k = dateKey(date);
                const dayTasks = tasksByDate[k] || [];
                const isToday = sameDay(date, new Date());
                const isSelected = sameDay(date, selectedDay);
                const doneCnt = dayTasks.filter(t => t.status === 'done').length;
                const overdueCnt = dayTasks.filter(t => t.due_at && new Date(t.due_at) < new Date() && t.status !== 'done').length;

                return (
                  <div
                    key={idx}
                    onClick={() => { setSelectedDay(date); }}
                    className={cn(
                      'min-h-[110px] p-2 flex flex-col gap-1 cursor-pointer transition-colors',
                      !cur && 'opacity-40',
                      isSelected && 'bg-indigo-50/60 dark:bg-indigo-950/20',
                      !isSelected && 'hover:bg-gray-50 dark:hover:bg-gray-800/40',
                    )}
                  >
                    {/* Day number */}
                    <div className="flex items-center justify-between mb-0.5">
                      <span className={cn(
                        'text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full',
                        isToday ? 'bg-indigo-600 text-white' : isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-300'
                      )}>
                        {date.getDate()}
                      </span>
                      <div className="flex items-center gap-1">
                        {overdueCnt > 0 && <span className="w-1.5 h-1.5 rounded-full bg-red-500" title="Atrasadas" />}
                        {doneCnt > 0 && <span className="w-1.5 h-1.5 rounded-full bg-green-500" title="Concluidas" />}
                        {dayTasks.length > 0 && (
                          <span className="text-[10px] font-bold text-gray-400">{dayTasks.length}</span>
                        )}
                      </div>
                    </div>

                    {/* Task chips */}
                    <div className="space-y-0.5 flex-1 overflow-hidden">
                      {dayTasks.slice(0, 3).map(t => (
                        <TaskChip key={t.id} task={t} compact />
                      ))}
                      {dayTasks.length > 3 && (
                        <p className="text-[9px] text-gray-400 font-medium pl-1">+{dayTasks.length - 3} mais</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ══════════════ WEEKLY VIEW ══════════════ */}
        {!loading && viewMode === 'week' && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
            {/* Week header */}
            <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-800">
              {weekDays.map((d, i) => {
                const isToday = sameDay(d, new Date());
                const isSelected = sameDay(d, selectedDay);
                const cnt = (tasksByDate[dateKey(d)] || []).length;
                return (
                  <div
                    key={i}
                    onClick={() => setSelectedDay(d)}
                    className={cn(
                      'py-3 px-2 text-center cursor-pointer transition-colors border-r border-gray-100 dark:border-gray-800 last:border-r-0',
                      isSelected ? 'bg-indigo-50 dark:bg-indigo-950/30' : 'hover:bg-gray-50 dark:hover:bg-gray-800/40'
                    )}
                  >
                    <p className="text-[10px] font-semibold text-gray-400 uppercase">{WEEK_LABELS[d.getDay()]}</p>
                    <span className={cn(
                      'text-lg font-bold w-9 h-9 flex items-center justify-center rounded-full mx-auto mt-0.5',
                      isToday ? 'bg-indigo-600 text-white' : isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-800 dark:text-gray-200'
                    )}>
                      {d.getDate()}
                    </span>
                    {cnt > 0 && (
                      <div className="flex justify-center mt-1">
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-full">{cnt}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Week columns */}
            <div className="grid grid-cols-7 divide-x divide-gray-100 dark:divide-gray-800 min-h-[500px]">
              {weekDays.map((d, i) => {
                const dayTaskList = tasksByDate[dateKey(d)] || [];
                const isToday = sameDay(d, new Date());
                return (
                  <div
                    key={i}
                    className={cn(
                      'p-2 space-y-1.5',
                      isToday && 'bg-indigo-50/30 dark:bg-indigo-950/10'
                    )}
                  >
                    {dayTaskList.length === 0 ? (
                      <p className="text-[10px] text-gray-300 dark:text-gray-700 text-center mt-6">—</p>
                    ) : (
                      dayTaskList.map(t => <TaskChip key={t.id} task={t} compact />)
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ══════════════ DAILY VIEW ══════════════ */}
        {!loading && viewMode === 'day' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Mini month nav */}
            <div className="lg:col-span-1 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-4">
              <div className="flex items-center justify-between mb-4">
                <button onClick={() => setCurrent(new Date(current.getFullYear(), current.getMonth() - 1, 1))}
                  className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors">
                  <ChevronLeft size={15} />
                </button>
                <span className="text-sm font-bold text-gray-900 dark:text-white capitalize">
                  {MONTH_FULL_LABELS[current.getMonth()]} {current.getFullYear()}
                </span>
                <button onClick={() => setCurrent(new Date(current.getFullYear(), current.getMonth() + 1, 1))}
                  className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors">
                  <ChevronRight size={15} />
                </button>
              </div>
              <div className="grid grid-cols-7 mb-1">
                {WEEK_LABELS.map(w => (
                  <div key={w} className="text-center text-[9px] font-bold text-gray-400 uppercase py-1">{w}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-0.5">
                {monthGrid.map(({ date, cur }, idx) => {
                  const k = dateKey(date);
                  const cnt = (tasksByDate[k] || []).length;
                  const isToday = sameDay(date, new Date());
                  const isSel = sameDay(date, selectedDay);
                  return (
                    <button
                      key={idx}
                      onClick={() => { setSelectedDay(date); setCurrent(date); }}
                      className={cn(
                        'relative flex flex-col items-center justify-center h-8 w-full rounded-lg text-xs font-semibold transition-all',
                        !cur && 'opacity-30',
                        isSel ? 'bg-indigo-600 text-white' : isToday ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                      )}
                    >
                      {date.getDate()}
                      {cnt > 0 && !isSel && (
                        <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-indigo-400" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Status legend */}
              <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-800 space-y-2">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Legenda</p>
                {(Object.entries(STATUS_STYLE) as [TaskStatus, typeof STATUS_STYLE[TaskStatus]][]).map(([k, v]) => {
                  const cnt = filteredTasks.filter(t => t.status === k).length;
                  if (cnt === 0) return null;
                  return (
                    <div key={k} className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className={cn('w-2 h-2 rounded-full', v.dot)} />
                        <span className="text-xs text-gray-600 dark:text-gray-400">{v.label}</span>
                      </div>
                      <span className="text-[10px] font-bold text-gray-400">{cnt}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Day detail */}
            <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col">
              <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Tarefas do dia</p>
                  <h2 className="text-base font-bold text-gray-900 dark:text-white capitalize mt-0.5">
                    {selectedDay.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  {dayTasks.length > 0 && (
                    <span className="text-xs font-bold px-3 py-1 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 rounded-full">
                      {dayTasks.length} tarefa{dayTasks.length !== 1 ? 's' : ''}
                    </span>
                  )}
                  <button
                    onClick={() => {
                      setDataCriacaoInicial(dateKey(selectedDay));
                      setMostrarCriar(true);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 rounded-lg transition-colors cursor-pointer"
                  >
                    <Plus size={13} /> Adicionar
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-5">
                {dayTasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full py-16 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                      <CalendarIcon size={28} className="text-gray-400" />
                    </div>
                    <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Nenhuma tarefa para este dia</p>
                    <button
                      onClick={() => {
                        setDataCriacaoInicial(dateKey(selectedDay));
                        setMostrarCriar(true);
                      }}
                      className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-sm cursor-pointer"
                    >
                      <Plus size={13} /> Criar tarefa para este dia
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Group by status */}
                    {(['in_progress', 'todo', 'review', 'backlog', 'done', 'archived'] as TaskStatus[]).map(status => {
                      const group = dayTasks.filter(t => t.status === status);
                      if (group.length === 0) return null;
                      const st = STATUS_STYLE[status];
                      return (
                        <div key={status}>
                          <div className="flex items-center gap-2 mb-2">
                            <span className={cn('w-2 h-2 rounded-full', st.dot)} />
                            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{st.label}</span>
                            <span className="text-xs text-gray-400">({group.length})</span>
                          </div>
                          <div className="space-y-2 pl-3.5">
                            {group.map(t => <TaskDetailCard key={t.id} task={t} />)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal Criar Tarefa */}
      {mostrarCriar && (
        <ModalCriarTarefa
          onClose={() => setMostrarCriar(false)}
          onCriada={(nova) => {
            setTasks(prev => [nova, ...prev]);
          }}
          dataInicial={dataCriacaoInicial}
        />
      )}
    </div>
  );
}
