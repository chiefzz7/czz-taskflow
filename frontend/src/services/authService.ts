import api from './api';
import type { User } from '../types/user';
import type { LoginRequest, RegisterRequest, TokenResponse } from '../types/api';

export const authService = {
  async register(data: RegisterRequest): Promise<User> {
    const res = await api.post<User>('/auth/register', data);
    return res.data;
  },

  async login(data: LoginRequest): Promise<TokenResponse> {
    const res = await api.post<TokenResponse>('/auth/login', data);
    return res.data;
  },

  async getMe(): Promise<User> {
    const res = await api.get<User>('/auth/me');
    return res.data;
  },

  async forgotPassword(email: string): Promise<void> {
    await api.post('/auth/forgot-password', { email });
  },

  async resetPassword(token: string, new_password: string): Promise<void> {
    await api.post('/auth/reset-password', { token, new_password });
  },
};
