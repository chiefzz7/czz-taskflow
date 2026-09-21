export type SocialPlatform =
  | 'instagram'
  | 'tiktok'
  | 'facebook'
  | 'linkedin'
  | 'twitter'
  | 'youtube'
  | 'threads';

export type SocialPostStatus =
  | 'ideia'
  | 'em_producao'
  | 'revisao'
  | 'pronto'
  | 'postado';

export type SocialMediaType =
  | 'image'
  | 'video'
  | 'carousel'
  | 'story'
  | 'reels';

export interface SocialPost {
  id: string;
  title: string;
  caption?: string | null;
  media_url?: string | null;
  media_type: SocialMediaType;
  platform: SocialPlatform;
  status: SocialPostStatus;
  scheduled_at?: string | null;
  responsible_id?: string | null;
  responsible_name?: string | null;
  workspace: 'personal' | 'enterprise';
  enterprise_id?: string | null;
  creator_id: string;
  created_at: string;
  updated_at: string;
}

export interface SocialPostCreate {
  title: string;
  caption?: string;
  media_url?: string;
  media_type?: SocialMediaType;
  platform?: SocialPlatform;
  status?: SocialPostStatus;
  scheduled_at?: string | null;
  responsible_id?: string | null;
  responsible_name?: string | null;
  workspace?: 'personal' | 'enterprise';
  enterprise_id?: string | null;
}

export interface SocialPostUpdate {
  title?: string;
  caption?: string | null;
  media_url?: string | null;
  media_type?: SocialMediaType;
  platform?: SocialPlatform;
  status?: SocialPostStatus;
  scheduled_at?: string | null;
  responsible_id?: string | null;
  responsible_name?: string | null;
}

export const SOCIAL_STATUS_ORDER: SocialPostStatus[] = [
  'ideia',
  'em_producao',
  'revisao',
  'pronto',
  'postado',
];

export const SOCIAL_STATUS_LABELS: Record<SocialPostStatus, string> = {
  ideia: 'Ideia / Pauta',
  em_producao: 'Em Produção',
  revisao: 'Revisão / Aprovação',
  pronto: 'Pronto / Agendado',
  postado: 'Postado',
};

export const SOCIAL_STATUS_COLORS: Record<SocialPostStatus, { border: string; badge: string; dot: string }> = {
  ideia: {
    border: 'border-t-amber-400',
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
    dot: 'bg-amber-400',
  },
  em_producao: {
    border: 'border-t-blue-500',
    badge: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
    dot: 'bg-blue-500',
  },
  revisao: {
    border: 'border-t-purple-500',
    badge: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300',
    dot: 'bg-purple-500',
  },
  pronto: {
    border: 'border-t-emerald-500',
    badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
    dot: 'bg-emerald-500',
  },
  postado: {
    border: 'border-t-gray-400',
    badge: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
    dot: 'bg-gray-400',
  },
};

export const PLATFORM_INFO: Record<
  SocialPlatform,
  { label: string; bg: string; text: string; badgeClass: string; iconName: string }
> = {
  instagram: {
    label: 'Instagram',
    bg: 'bg-pink-500',
    text: 'text-pink-500',
    badgeClass: 'bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500 text-white',
    iconName: 'Instagram',
  },
  tiktok: {
    label: 'TikTok',
    bg: 'bg-black dark:bg-gray-800',
    text: 'text-gray-900 dark:text-white',
    badgeClass: 'bg-black dark:bg-gray-800 text-white border border-gray-700',
    iconName: 'Video',
  },
  facebook: {
    label: 'Facebook',
    bg: 'bg-blue-600',
    text: 'text-blue-600',
    badgeClass: 'bg-blue-600 text-white',
    iconName: 'Facebook',
  },
  linkedin: {
    label: 'LinkedIn',
    bg: 'bg-blue-700',
    text: 'text-blue-700',
    badgeClass: 'bg-blue-700 text-white',
    iconName: 'Linkedin',
  },
  twitter: {
    label: 'Twitter / X',
    bg: 'bg-gray-900 dark:bg-white',
    text: 'text-gray-900 dark:text-white',
    badgeClass: 'bg-gray-900 text-white dark:bg-white dark:text-gray-900',
    iconName: 'Twitter',
  },
  youtube: {
    label: 'YouTube',
    bg: 'bg-red-600',
    text: 'text-red-600',
    badgeClass: 'bg-red-600 text-white',
    iconName: 'Youtube',
  },
  threads: {
    label: 'Threads',
    bg: 'bg-slate-800',
    text: 'text-slate-800 dark:text-slate-200',
    badgeClass: 'bg-slate-800 text-white',
    iconName: 'AtSign',
  },
};

export const MEDIA_TYPE_LABELS: Record<SocialMediaType, string> = {
  image: 'Imagem (1:1 / 4:5)',
  story: 'Story (9:16)',
  reels: 'Reels / Vídeo Curto',
  video: 'Vídeo Longo',
  carousel: 'Carrossel',
};
