import type { User } from './user';

export type EnterpriseRole = 'admin' | 'manager' | 'member';
export type MemberStatus = 'active' | 'inactive' | 'invited';

export interface Enterprise {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface EnterpriseMember {
  id: string;
  enterprise_id: string;
  user_id: string;
  role: EnterpriseRole;
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
  user_id: string;
  role: EnterpriseRole;
}

export interface MemberRoleUpdate {
  role: EnterpriseRole;
}

export const ROLE_LABELS: Record<EnterpriseRole, string> = {
  admin: 'Admin',
  manager: 'Manager',
  member: 'Member',
};
