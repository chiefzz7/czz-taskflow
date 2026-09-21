export interface User {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  status: 'active' | 'inactive' | 'suspended';
  theme: 'light' | 'dark' | 'system';
  timezone: string;
  created_at: string;
}

export interface UserUpdate {
  name?: string;
  avatar_url?: string | null;
  timezone?: string;
}

export interface UserPreferencesUpdate {
  theme?: 'light' | 'dark' | 'system';
  timezone?: string;
}
