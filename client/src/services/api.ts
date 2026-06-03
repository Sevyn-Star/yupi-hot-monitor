const API_BASE = '/api';

export interface Keyword {
  id: string;
  text: string;
  category: string | null;
  isActive: boolean;
  lastScannedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { hotspots: number };
}

export interface Hotspot {
  id: string;
  title: string;
  content: string;
  url: string;
  source: string;
  sourceId: string | null;
  isReal: boolean;
  relevance: number;
  relevanceReason: string | null;
  keywordMentioned: boolean | null;
  importance: 'low' | 'medium' | 'high' | 'urgent';
  summary: string | null;
  viewCount: number | null;
  likeCount: number | null;
  retweetCount: number | null;
  replyCount: number | null;
  commentCount: number | null;
  quoteCount: number | null;
  danmakuCount: number | null;
  authorName: string | null;
  authorUsername: string | null;
  authorAvatar: string | null;
  authorFollowers: number | null;
  authorVerified: boolean | null;
  publishedAt: string | null;
  createdAt: string;
  keyword: { id: string; text: string; category: string | null } | null;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  content: string;
  isRead: boolean;
  hotspotId: string | null;
  createdAt: string;
}

export interface Stats {
  total: number;
  today: number;
  urgent: number;
  bySource: Record<string, number>;
}

export type WebhookType = 'dingtalk' | 'feishu' | 'generic';

export interface AppSettings {
  scanIntervalMinutes: number;
  emailNotificationsEnabled: boolean;
  enabledSources: string[];
  smtpConfigured: boolean;
  cronExpression: string;
  webhookNotificationsEnabled: boolean;
  webhookUrl: string;
  webhookType: WebhookType;
  dailyReportEmailEnabled: boolean;
}

export interface StartupCheck {
  openRouterConfigured: boolean;
  smtpConfigured: boolean;
  twitterConfigured: boolean;
  githubTokenConfigured: boolean;
  databaseOk: boolean;
  keywordCount: number;
  hotspotCount: number;
  ready: boolean;
}

export interface HotspotTrends {
  days: number;
  byDay: { date: string; count: number }[];
  bySource: { source: string; count: number }[];
  byImportance: { importance: string; count: number }[];
  total: number;
}

export interface KeywordTemplate {
  id: string;
  name: string;
  description: string;
  keywords: { text: string; category: string }[];
}

export interface KeywordImportResult {
  created: number;
  skipped: number;
  skippedTexts: string[];
  keywords: Keyword[];
}

export type ReportRange = 'today' | '7d' | '30d';

export interface SourceFetchStat {
  source: string;
  status: 'ok' | 'failed' | 'skipped';
  count: number;
  error?: string;
}

export interface ScanFilterStats {
  rawFetched: number;
  afterFreshness: number;
  skippedDuplicate: number;
  skippedFake: number;
  skippedLowRelevance: number;
  skippedNotMentioned: number;
  skippedQuota: number;
  saved: number;
  processErrors: number;
}

export interface ScanRunSummary {
  trigger: 'cron' | 'manual';
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  keywordsChecked: number;
  newHotspotsCount: number;
  error?: string;
  filterStats?: ScanFilterStats;
  aiCalls?: { expand: number; analyze: number };
}

export interface AiUsageStats {
  expandCalls: number;
  analyzeCalls: number;
  lastResetAt: string | null;
  sessionTotalExpand: number;
  sessionTotalAnalyze: number;
}

export interface SourceHealthResult {
  source: string;
  label: string;
  status: 'ok' | 'failed' | 'skipped';
  count: number;
  latencyMs: number;
  error?: string;
  checkedAt: string;
}

export interface SourcesHealthReport {
  query: string;
  checkedAt: string;
  results: SourceHealthResult[];
  summary: { ok: number; failed: number; skipped: number };
  cached?: boolean;
}

export interface ScanStatus {
  isRunning: boolean;
  lastRun: ScanRunSummary | null;
  lastSuccessAt: string | null;
  lastError: string | null;
  currentKeyword: string | null;
  lastSourceStats: SourceFetchStat[];
  lastSkippedReason: string | null;
  scanIntervalMinutes: number;
  aiUsage?: AiUsageStats;
  sourcesHealth?: SourcesHealthReport | null;
}

export interface SearchResponse {
  results: Hotspot[];
  sourceStats?: SourceFetchStat[];
}

export interface DiscoveryMetricLabels {
  primary: string;
  primaryValue: number;
  secondary?: string;
  secondaryValue?: number;
}

export interface DiscoveryCapabilities {
  trending: boolean;
  search: boolean;
  timeWindows: string[];
  sortMetrics: { value: string; label: string }[];
}

