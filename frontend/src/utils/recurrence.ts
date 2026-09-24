import type { Recurrence, Task } from '../types/task';

export const DOW_SHORT_NAMES = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

/**
 * Returns human-readable label in Portuguese describing the recurrence.
 */
export function formatRecurrenceLabel(rec: Recurrence | null | undefined): string {
  if (!rec) return '';

  let main = '';
  const interval = rec.interval || 1;

  if (rec.days_of_month && rec.days_of_month.length > 0) {
    const daysStr = rec.days_of_month.join(', ');
    if (rec.type === 'monthly' && interval > 1) {
      main = `A cada ${interval} meses nos dias ${daysStr}`;
    } else {
      main = `Todo mês nos dias ${daysStr}`;
    }
  } else if (rec.type === 'daily') {
    main = interval === 1 ? 'Diariamente' : `A cada ${interval} dias`;
  } else if (rec.type === 'weekly') {
    if (rec.days_of_week && rec.days_of_week.length > 0) {
      const dows = rec.days_of_week.map(d => DOW_SHORT_NAMES[d] || `${d}`).join(', ');
      main = interval === 1 ? `Semanal (${dows})` : `A cada ${interval} semanas (${dows})`;
    } else {
      main = interval === 1 ? 'Semanalmente' : `A cada ${interval} semanas`;
    }
  } else if (rec.type === 'monthly') {
    main = interval === 1 ? 'Mensalmente' : `A cada ${interval} meses`;
  } else if (rec.type === 'yearly') {
    main = interval === 1 ? 'Anualmente' : `A cada ${interval} anos`;
  }

  const extras: string[] = [];
  if (rec.end_date) {
    const end = new Date(rec.end_date);
    extras.push(`até ${end.toLocaleDateString('pt-BR')}`);
  }
  if (rec.max_occurrences) {
    extras.push(`máx. ${rec.max_occurrences}x`);
  }

  return extras.length > 0 ? `${main} (${extras.join(', ')})` : main;
}

/**
 * Calculates next date for an occurrence.
 * dows: 0 = Mon, 6 = Sun
 */
function getNextOccurrence(rec: Recurrence, fromDate: Date): Date | null {
  const interval = Math.max(rec.interval || 1, 1);
  const next = new Date(fromDate.getTime());

  // 1. Specific days of month
  if (rec.days_of_month && rec.days_of_month.length > 0) {
    const sorted = [...rec.days_of_month].sort((a, b) => a - b);
    const curDay = next.getDate();
    const candidate = sorted.find(d => d > curDay);

    if (candidate) {
      const maxDays = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
      next.setDate(Math.min(candidate, maxDays));
      return next;
    } else {
      // Roll over to next month
      const monthsToAdd = rec.type === 'monthly' ? interval : 1;
      next.setMonth(next.getMonth() + monthsToAdd);
      const maxDays = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
      next.setDate(Math.min(sorted[0], maxDays));
      return next;
    }
  }

  // 2. Daily
  if (rec.type === 'daily') {
    next.setDate(next.getDate() + interval);
    return next;
  }

  // 3. Weekly
  if (rec.type === 'weekly') {
    if (rec.days_of_week && rec.days_of_week.length > 0) {
      const sorted = [...rec.days_of_week].sort((a, b) => a - b);
      // JS getDay(): 0 is Sunday, 1 is Monday ... 6 is Saturday
      // Convert to 0 = Mon, 6 = Sun:
      const jsDay = next.getDay();
      const curDow = jsDay === 0 ? 6 : jsDay - 1;

      const nextDow = sorted.find(d => d > curDow);
      if (nextDow !== undefined) {
        next.setDate(next.getDate() + (nextDow - curDow));
        return next;
      } else {
        const daysToNextWeek = (7 - curDow) + (interval - 1) * 7 + sorted[0];
        next.setDate(next.getDate() + daysToNextWeek);
        return next;
      }
    } else {
      next.setDate(next.getDate() + interval * 7);
      return next;
    }
  }

  // 4. Monthly
  if (rec.type === 'monthly') {
    const day = next.getDate();
    next.setMonth(next.getMonth() + interval);
    const maxDays = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
    next.setDate(Math.min(day, maxDays));
    return next;
  }

  // 5. Yearly
  if (rec.type === 'yearly') {
    next.setFullYear(next.getFullYear() + interval);
    return next;
  }

  return null;
}

/**
 * Projects recurring tasks within a given date range so the calendar
 * shows all scheduled occurrences seamlessly.
 */
export function projectRecurringTasks(tasks: Task[], startRange: Date, endRange: Date): Task[] {
  const result: Task[] = [];
  const startTs = startRange.getTime();
  const endTs = endRange.getTime();

  for (const task of tasks) {
    result.push(task);

    if (!task.recurrence) continue;

    const baseIso = task.due_at || task.planned_start_at || task.created_at;
    if (!baseIso) continue;

    const baseDate = new Date(baseIso);
    const endDateLimit = task.recurrence.end_date ? new Date(task.recurrence.end_date).getTime() : Infinity;
    const maxOcc = task.recurrence.max_occurrences || 150;

    let curr = new Date(baseDate.getTime());
    let occCount = 1;

    // Advance occurrences
    while (occCount < maxOcc) {
      const nextDate = getNextOccurrence(task.recurrence, curr);
      if (!nextDate) break;

      const nextTs = nextDate.getTime();
      if (nextTs > endDateLimit || nextTs > endTs) break;

      occCount++;
      curr = nextDate;

      // If within visible calendar window and after base date
      if (nextTs >= startTs && nextTs <= endTs && nextTs !== baseDate.getTime()) {
        const dateKeyStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}`;
        
        result.push({
          ...task,
          id: `${task.id}__rec__${dateKeyStr}`,
          due_at: nextDate.toISOString(),
          status: task.status === 'done' ? 'todo' : task.status, // future occurrences are todo
          is_recurrence_instance: true,
        });
      }
    }
  }

  return result;
}
