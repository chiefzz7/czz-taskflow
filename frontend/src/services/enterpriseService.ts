import api from './api';
import type { Enterprise, EnterpriseCreate, EnterpriseMember, MemberInvite, MemberRoleUpdate } from '../types/enterprise';

export const enterpriseService = {
  async list(): Promise<Enterprise[]> {
    const res = await api.get<Enterprise[]>('/enterprises');
    return res.data;
  },

  async create(data: EnterpriseCreate): Promise<Enterprise> {
    const res = await api.post<Enterprise>('/enterprises', data);
    return res.data;
  },

  async get(id: string): Promise<Enterprise> {
    const res = await api.get<Enterprise>(`/enterprises/${id}`);
    return res.data;
  },

  async listMembers(id: string): Promise<EnterpriseMember[]> {
    const res = await api.get<EnterpriseMember[]>(`/enterprises/${id}/members`);
    return res.data;
  },

  async addMember(id: string, data: MemberInvite): Promise<EnterpriseMember> {
    const res = await api.post<EnterpriseMember>(`/enterprises/${id}/members`, data);
    return res.data;
  },

  async updateMemberRole(enterpriseId: string, userId: string, data: MemberRoleUpdate): Promise<EnterpriseMember> {
    const res = await api.patch<EnterpriseMember>(`/enterprises/${enterpriseId}/members/${userId}`, data);
    return res.data;
  },

  async removeMember(enterpriseId: string, userId: string): Promise<void> {
    await api.delete(`/enterprises/${enterpriseId}/members/${userId}`);
  },
};
