/** 与 server SOURCE_IDS 保持一致 */
export const DATA_SOURCE_OPTIONS = [
  { id: 'twitter', label: 'Twitter / X' },
  { id: 'bing', label: 'Bing' },
  { id: 'google', label: 'Google' },
  { id: 'duckduckgo', label: 'DuckDuckGo' },
  { id: 'hackernews', label: 'Hacker News' },
  { id: 'github', label: 'GitHub' },
  { id: 'huggingface', label: 'Hugging Face' },
  { id: 'sogou', label: '搜狗' },
  { id: 'bilibili', label: 'Bilibili' },
  { id: 'weibo', label: '微博热搜' }
] as const;

export const SOURCE_FILTER_OPTIONS = [
  { value: '', label: '全部来源' },
  ...DATA_SOURCE_OPTIONS.map(({ id, label }) => ({
    value: id,
    label: id === 'hackernews' ? 'HackerNews' : label.replace(' / X', '')
  }))
];

export const SOURCE_LABELS: Record<string, string> = Object.fromEntries(
  DATA_SOURCE_OPTIONS.map(({ id, label }) => [id, label])
);
