import api from './api';
import type { PersonalDashboard, EnterpriseDashboard } from '../types/dashboard';

export const dashboardService = {
  async getPersonal(): Promise<PersonalDashboard> {
    const res = await api.get<PersonalDashboard>('/dashboard/personal');
    return res.data;
  },

  async getEnterprise(enterpriseId: string): Promise<EnterpriseDashboard> {
    const res = await api.get<EnterpriseDashboard>(`/dashboard/enterprise/${enterpriseId}`);
    return res.data;
  },
};

export const reportService = {
  async getPersonal(params?: Record<string, string>): Promise<unknown> {
    const res = await api.get('/reports/personal', { params });
    return res.data;
  },

  async getEnterprise(enterpriseId: string, params?: Record<string, string>): Promise<unknown> {
    const res = await api.get(`/reports/enterprise/${enterpriseId}`, { params });
    return res.data;
  },
};
