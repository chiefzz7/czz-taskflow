import api from './api';
import type {
  SocialPost,
  SocialPostCreate,
  SocialPostUpdate,
  SocialPostStatus,
  EditRequest,
  SocialSettings,
} from '../types/social';

export const socialService = {
  async list(params?: { workspace?: string; enterprise_id?: string }): Promise<SocialPost[]> {
    const res = await api.get<SocialPost[]>('/social/posts', { params });
    return res.data;
  },

  async get(id: string): Promise<SocialPost> {
    const res = await api.get<SocialPost>(`/social/posts/${id}`);
    return res.data;
  },

  async create(data: SocialPostCreate): Promise<SocialPost> {
    const res = await api.post<SocialPost>('/social/posts', data);
    return res.data;
  },

  async update(id: string, data: SocialPostUpdate): Promise<SocialPost> {
    const res = await api.patch<SocialPost>(`/social/posts/${id}`, data);
    return res.data;
  },

  async updateStatus(id: string, status: SocialPostStatus): Promise<SocialPost> {
    const res = await api.patch<SocialPost>(`/social/posts/${id}/status`, { status });
    return res.data;
  },

  async requestEdit(id: string, data: EditRequest): Promise<SocialPost> {
    const res = await api.post<SocialPost>(`/social/posts/${id}/request-edit`, data);
    return res.data;
  },

  async clearEditFlag(id: string): Promise<SocialPost> {
    const res = await api.delete<SocialPost>(`/social/posts/${id}/request-edit`);
    return res.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/social/posts/${id}`);
  },

  async uploadMedia(file: File): Promise<{ url: string; filename: string }> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post<{ url: string; filename: string }>('/social/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  // Settings
  async getSettings(enterpriseId: string): Promise<SocialSettings> {
    const res = await api.get<SocialSettings>(`/social/settings/${enterpriseId}`);
    return res.data;
  },

  async updateSettings(enterpriseId: string, data: Partial<SocialSettings>): Promise<SocialSettings> {
    const res = await api.put<SocialSettings>(`/social/settings/${enterpriseId}`, data);
    return res.data;
  },
};
