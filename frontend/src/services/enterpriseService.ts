import api from './api';
import type {
  Enterprise,
  EnterpriseCreate,
  EnterpriseMember,
  MemberInvite,
  MemberRoleUpdate,
  EnterpriseCustomRole,
  EnterpriseCustomRoleCreate,
  EnterpriseCustomRoleUpdate,
  EnterpriseInvitation,
  InviteCodeResponse,
} from '../types/enterprise';
import type { User } from '../types/user';

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

  async joinByCode(inviteCode: string): Promise<Enterprise> {
    const res = await api.post<Enterprise>(`/enterprises/join/${inviteCode.trim()}`);
    return res.data;
  },

  async getInviteCode(enterpriseId: string): Promise<InviteCodeResponse> {
    const res = await api.get<InviteCodeResponse>(`/enterprises/${enterpriseId}/invite-code`);
    return res.data;
  },

  async regenerateInviteCode(enterpriseId: string): Promise<InviteCodeResponse> {
    const res = await api.post<InviteCodeResponse>(`/enterprises/${enterpriseId}/invite-code/regenerate`);
    return res.data;
  },

  // ── Roles (Cargos) ──────────────────────────────────────────────────────────

  async listRoles(enterpriseId: string): Promise<EnterpriseCustomRole[]> {
    const res = await api.get<EnterpriseCustomRole[]>(`/enterprises/${enterpriseId}/roles`);
    return res.data;
  },

  async createRole(enterpriseId: string, data: EnterpriseCustomRoleCreate): Promise<EnterpriseCustomRole> {
    const res = await api.post<EnterpriseCustomRole>(`/enterprises/${enterpriseId}/roles`, data);
    return res.data;
  },

  async updateRole(
    enterpriseId: string,
    roleId: string,
    data: EnterpriseCustomRoleUpdate
  ): Promise<EnterpriseCustomRole> {
    const res = await api.patch<EnterpriseCustomRole>(`/enterprises/${enterpriseId}/roles/${roleId}`, data);
    return res.data;
  },

  async deleteRole(enterpriseId: string, roleId: string): Promise<void> {
    await api.delete(`/enterprises/${enterpriseId}/roles/${roleId}`);
  },

  // ── Members ─────────────────────────────────────────────────────────────────

  async listMembers(id: string): Promise<EnterpriseMember[]> {
    const res = await api.get<EnterpriseMember[]>(`/enterprises/${id}/members`);
    return res.data;
  },

  async addMember(id: string, data: MemberInvite): Promise<EnterpriseMember> {
    const res = await api.post<EnterpriseMember>(`/enterprises/${id}/members`, data);
    return res.data;
  },

  async updateMemberRole(
    enterpriseId: string,
    userId: string,
    data: MemberRoleUpdate
  ): Promise<EnterpriseMember> {
    const res = await api.patch<EnterpriseMember>(`/enterprises/${enterpriseId}/members/${userId}`, data);
    return res.data;
  },

  async removeMember(enterpriseId: string, userId: string): Promise<void> {
    await api.delete(`/enterprises/${enterpriseId}/members/${userId}`);
  },

  // ── Invitations ─────────────────────────────────────────────────────────────

  async listInvitations(enterpriseId: string): Promise<EnterpriseInvitation[]> {
    const res = await api.get<EnterpriseInvitation[]>(`/enterprises/${enterpriseId}/invitations`);
    return res.data;
  },

  async cancelInvitation(enterpriseId: string, invitationId: string): Promise<void> {
    await api.delete(`/enterprises/${enterpriseId}/invitations/${invitationId}`);
  },

  // ── Users search helper ────────────────────────────────────────────────────

  async listAllUsers(): Promise<User[]> {
    const res = await api.get<User[]>('/users');
    return res.data;
  },
};
