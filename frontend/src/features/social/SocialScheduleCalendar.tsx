import { useState, useMemo } from 'react';
import {
  ChevronLeft, ChevronRight, Calendar as CalendarIcon,
  Clock, Share2, CheckCircle2, Eye, Edit2, Plus
} from 'lucide-react';
import type { SocialPost } from '../../types/social';
import {
  PLATFORM_INFO,
  SOCIAL_STATUS_LABELS,
  SOCIAL_STATUS_COLORS,
} from '../../types/social';
import { cn } from '../../utils/cn';

interface SocialScheduleCalendarProps {
  posts: SocialPost[];
  onEditPost: (post: SocialPost) => void;
  onOpenArtPreview: (imageUrl: string, title: string) => void;
  onNewPostWithDate?: (dateStr: string) => void;
}

export default function SocialScheduleCalendar({
  posts,
  onEditPost,
  onOpenArtPreview,
  onNewPostWithDate,
}: SocialScheduleCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());

  // Navegação de mês
  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };
  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };
  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDay(today);
  };

  // Cálculo da matriz do mês
  const { monthDays, monthName, year } = useMemo(() => {
    const y = currentDate.getFullYear();
    const m = currentDate.getMonth();
    const firstDay = new Date(y, m, 1).getDay(); // 0 = Domingo
    const daysInMonth = new Date(y, m + 1, 0).getDate();

    const days: { date: Date; isCurrentMonth: boolean }[] = [];

    // Dias do mês anterior para preencher a primeira semana
    const prevMonthDays = new Date(y, m, 0).getDate();
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({
        date: new Date(y, m - 1, prevMonthDays - i),
        isCurrentMonth: false,
      });
    }

    // Dias do mês atual
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: new Date(y, m, i),
        isCurrentMonth: true,
      });
    }

    // Dias do próximo mês para completar 35 ou 42 células
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        date: new Date(y, m + 1, i),
        isCurrentMonth: false,
      });
    }

    const monthName = currentDate.toLocaleDateString('pt-BR', { month: 'long' });
    return { monthDays: days, monthName: monthName.charAt(0).toUpperCase() + monthName.slice(1), year: y };
  }, [currentDate]);

  // Mapear posts agendados por data "YYYY-MM-DD"
  const postsByDate = useMemo(() => {
    const map: Record<string, SocialPost[]> = {};
    posts.forEach((post) => {
      if (!post.scheduled_at) return;
      const d = new Date(post.scheduled_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!map[key]) map[key] = [];
      map[key].push(post);
    });
    return map;
  }, [posts]);

  // Posts do dia selecionado
  const selectedDayKey = `${selectedDay.getFullYear()}-${String(selectedDay.getMonth() + 1).padStart(2, '0')}-${String(selectedDay.getDate()).padStart(2, '0')}`;
  const selectedDayPosts = postsByDate[selectedDayKey] || [];

  // Próximas postagens agendadas (geral)
  const upcomingPosts = useMemo(() => {
    const now = new Date();
    return posts
      .filter((p) => p.scheduled_at && new Date(p.scheduled_at) >= now)
      .sort((a, b) => new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime())
      .slice(0, 5);
  }, [posts]);

  const weekDayLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendário Mensal (2 colunas em desktop) */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm">
          {/* Topo do Calendário */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white capitalize">
                {monthName} <span className="text-gray-400 font-normal">{year}</span>
              </h2>
              <button
                onClick={goToToday}
                className="text-xs px-2.5 py-1 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
              >
                Hoje
              </button>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={prevMonth}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors"
                title="Mês anterior"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={nextMonth}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors"
                title="Próximo mês"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          {/* Dias da semana */}
          <div className="grid grid-cols-7 mb-2 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">
            {weekDayLabels.map((w) => (
              <div key={w} className="py-2">
                {w}
              </div>
            ))}
          </div>

          {/* Grade de dias */}
          <div className="grid grid-cols-7 gap-1">
            {monthDays.map(({ date, isCurrentMonth }, idx) => {
              const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
              const dayPosts = postsByDate[dateKey] || [];
              const isToday =
                new Date().toDateString() === date.toDateString();
              const isSelected =
                selectedDay.toDateString() === date.toDateString();

              return (
                <div
                  key={idx}
                  onClick={() => setSelectedDay(date)}
                  className={cn(
                    'min-h-[80px] p-1.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between text-left',
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 ring-2 ring-indigo-500/20'
                      : isToday
                      ? 'border-indigo-300 dark:border-indigo-800 bg-indigo-50/20 dark:bg-indigo-950/10'
                      : 'border-gray-100 dark:border-gray-800/80 hover:bg-gray-50 dark:hover:bg-gray-800/40',
                    !isCurrentMonth && 'opacity-35'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        'text-xs font-semibold w-5 h-5 flex items-center justify-center rounded-full',
                        isToday
                          ? 'bg-indigo-600 text-white'
                          : isSelected
                          ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                          : 'text-gray-700 dark:text-gray-300'
                      )}
                    >
                      {date.getDate()}
                    </span>
                    {dayPosts.length > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-full">
                        {dayPosts.length}
                      </span>
                    )}
                  </div>

                  {/* Chips/Pins das redes sociais no dia */}
                  <div className="space-y-1 mt-1 overflow-hidden">
                    {dayPosts.slice(0, 2).map((post) => {
                      const plt = PLATFORM_INFO[post.platform] || PLATFORM_INFO.instagram;
                      return (
                        <div
                          key={post.id}
                          className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 truncate shadow-2xs"
                        >
                          <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', plt.bg)} />
                          <span className="font-medium text-gray-800 dark:text-gray-200 truncate">
                            {post.title}
                          </span>
                        </div>
                      );
                    })}
                    {dayPosts.length > 2 && (
                      <p className="text-[9px] text-gray-400 font-medium pl-1">
                        +{dayPosts.length - 2} mais
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Painel do Dia Selecionado */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800 mb-4">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
                Agendamentos do Dia
              </p>
              <h3 className="text-base font-bold text-gray-900 dark:text-white capitalize">
                {selectedDay.toLocaleDateString('pt-BR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'short',
                })}
              </h3>
            </div>
            {onNewPostWithDate && (
              <button
                onClick={() => onNewPostWithDate(selectedDayKey)}
                className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition-colors flex items-center gap-1 text-xs font-semibold"
                title="Agendar nova publicação neste dia"
              >
                <Plus size={14} /> Agendar
              </button>
            )}
          </div>

          {/* Lista de publicações do dia selecionado */}
          <div className="flex-1 overflow-y-auto space-y-3">
            {selectedDayPosts.length === 0 ? (
              <div className="py-12 text-center text-gray-400 dark:text-gray-500">
                <CalendarIcon size={32} className="mx-auto mb-2 opacity-40" />
                <p className="text-sm font-medium">Nenhuma arte agendada para este dia.</p>
                <p className="text-xs mt-1 text-gray-400">
                  Clique em "Agendar" acima para programar uma publicação.
                </p>
              </div>
            ) : (
              selectedDayPosts.map((post) => {
                const plt = PLATFORM_INFO[post.platform] || PLATFORM_INFO.instagram;
                const statusColor = SOCIAL_STATUS_COLORS[post.status];
                const postTime = post.scheduled_at
                  ? new Date(post.scheduled_at).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '--:--';

                return (
                  <div
                    key={post.id}
                    className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 hover:border-gray-300 dark:hover:border-gray-700 transition-all space-y-2.5"
                  >
                    {/* Header do Card com Horário e Rede */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-gray-800 dark:text-gray-200">
                        <Clock size={13} className="text-indigo-600" />
                        <span>{postTime}</span>
                      </div>
                      <span
                        className={cn(
                          'text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider',
                          plt.badgeClass
                        )}
                      >
                        {plt.label}
                      </span>
                    </div>

                    {/* Arte Thumbnail e Título */}
                    <div className="flex gap-3 items-start">
                      {post.media_url && (
                        <div
                          className="w-16 h-16 rounded-lg overflow-hidden bg-gray-950 flex-shrink-0 cursor-pointer group/thumb relative"
                          onClick={() => onOpenArtPreview(post.media_url!, post.title)}
                        >
                          <img
                            src={post.media_url}
                            alt={post.title}
                            className="w-full h-full object-cover group-hover/thumb:scale-110 transition-transform"
                          />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center text-white">
                            <Eye size={12} />
                          </div>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white leading-snug line-clamp-2">
                          {post.title}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Responsável:{' '}
                          <span className="font-semibold text-gray-700 dark:text-gray-300">
                            {post.responsible_name || 'Todos da Equipe'}
                          </span>
                        </p>
                      </div>
                    </div>

                    {/* Status & Ações */}
                    <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800 text-xs">
                      <span
                        className={cn(
                          'text-[10px] font-semibold px-2 py-0.5 rounded-full',
                          statusColor.badge
                        )}
                      >
                        {SOCIAL_STATUS_LABELS[post.status]}
                      </span>
                      <button
                        onClick={() => onEditPost(post)}
                        className="text-xs text-indigo-600 dark:text-indigo-400 font-medium hover:underline flex items-center gap-1"
                      >
                        <Edit2 size={11} /> Editar
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Próximas Postagens Agendadas (Timeline rápida) */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          <CalendarIcon size={16} className="text-indigo-600" />
          Próximas Postagens no Cronograma
        </h3>
        {upcomingPosts.length === 0 ? (
          <p className="text-xs text-gray-500">Nenhum post futuro programado.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {upcomingPosts.map((post) => {
              const plt = PLATFORM_INFO[post.platform] || PLATFORM_INFO.instagram;
              const dateObj = new Date(post.scheduled_at!);
              return (
                <div
                  key={post.id}
                  onClick={() => onEditPost(post)}
                  className="p-3 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-200 dark:border-gray-700/60 hover:border-indigo-400 transition-all cursor-pointer space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        'text-[9px] font-bold px-1.5 py-0.5 rounded uppercase',
                        plt.badgeClass
                      )}
                    >
                      {plt.label}
                    </span>
                    <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                      {dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-gray-900 dark:text-white line-clamp-2">
                    {post.title}
                  </p>
                  <p className="text-[10px] text-gray-500">
                    {dateObj.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })} ·{' '}
                    {post.responsible_name || 'Equipe'}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
