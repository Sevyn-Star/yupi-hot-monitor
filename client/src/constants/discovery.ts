/** 支持纯榜单的平台（与 server DISCOVERY_SOURCE_IDS 一致） */
export const DISCOVERY_PLATFORM_OPTIONS = [
  { id: 'github', label: 'GitHub' },
  { id: 'weibo', label: '微博热搜' },
  { id: 'hackernews', label: 'Hacker News' },
  { id: 'bilibili', label: 'Bilibili' },
  { id: 'huggingface', label: 'Hugging Face' }
] as const;

export type DiscoveryPlatformId = (typeof DISCOVERY_PLATFORM_OPTIONS)[number]['id'];

export const DISCOVERY_TIME_OPTIONS = [
  { value: 'today', label: '今天' },
  { value: '7d', label: '近 7 天' },
  { value: '30d', label: '近 30 天' }
] as const;
