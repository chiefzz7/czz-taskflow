export interface TaskStatusCount {
  status: string;
  count: number;
}

export interface TaskPriorityCount {
  priority: string;
  count: number;
}

export interface MemberTaskCount {
  user_id: string;
  user_name: string;
  total: number;
  completed: number;
  overdue: number;
}

export interface RecentTask {
  id: string;
  title: string;
  completed_at?: string;
  due_at?: string;
  priority?: string;
}

export interface PersonalDashboard {
  total_tasks: number;
  open_tasks: number;
  completed_tasks: number;
  overdue_tasks: number;
  in_progress_tasks: number;
  completion_rate: number;
  by_status: TaskStatusCount[];
  by_priority: TaskPriorityCount[];
  recently_completed: RecentTask[];
  upcoming_due: RecentTask[];
}

export interface EnterpriseDashboard extends PersonalDashboard {
  by_member: MemberTaskCount[];
  total_members: number;
}

export interface ReportData {
  total_created: number;
  total_completed: number;
  total_overdue: number;
  completion_rate: number;
  by_status: { status: string; count: number }[];
  by_priority: { priority: string; count: number }[];
  tasks: {
    id: string;
    title: string;
    status: string;
    priority: string;
    created_at: string;
    completed_at?: string;
    due_at?: string;
    responsible_id?: string;
    creator_id?: string;
  }[];
}