export interface DiscoveryPlatformInfo {
  source: string;
  label: string;
  capabilities: DiscoveryCapabilities;
  available: boolean;
}

export interface DiscoverHotspot extends Hotspot {
  metricLabels?: DiscoveryMetricLabels;
  /** 平台原生热度分（如 GitHub stars、微博热度） */
  score?: number;
}

export interface DiscoverResponse {
  results: DiscoverHotspot[];
  meta: {
    source: string;
    mode: string;
    timeWindow: string;
    sortBy: string;
    fetchedAt: string;
    cacheHit: boolean;
    snapshotId?: string;
    aiAnalyzedCount: number;
    capabilities: DiscoveryCapabilities;
  };
}

export interface SnapshotHistoryItem {
  id: string;
  source: string;
  timeWindow: string;
  sortBy: string;
  mode: string;
  itemCount: number;
  fetchedAt: string;
}

export interface DiscoveryTrendPoint {
  date: string;
  count: number;
  topTitle: string;
}

export interface DiscoveryInsightKeyword {
  term: string;
  score: number;
  appearances: number;
  sampleTitles: string[];
  trend: 'new' | 'rising' | 'stable';
}

export interface DiscoveryInsightTheme {
  title: string;
  keywords: string[];
  why: string;
}

export interface DiscoveryInsight {
  period: string;
  source: string;
  themes: DiscoveryInsightTheme[];
  topKeywords: DiscoveryInsightKeyword[];
  summary: string;
  vsLastPeriod?: string;
  stats: {
    snapshotCount: number;
    itemCount: number;
    generatedAt: string;
    aiEnhanced: boolean;
  };
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    const message = error.error || 'Request failed';
    const err = new Error(message) as Error & { code?: string };
    if (error.code) err.code = error.code;
    throw err;
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

// Keywords API
export const keywordsApi = {
  getAll: () => request<Keyword[]>('/keywords'),
  
  getById: (id: string) => request<Keyword>(`/keywords/${id}`),
  
  create: (data: { text: string; category?: string }) => 
    request<Keyword>('/keywords', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  
  update: (id: string, data: Partial<Keyword>) => 
    request<Keyword>(`/keywords/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
  
  delete: (id: string) => 
    request<void>(`/keywords/${id}`, { method: 'DELETE' }),
  
  toggle: (id: string) => 
    request<Keyword>(`/keywords/${id}/toggle`, { method: 'PATCH' }),

  getTemplates: () => request<KeywordTemplate[]>('/keywords/templates'),

  importTemplate: (templateId: string) =>
    request<KeywordImportResult>('/keywords/import', {
      method: 'POST',
      body: JSON.stringify({ templateId })
    }),

  exportJson: () => request<{ exportedAt: string; version: number; keywords: Keyword[] }>('/keywords/export'),

  importJson: (keywords: { text: string; category?: string; isActive?: boolean }[]) =>
    request<KeywordImportResult>('/keywords/import', {
      method: 'POST',
      body: JSON.stringify({ keywords })
    })
};

// Hotspots API
export const hotspotsApi = {
  getAll: (params?: { 
    page?: number; 
    limit?: number; 
    source?: string; 
    importance?: string; 
    keywordId?: string;
    isReal?: string;
    timeRange?: string;
    timeFrom?: string;
    timeTo?: string;
    sortBy?: string;
    sortOrder?: string;
  }) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== '') searchParams.append(key, String(value));
      });
    }
    return request<{ data: Hotspot[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>(
      `/hotspots?${searchParams}`
    );
  },
  
  getStats: () => request<Stats>('/hotspots/stats'),

  getTrends: (days = 7) => request<HotspotTrends>(`/hotspots/trends?days=${days}`),

  saveBatch: (payload: {
    items: Partial<Hotspot>[];
    keywordId?: string;
    keywordText?: string;
  }) =>
    request<{ created: number; updated: number; saved: Hotspot[] }>('/hotspots/save', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  getReport: (range: ReportRange = '7d') =>
    request<{ markdown: string; count: number; range: ReportRange }>(
      `/hotspots/report?range=${range}`
    ),

  downloadReport: async (range: ReportRange = '7d') => {
    const response = await fetch(
      `${API_BASE}/hotspots/report?range=${range}`,
      { headers: { Accept: 'text/markdown' } }
    );
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Download failed' }));
      throw new Error(error.error || 'Download failed');
    }
    return response.text();
  },
  
  getById: (id: string) => request<Hotspot>(`/hotspots/${id}`),
  
  search: (
    query: string,
    options?: {
      sources?: string[];
      timeWindow?: string;
      sortBy?: string;
    }
  ) =>
    request<SearchResponse>('/hotspots/search', {
      method: 'POST',
      body: JSON.stringify({
        query,
        sources: options?.sources,
        timeWindow: options?.timeWindow || undefined,
        sortBy: options?.sortBy || undefined
      })
    }),
  
  delete: (id: string) => 
    request<void>(`/hotspots/${id}`, { method: 'DELETE' })
};

// Notifications API
export const notificationsApi = {
  getAll: (params?: { page?: number; limit?: number; unreadOnly?: boolean }) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.append(key, String(value));
      });
    }
    return request<{ data: Notification[]; unreadCount: number; pagination: any }>(
      `/notifications?${searchParams}`
    );
  },
  
  markAsRead: (id: string) => 
    request<Notification>(`/notifications/${id}/read`, { method: 'PATCH' }),
  
  markAllAsRead: () => 
    request<void>('/notifications/read-all', { method: 'PATCH' }),
  
  delete: (id: string) => 
    request<void>(`/notifications/${id}`, { method: 'DELETE' }),
  
  clear: () => 
    request<void>('/notifications', { method: 'DELETE' })
};

// Settings API
export const settingsApi = {
  get: () => request<AppSettings>('/settings'),

  getAll: () => request<AppSettings>('/settings'),

  update: (
    settings: Partial<
      Pick<
        AppSettings,
        | 'scanIntervalMinutes'
        | 'emailNotificationsEnabled'
        | 'enabledSources'
        | 'webhookNotificationsEnabled'
        | 'webhookUrl'
        | 'webhookType'
        | 'dailyReportEmailEnabled'
      >
    >
  ) =>
    request<AppSettings>('/settings', {
      method: 'PUT',
      body: JSON.stringify(settings)
    }),

  testWebhook: (url: string, type: WebhookType) =>
    request<{ ok: boolean }>('/settings/webhook/test', {
      method: 'POST',
      body: JSON.stringify({ url, type })
    })
};

export const scanApi = {
  getStatus: () => request<ScanStatus>('/scan/status')
};

export const healthApi = {
  startup: () => request<StartupCheck>('/health/startup'),

  checkSources: (refresh = false, query = 'AI') =>
    request<SourcesHealthReport>(
      `/health/sources?refresh=${refresh ? 'true' : 'false'}&q=${encodeURIComponent(query)}`
    ),

  getAiStats: () => request<AiUsageStats>('/health/ai-stats')
};

export const discoverApi = {
  getCapabilities: () =>
    request<{ platforms: DiscoveryPlatformInfo[] }>('/discover/capabilities'),

  discover: (body: {
    source: string;
    mode?: 'trending' | 'search';
    timeWindow?: string;
    sortBy?: string;
    query?: string;
    limit?: number;
    saveSnapshot?: boolean;
    skipAi?: boolean;
  }) =>
    request<DiscoverResponse>('/discover', {
      method: 'POST',
      body: JSON.stringify(body)
    }),

  getSnapshotHistory: (params: { source: string; timeWindow: string; sortBy?: string; days?: number }) => {
    const q = new URLSearchParams();
    q.set('source', params.source);
    q.set('timeWindow', params.timeWindow);
    if (params.sortBy) q.set('sortBy', params.sortBy);
    if (params.days != null) q.set('days', String(params.days));
    return request<{ history: SnapshotHistoryItem[] }>(`/discover/snapshots?${q}`);
  },

  getTrends: (params: { source: string; timeWindow: string; sortBy: string }) => {
    const q = new URLSearchParams(params as Record<string, string>);
    return request<{ points: DiscoveryTrendPoint[]; topTitles: { title: string; appearances: number }[] }>(
      `/discover/trends?${q}`
    );
  },

  getInsight: (params: { source: string; period: string; sortBy?: string }) => {
    const q = new URLSearchParams();
    q.set('source', params.source);
    q.set('period', params.period);
    if (params.sortBy) q.set('sortBy', params.sortBy);
    return request<{ insight: DiscoveryInsight }>(`/discover/insight?${q}`);
  },

  generateInsight: (body: {
    source: string;
    period: string;
    sortBy?: string;
    currentItems?: { title: string; content: string; url?: string; source?: string }[];
    force?: boolean;
  }) =>
    request<{ insight: DiscoveryInsight }>('/discover/insight/generate', {
      method: 'POST',
      body: JSON.stringify(body)
    })
};

// Manual trigger
export const triggerHotspotCheck = () =>
  request<{
    message: string;
    newHotspotsCount: number;
    keywordsChecked: number;
  }>('/check-hotspots', { method: 'POST' });
