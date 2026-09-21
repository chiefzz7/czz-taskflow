export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'review' | 'done' | 'archived';
export type TaskPriority = 'none' | 'low' | 'medium' | 'high' | 'urgent';
export type WorkspaceType = 'personal' | 'enterprise';
export type RecurrenceType = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface Recurrence {
  id: string;
  type: RecurrenceType;
  interval: number;
  days_of_week: number[] | null;
  end_date: string | null;
  max_occurrences: number | null;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  notes: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  workspace: WorkspaceType;
  enterprise_id: string | null;
  creator_id: string;
  responsible_id: string | null;
  is_public: boolean;
  planned_start_at: string | null;
  started_at: string | null;
  due_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  assignee_ids: string[];
  recurrence: Recurrence | null;
}

export interface TaskCreate {
  title: string;
  description?: string | null;
  notes?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  workspace?: WorkspaceType;
  enterprise_id?: string | null;
  responsible_id?: string | null;
  is_public?: boolean;
  planned_start_at?: string | null;
  due_at?: string | null;
  recurrence?: {
    type: RecurrenceType;
    interval?: number;
    days_of_week?: number[] | null;
    end_date?: string | null;
    max_occurrences?: number | null;
  } | null;
}

export interface TaskUpdate {
  title?: string;
  description?: string | null;
  notes?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  responsible_id?: string | null;
  is_public?: boolean;
  planned_start_at?: string | null;
  due_at?: string | null;
}

export interface TaskFilters {
  status?: TaskStatus;
  priority?: TaskPriority;
  search?: string;
}

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  backlog: 'Backlog',
  todo: 'A Fazer',
  in_progress: 'Em Andamento',
  review: 'Em Revisão',
  done: 'Concluída',
  archived: 'Arquivada',
};

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  none: 'Nenhuma',
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  urgent: 'Urgente',
};

export const TASK_STATUS_ORDER: TaskStatus[] = [
  'backlog', 'todo', 'in_progress', 'review', 'done', 'archived',
];
