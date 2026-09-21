import api from './api';
import type {
  SocialPost,
  SocialPostCreate,
  SocialPostUpdate,
  SocialPostStatus,
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
};
