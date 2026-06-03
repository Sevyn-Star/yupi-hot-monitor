import type { SourceId } from '../settings.js';

export type DiscoveryMode = 'trending' | 'search';
export type DiscoveryTimeWindow = 'today' | '7d' | '30d';
export type DiscoverySortMetric =
  | 'hot'
  | 'stars'
  | 'forks'
  | 'updated'
  | 'views'
  | 'comments';

export interface DiscoveryMetricLabels {
  primary: string;
  primaryValue: number;
  secondary?: string;
  secondaryValue?: number;
}

export interface DiscoveryItem {
  title: string;
  content: string;
  url: string;
  source: SourceId;
  sourceId?: string;
  publishedAt?: string;
  viewCount?: number;
  likeCount?: number;
  score?: number;
  commentCount?: number;
  metricLabels: DiscoveryMetricLabels;
  author?: {
    name: string;
    username?: string;
  };
}

export interface DiscoveryCapabilities {
  trending: boolean;
  search: boolean;
  timeWindows: DiscoveryTimeWindow[];
  sortMetrics: { value: DiscoverySortMetric; label: string }[];
}

export interface DiscoveryParams {
  source: SourceId;
  mode: DiscoveryMode;
  timeWindow?: DiscoveryTimeWindow;
  sortBy?: DiscoverySortMetric;
  query?: string;
  limit?: number;
}

export interface PlatformDiscoveryAdapter {
  source: SourceId;
  capabilities: DiscoveryCapabilities;
  discover(params: DiscoveryParams): Promise<DiscoveryItem[]>;
}
