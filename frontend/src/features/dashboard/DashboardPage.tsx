import { useEffect, useState } from 'react';
import { CheckCircle2, Clock, AlertTriangle, ListTodo, TrendingUp, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { dashboardService } from '../../services/dashboardService';
import type { PersonalDashboard, EnterpriseDashboard } from '../../types/dashboard';
import { cn } from '../../utils/cn';

function StatCard({ label, value, icon: Icon, color, sub }: {
  label: string; value: number | string; icon: React.ElementType;
  color: string; sub?: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 flex items-start gap-4 hover:shadow-sm transition-shadow">
      <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0', color)}>
        <Icon size={20} className="text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
        {sub && <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function StatusBar({ data }: { data: { status: string; count: number }[] }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  const colors: Record<string, string> = {
    done: 'bg-emerald-500',
    in_progress: 'bg-blue-500',
    review: 'bg-violet-500',
    todo: 'bg-amber-400',
    backlog: 'bg-gray-300 dark:bg-gray-600',
    archived: 'bg-gray-200 dark:bg-gray-700',
  };
  const labels: Record<string, string> = {
    done: 'Concluída', in_progress: 'Em Andamento', review: 'Em Revisão',
    todo: 'A Fazer', backlog: 'Backlog', archived: 'Arquivada',
  };
  if (!total) return <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full" />;
  return (
    <>
      <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
        {data.map((d) => (
          <div
            key={d.status}
            className={cn('rounded-full transition-all', colors[d.status] ?? 'bg-gray-400')}
            style={{ flex: d.count / total }}
            title={`${labels[d.status] ?? d.status}: ${d.count}`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-3 mt-3">
        {data.map((s) => (
          <div key={s.status} className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <span className="font-medium text-gray-700 dark:text-gray-300">{labels[s.status] ?? s.status}</span>
            <span className="text-gray-400">·</span>
            <span>{s.count}</span>
          </div>
        ))}
      </div>
    </>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { isPersonal, currentEnterpriseId } = useWorkspace();
  const [data, setData] = useState<PersonalDashboard | EnterpriseDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setIsLoading(true);
    setError('');
    const fetch = isPersonal
      ? dashboardService.getPersonal()
      : dashboardService.getEnterprise(currentEnterpriseId!);
    fetch
      .then(setData)
      .catch(() => setError('Falha ao carregar dados do painel'))
      .finally(() => setIsLoading(false));
  }, [isPersonal, currentEnterpriseId]);

  if (isLoading) {
    return (
      <div className="p-6 md:p-8 space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded-lg" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-gray-200 dark:bg-gray-800 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 md:p-8 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertTriangle size={40} className="text-amber-500 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-400">{error || 'Nenhum dado disponível'}</p>
          {!isPersonal && !currentEnterpriseId && (
            <Link to="/enterprise" className="mt-4 inline-flex items-center gap-1 text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
              Selecionar uma empresa <ArrowRight size={14} />
            </Link>
          )}
        </div>
      </div>
    );
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 17 ? 'Boa tarde' : 'Boa noite';

  return (
    <div className="p-6 md:p-8 space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {greeting}, {user?.name?.split(' ')[0]} 👋
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
          {isPersonal ? 'Seu painel de tarefas pessoais' : 'Painel da empresa'} de hoje
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total de Tarefas" value={data.total_tasks} icon={ListTodo} color="bg-indigo-500" />
        <StatCard label="Em Andamento" value={data.in_progress_tasks} icon={Clock} color="bg-blue-500" />
        <StatCard label="Concluídas" value={data.completed_tasks} icon={CheckCircle2} color="bg-emerald-500"
          sub={`${data.completion_rate}% de conclusão`} />
        <StatCard label="Atrasadas" value={data.overdue_tasks} icon={AlertTriangle} color={data.overdue_tasks > 0 ? 'bg-red-500' : 'bg-gray-400'} />
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Distribuição por Status</h2>
          <span className="text-xs text-gray-500 dark:text-gray-400">{data.total_tasks} total</span>
        </div>
        <StatusBar data={data.by_status} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Próximas a Vencer</h2>
            <Link to="/tasks" className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1">
              Ver todas <ArrowRight size={12} />
            </Link>
          </div>
          {data.upcoming_due.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">Nenhuma tarefa próxima do vencimento</p>
          ) : (
            <ul className="space-y-3">
              {data.upcoming_due.map((t) => {
                const due = t.due_at ? new Date(t.due_at) : null;
                const isOverdue = due && due < new Date();
                const priorityPt: Record<string, string> = { urgent: 'urgente', high: 'alta', medium: 'média', low: 'baixa', none: 'nenhuma' };
                return (
                  <li key={t.id} className="flex items-center gap-3">
                    <div className={cn('w-2 h-2 rounded-full flex-shrink-0', isOverdue ? 'bg-red-500' : 'bg-amber-400')} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 dark:text-gray-200 truncate font-medium">{t.title}</p>
                      {due && (
                        <p className={cn('text-xs', isOverdue ? 'text-red-500' : 'text-gray-400 dark:text-gray-500')}>
                          {isOverdue ? 'Atrasada · ' : 'Vence '}
                          {due.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}
                        </p>
                      )}
                    </div>
                    <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-full capitalize',
                      t.priority === 'urgent' ? 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300' :
                      t.priority === 'high' ? 'bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300' :
                      'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                    )}>
                      {priorityPt[t.priority ?? 'none']}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Concluídas Recentemente</h2>
            <TrendingUp size={16} className="text-emerald-500" />
          </div>
          {data.recently_completed.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">Nenhuma tarefa concluída ainda</p>
          ) : (
            <ul className="space-y-3">
              {data.recently_completed.map((t) => (
                <li key={t.id} className="flex items-center gap-3">
                  <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 dark:text-gray-200 truncate font-medium">{t.title}</p>
                    {t.completed_at && (
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        {new Date(t.completed_at).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
