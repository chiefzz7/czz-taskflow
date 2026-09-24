import { useState, useMemo } from 'react';
import {
  X, AlertCircle, Repeat, Calendar as CalendarIcon,
  Clock, Check, Sparkles
} from 'lucide-react';
import { taskService } from '../../services/taskService';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import type { Task, RecurrenceType, TaskPriority } from '../../types/task';
import { TASK_PRIORITY_LABELS } from '../../types/task';
import { cn } from '../../utils/cn';

interface ModalCriarTarefaProps {
  onClose: () => void;
  onCriada: (t: Task) => void;
  dataInicial?: string | null; // e.g. "2026-10-15"
}

const DIAS_SEMANA = [
  { id: 0, label: 'Seg', full: 'Segunda-feira' },
  { id: 1, label: 'Ter', full: 'Terça-feira' },
  { id: 2, label: 'Qua', full: 'Quarta-feira' },
  { id: 3, label: 'Qui', full: 'Quinta-feira' },
  { id: 4, label: 'Sex', full: 'Sexta-feira' },
  { id: 5, label: 'Sáb', full: 'Sábado' },
  { id: 6, label: 'Dom', full: 'Domingo' },
];

export default function ModalCriarTarefa({ onClose, onCriada, dataInicial }: ModalCriarTarefaProps) {
  const { isPersonal, currentEnterpriseId } = useWorkspace();

  // Basic task fields
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [prioridade, setPrioridade] = useState<TaskPriority>('medium');
  const [vencimento, setVencimento] = useState(dataInicial || '');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  // Recurrence fields
  const [isRecorrente, setIsRecorrente] = useState(false);
  const [tipoRecorrencia, setTipoRecorrencia] = useState<RecurrenceType>('monthly');
  const [intervalo, setIntervalo] = useState<number>(1);
  
  // Daily mode: 'interval' (a cada X dias) or 'days_of_month' (todo dia 1, 10, 15)
  const [modoDiario, setModoDiario] = useState<'interval' | 'days_of_month'>('days_of_month');
  const [diasDoMes, setDiasDoMes] = useState<number[]>([1, 10, 15]);
  
  // Weekly days
  const [diasDaSemana, setDiasDaSemana] = useState<number[]>([0, 2, 4]); // Seg, Qua, Sex

  // Recurrence end condition: 'never' | 'date' | 'count'
  const [tipoFim, setTipoFim] = useState<'never' | 'date' | 'count'>('never');
  const [dataFim, setDataFim] = useState('');
  const [maxOcorrencias, setMaxOcorrencias] = useState<number>(12);

  // Toggle day of week
  const toggleDiaSemana = (id: number) => {
    setDiasDaSemana(prev => {
      const exists = prev.includes(id);
      if (exists) {
        if (prev.length === 1) return prev; // Keep at least one
        return prev.filter(d => d !== id);
      }
      return [...prev, id].sort((a, b) => a - b);
    });
  };

  // Toggle day of month
  const toggleDiaDoMes = (d: number) => {
    setDiasDoMes(prev => {
      const exists = prev.includes(d);
      if (exists) {
        if (prev.length === 1) return prev; // Keep at least one
        return prev.filter(x => x !== d);
      }
      return [...prev, d].sort((a, b) => a - b);
    });
  };

  // Friendly summary
  const resumoRecorrencia = useMemo(() => {
    if (!isRecorrente) return null;

    let texto = '';
    if (tipoRecorrencia === 'daily') {
      if (modoDiario === 'days_of_month') {
        texto = `Todo mês nos dias ${diasDoMes.join(', ')}`;
      } else {
        texto = intervalo === 1 ? 'Todos os dias' : `A cada ${intervalo} dias`;
      }
    } else if (tipoRecorrencia === 'weekly') {
      const nomes = diasDaSemana.map(d => DIAS_SEMANA[d]?.label).join(', ');
      texto = intervalo === 1 
        ? `Toda semana (${nomes})` 
        : `A cada ${intervalo} semanas (${nomes})`;
    } else if (tipoRecorrencia === 'monthly') {
      texto = intervalo === 1 ? 'Todo mês' : `A cada ${intervalo} meses`;
      if (diasDoMes.length > 0) {
        texto += ` no(s) dia(s) ${diasDoMes.join(', ')}`;
      }
    } else if (tipoRecorrencia === 'yearly') {
      texto = intervalo === 1 ? 'Todo ano' : `A cada ${intervalo} anos`;
    }

    if (tipoFim === 'date' && dataFim) {
      const d = new Date(dataFim + 'T00:00:00');
      texto += ` até ${d.toLocaleDateString('pt-BR')}`;
    } else if (tipoFim === 'count' && maxOcorrencias) {
      texto += ` (por ${maxOcorrencias} vezes)`;
    }

    return texto;
  }, [isRecorrente, tipoRecorrencia, modoDiario, diasDoMes, diasDaSemana, intervalo, tipoFim, dataFim, maxOcorrencias]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) return;

    setSalvando(true);
    setErro('');

    try {
      let recurrencePayload = null;

      if (isRecorrente) {
        recurrencePayload = {
          type: tipoRecorrencia,
          interval: intervalo > 0 ? intervalo : 1,
          days_of_week: tipoRecorrencia === 'weekly' ? diasDaSemana : null,
          days_of_month: (tipoRecorrencia === 'monthly' || (tipoRecorrencia === 'daily' && modoDiario === 'days_of_month')) 
            ? diasDoMes 
            : null,
          end_date: tipoFim === 'date' && dataFim ? new Date(dataFim + 'T23:59:59').toISOString() : null,
          max_occurrences: tipoFim === 'count' ? Number(maxOcorrencias) : null,
        };
      }

      const payload = {
        title: titulo.trim(),
        description: descricao.trim() || null,
        priority: prioridade,
        due_at: vencimento ? (vencimento.includes('T') ? new Date(vencimento).toISOString() : new Date(vencimento + 'T12:00:00').toISOString()) : null,
        workspace: isPersonal ? ('personal' as const) : ('enterprise' as const),
        enterprise_id: isPersonal ? null : currentEnterpriseId,
        recurrence: recurrencePayload,
      };

      const tarefa = isPersonal
        ? await taskService.create(payload)
        : await taskService.createEnterprise(currentEnterpriseId!, payload);

      onCriada(tarefa);
      onClose();
    } catch {
      setErro('Falha ao criar tarefa. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 w-full max-w-lg my-8 animate-slide-up flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <CalendarIcon size={17} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Nova Tarefa</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Defina o prazo e configure repetições automáticas</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form id="form-criar-tarefa" onSubmit={handleSubmit} className="px-6 py-4 space-y-4 overflow-y-auto flex-1">
          {erro && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
              <AlertCircle size={15} className="text-red-600 dark:text-red-400 shrink-0" />
              <p className="text-xs text-red-700 dark:text-red-300 font-medium">{erro}</p>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Título da tarefa *
            </label>
            <input
              autoFocus
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: Fechamento contábil, Backup semanal..."
              required
              className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Descrição (opcional)
            </label>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Detalhes ou instruções para a execução..."
              rows={2}
              className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none transition-colors"
            />
          </div>

          {/* Priority & Due Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Prioridade
              </label>
              <select
                value={prioridade}
                onChange={(e) => setPrioridade(e.target.value as TaskPriority)}
                className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              >
                {Object.entries(TASK_PRIORITY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Data de Vencimento
              </label>
              <input
                type="date"
                value={vencimento}
                onChange={(e) => {
                  setVencimento(e.target.value);
                  if (e.target.value) {
                    const parsed = new Date(e.target.value + 'T00:00:00');
                    const dayNum = parsed.getDate();
                    if (!diasDoMes.includes(dayNum)) {
                      setDiasDoMes([dayNum]);
                    }
                  }
                }}
                className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>
          </div>

          {/* ══════════ RECURRENCE ACCORDION / TOGGLE ══════════ */}
          <div className="pt-2 border-t border-gray-200 dark:border-gray-800">
            <div 
              onClick={() => setIsRecorrente(!isRecorrente)}
              className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition-colors border border-gray-200/80 dark:border-gray-700/80"
            >
              <div className="flex items-center gap-2.5">
                <div className={cn(
                  'w-7 h-7 rounded-lg flex items-center justify-center transition-colors',
                  isRecorrente ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                )}>
                  <Repeat size={14} />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-900 dark:text-white">Tornar tarefa recorrente</p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">Repetir automaticamente (diário, semanal, mensal...)</p>
                </div>
              </div>

              {/* Custom switch */}
              <div className={cn(
                'w-9 h-5 rounded-full transition-colors relative flex items-center p-0.5',
                isRecorrente ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-700'
              )}>
                <div className={cn(
                  'w-4 h-4 rounded-full bg-white transition-transform shadow-xs',
                  isRecorrente ? 'translate-x-4' : 'translate-x-0'
                )} />
              </div>
            </div>

            {/* Recurrence Options Panel */}
            {isRecorrente && (
              <div className="mt-3 p-4 bg-indigo-50/40 dark:bg-indigo-950/20 rounded-xl border border-indigo-100 dark:border-indigo-900/50 space-y-4 animate-fade-in">
                
                {/* Frequency buttons */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                    Frequência
                  </label>
                  <div className="grid grid-cols-4 gap-1.5 bg-white dark:bg-gray-900 p-1 rounded-xl border border-gray-200 dark:border-gray-800">
                    {([
                      ['daily', 'Diária'],
                      ['weekly', 'Semanal'],
                      ['monthly', 'Mensal'],
                      ['yearly', 'Anual'],
                    ] as const).map(([type, label]) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setTipoRecorrencia(type)}
                        className={cn(
                          'py-1.5 text-xs font-semibold rounded-lg transition-all',
                          tipoRecorrencia === type
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 1. DAILY CONFIG */}
                {tipoRecorrencia === 'daily' && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-gray-700 dark:text-gray-300">
                        <input
                          type="radio"
                          name="modoDiario"
                          checked={modoDiario === 'days_of_month'}
                          onChange={() => setModoDiario('days_of_month')}
                          className="text-indigo-600 focus:ring-indigo-500"
                        />
                        Dias específicos do mês (ex: dia 1, 10, 15)
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-gray-700 dark:text-gray-300">
                        <input
                          type="radio"
                          name="modoDiario"
                          checked={modoDiario === 'interval'}
                          onChange={() => setModoDiario('interval')}
                          className="text-indigo-600 focus:ring-indigo-500"
                        />
                        A cada X dias
                      </label>
                    </div>

                    {modoDiario === 'interval' ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-600 dark:text-gray-400">Repetir a cada</span>
                        <input
                          type="number"
                          min={1}
                          max={365}
                          value={intervalo}
                          onChange={(e) => setIntervalo(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-16 px-2 py-1 text-sm text-center bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white font-semibold"
                        />
                        <span className="text-xs text-gray-600 dark:text-gray-400">dia(s)</span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-gray-500 dark:text-gray-400">
                            Selecione os dias do mês:
                          </span>
                          <div className="flex items-center gap-1.5 text-[10px]">
                            <button
                              type="button"
                              onClick={() => setDiasDoMes([1, 10, 15])}
                              className="px-2 py-0.5 rounded bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-indigo-600 dark:text-indigo-400 font-semibold"
                            >
                              1, 10 e 15
                            </button>
                            <button
                              type="button"
                              onClick={() => setDiasDoMes([1, 15])}
                              className="px-2 py-0.5 rounded bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-indigo-600 dark:text-indigo-400 font-semibold"
                            >
                              1 e 15
                            </button>
                            <button
                              type="button"
                              onClick={() => setDiasDoMes([5])}
                              className="px-2 py-0.5 rounded bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-indigo-600 dark:text-indigo-400 font-semibold"
                            >
                              Dia 5
                            </button>
                          </div>
                        </div>

                        {/* Grid of days 1 to 31 */}
                        <div className="grid grid-cols-7 gap-1 bg-white dark:bg-gray-900 p-2 rounded-xl border border-gray-200 dark:border-gray-800">
                          {Array.from({ length: 31 }, (_, i) => i + 1).map((dia) => {
                            const isSel = diasDoMes.includes(dia);
                            return (
                              <button
                                key={dia}
                                type="button"
                                onClick={() => toggleDiaDoMes(dia)}
                                className={cn(
                                  'h-7 rounded-lg text-xs font-semibold transition-all flex items-center justify-center',
                                  isSel
                                    ? 'bg-indigo-600 text-white shadow-xs'
                                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                                )}
                              >
                                {dia}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 2. WEEKLY CONFIG */}
                {tipoRecorrencia === 'weekly' && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-600 dark:text-gray-400">Repetir a cada</span>
                      <input
                        type="number"
                        min={1}
                        max={52}
                        value={intervalo}
                        onChange={(e) => setIntervalo(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-16 px-2 py-1 text-sm text-center bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white font-semibold"
                      />
                      <span className="text-xs text-gray-600 dark:text-gray-400">semana(s)</span>
                    </div>

                    <div>
                      <span className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-1.5">
                        Nos dias da semana:
                      </span>
                      <div className="grid grid-cols-7 gap-1">
                        {DIAS_SEMANA.map((d) => {
                          const isSel = diasDaSemana.includes(d.id);
                          return (
                            <button
                              key={d.id}
                              type="button"
                              onClick={() => toggleDiaSemana(d.id)}
                              title={d.full}
                              className={cn(
                                'py-2 rounded-xl text-xs font-bold transition-all text-center',
                                isSel
                                  ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-500/20'
                                  : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-800 hover:border-indigo-300 dark:hover:border-indigo-700'
                              )}
                            >
                              {d.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. MONTHLY CONFIG */}
                {tipoRecorrencia === 'monthly' && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-600 dark:text-gray-400">Repetir a cada</span>
                      <input
                        type="number"
                        min={1}
                        max={12}
                        value={intervalo}
                        onChange={(e) => setIntervalo(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-16 px-2 py-1 text-sm text-center bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white font-semibold"
                      />
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        mês(es) {intervalo === 1 ? '(mensal)' : intervalo === 2 ? '(bimestral)' : intervalo === 3 ? '(trimestral)' : intervalo === 6 ? '(semestral)' : ''}
                      </span>
                    </div>

                    <div>
                      <span className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-1.5">
                        Dia do mês:
                      </span>
                      <div className="grid grid-cols-7 gap-1 bg-white dark:bg-gray-900 p-2 rounded-xl border border-gray-200 dark:border-gray-800 max-h-36 overflow-y-auto">
                        {Array.from({ length: 31 }, (_, i) => i + 1).map((dia) => {
                          const isSel = diasDoMes.includes(dia);
                          return (
                            <button
                              key={dia}
                              type="button"
                              onClick={() => toggleDiaDoMes(dia)}
                              className={cn(
                                'h-7 rounded-lg text-xs font-semibold transition-all flex items-center justify-center',
                                isSel
                                  ? 'bg-indigo-600 text-white shadow-xs'
                                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                              )}
                            >
                              {dia}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. YEARLY CONFIG */}
                {tipoRecorrencia === 'yearly' && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-600 dark:text-gray-400">Repetir a cada</span>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={intervalo}
                      onChange={(e) => setIntervalo(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-16 px-2 py-1 text-sm text-center bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white font-semibold"
                    />
                    <span className="text-xs text-gray-600 dark:text-gray-400">ano(s)</span>
                  </div>
                )}

                {/* END CONDITIONS (Até tal dia...) */}
                <div className="pt-2 border-t border-indigo-100 dark:border-indigo-900/60">
                  <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                    Término da repetição
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-700 dark:text-gray-300">
                      <input
                        type="radio"
                        name="tipoFim"
                        checked={tipoFim === 'never'}
                        onChange={() => setTipoFim('never')}
                        className="text-indigo-600 focus:ring-indigo-500"
                      />
                      Nunca termina (indefinido)
                    </label>

                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-700 dark:text-gray-300 shrink-0">
                        <input
                          type="radio"
                          name="tipoFim"
                          checked={tipoFim === 'date'}
                          onChange={() => setTipoFim('date')}
                          className="text-indigo-600 focus:ring-indigo-500"
                        />
                        Até uma data limite:
                      </label>
                      {tipoFim === 'date' && (
                        <input
                          type="date"
                          value={dataFim}
                          onChange={(e) => setDataFim(e.target.value)}
                          className="px-2 py-1 text-xs bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white"
                        />
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-700 dark:text-gray-300 shrink-0">
                        <input
                          type="radio"
                          name="tipoFim"
                          checked={tipoFim === 'count'}
                          onChange={() => setTipoFim('count')}
                          className="text-indigo-600 focus:ring-indigo-500"
                        />
                        Após número de vezes:
                      </label>
                      {tipoFim === 'count' && (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min={1}
                            max={365}
                            value={maxOcorrencias}
                            onChange={(e) => setMaxOcorrencias(Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-16 px-2 py-1 text-xs text-center bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white"
                          />
                          <span className="text-xs text-gray-500">vezes</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Live preview banner */}
                {resumoRecorrencia && (
                  <div className="flex items-start gap-2 p-2.5 rounded-lg bg-indigo-100/70 dark:bg-indigo-900/40 text-indigo-900 dark:text-indigo-200 text-xs">
                    <Sparkles size={14} className="shrink-0 mt-0.5 text-indigo-600 dark:text-indigo-400" />
                    <div>
                      <span className="font-semibold">Resumo: </span>
                      {resumoRecorrencia}
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>
        </form>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 flex gap-3 justify-end bg-gray-50/50 dark:bg-gray-900/50 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="form-criar-tarefa"
            disabled={salvando || !titulo.trim()}
            className="px-5 py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl transition-all shadow-md shadow-indigo-500/20 flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
          >
            {salvando ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Check size={16} />
            )}
            Criar tarefa
          </button>
        </div>
      </div>
    </div>
  );
}
