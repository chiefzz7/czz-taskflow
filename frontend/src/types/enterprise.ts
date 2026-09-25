import type { User } from './user';

export type EnterpriseRole = 'admin' | 'manager' | 'member';
export type MemberStatus = 'active' | 'inactive' | 'invited';

export interface EnterpriseCustomRole {
  id: string;
  enterprise_id: string;
  name: string;
  description: string | null;
  color: string;
  permissions?: string | null;
  created_at: string;
  updated_at: string;
}

export interface EnterpriseCustomRoleCreate {
  name: string;
  description?: string | null;
  color: string;
  permissions?: string | null;
}

export interface EnterpriseCustomRoleUpdate {
  name?: string;
  description?: string | null;
  color?: string;
  permissions?: string | null;
}

export interface Enterprise {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  owner_id: string;
  invite_code?: string | null;
  created_at: string;
  updated_at: string;
}

export interface EnterpriseMember {
  id: string;
  enterprise_id: string;
  user_id: string;
  role: EnterpriseRole;
  custom_role_id?: string | null;
  job_title?: string | null;
  custom_role?: EnterpriseCustomRole | null;
  status: MemberStatus;
  joined_at: string;
  user?: User;
}

export interface EnterpriseCreate {
  name: string;
  description?: string | null;
  logo_url?: string | null;
}

export interface EnterpriseUpdate {
  name?: string;
  description?: string | null;
  logo_url?: string | null;
}

export interface MemberInvite {
  user_id?: string;
  email?: string;
  role: EnterpriseRole;
  custom_role_id?: string | null;
  job_title?: string | null;
}

export interface MemberRoleUpdate {
  role?: EnterpriseRole;
  custom_role_id?: string | null;
  job_title?: string | null;
  status?: MemberStatus;
}

export interface EnterpriseInvitation {
  id: string;
  enterprise_id: string;
  email: string;
  role: EnterpriseRole;
  custom_role_id?: string | null;
  job_title?: string | null;
  custom_role?: EnterpriseCustomRole | null;
  status: string;
  token: string;
  created_at: string;
}

export interface InviteCodeResponse {
  invite_code: string;
  invite_link: string;
}

export const ROLE_LABELS: Record<EnterpriseRole, string> = {
  admin: 'Administrador',
  manager: 'Gerente',
  member: 'Membro',
};
