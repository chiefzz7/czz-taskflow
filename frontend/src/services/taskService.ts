import api from './api';
import type { Task, TaskCreate, TaskUpdate } from '../types/task';

export const taskService = {
  async listPersonal(params?: { status?: string; search?: string }): Promise<Task[]> {
    const res = await api.get<Task[]>('/tasks', { params });
    return res.data;
  },

  async create(data: TaskCreate): Promise<Task> {
    const res = await api.post<Task>('/tasks', data);
    return res.data;
  },

  async get(id: string): Promise<Task> {
    const res = await api.get<Task>(`/tasks/${id}`);
    return res.data;
  },

  async update(id: string, data: TaskUpdate): Promise<Task> {
    const res = await api.patch<Task>(`/tasks/${id}`, data);
    return res.data;
  },

  async updateStatus(id: string, status: string): Promise<Task> {
    const res = await api.patch<Task>(`/tasks/${id}/status`, { status });
    return res.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/tasks/${id}`);
  },

  async listEnterprise(enterpriseId: string, params?: { status?: string; search?: string }): Promise<Task[]> {
    const res = await api.get<Task[]>(`/enterprises/${enterpriseId}/tasks`, { params });
    return res.data;
  },

  async createEnterprise(enterpriseId: string, data: TaskCreate): Promise<Task> {
    const res = await api.post<Task>(`/enterprises/${enterpriseId}/tasks`, data);
    return res.data;
  },
};
