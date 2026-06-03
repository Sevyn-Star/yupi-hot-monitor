import axios from 'axios';
import type {
  DiscoveryItem,
  DiscoveryParams,
  DiscoverySortMetric,
  DiscoveryTimeWindow,
  PlatformDiscoveryAdapter
} from './types.js';

function sinceUnix(timeWindow: DiscoveryTimeWindow): number {
  const now = Date.now();
  switch (timeWindow) {
    case 'today':
      return Math.floor((now - 24 * 3600 * 1000) / 1000);
    case '7d':
      return Math.floor((now - 7 * 24 * 3600 * 1000) / 1000);
    case '30d':
      return Math.floor((now - 30 * 24 * 3600 * 1000) / 1000);
    default:
      return Math.floor((now - 24 * 3600 * 1000) / 1000);
  }
}

interface HNAlgoliaHit {
  objectID: string;
  title: string;
  url: string | null;
  story_text: string | null;
  author: string;
  points: number;
  num_comments: number;
  created_at: string;
}

interface HNAlgoliaResponse {
  hits: HNAlgoliaHit[];
}

function hitToItem(hit: HNAlgoliaHit): DiscoveryItem {
  return {
    title: hit.title,
    content: hit.story_text?.slice(0, 200) || hit.title,
    url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
    source: 'hackernews',
    sourceId: hit.objectID,
    publishedAt: hit.created_at,
    score: hit.points,
    commentCount: hit.num_comments,
    metricLabels: {
      primary: 'Points',
      primaryValue: hit.points,
      secondary: hit.num_comments > 0 ? '评论数' : undefined,
      secondaryValue: hit.num_comments > 0 ? hit.num_comments : undefined
    },
    author: { name: hit.author, username: hit.author }
  };
}

function sortItems(items: DiscoveryItem[], sortBy: DiscoverySortMetric): DiscoveryItem[] {
  const sorted = [...items];
  sorted.sort((a, b) => {
    switch (sortBy) {
      case 'comments':
        return (b.commentCount ?? 0) - (a.commentCount ?? 0);
      case 'hot':
      default:
        return (b.score ?? 0) - (a.score ?? 0);
    }
  });
  return sorted;
}

async function fetchHNStories(
  timeWindow: DiscoveryTimeWindow,
  query: string | undefined,
  limit: number
): Promise<DiscoveryItem[]> {
  const since = sinceUnix(timeWindow);
  const params: Record<string, string | number> = {
    tags: 'story',
    hitsPerPage: Math.min(limit, 50),
    numericFilters: `created_at_i>${since}`
  };
  if (query?.trim()) {
    params.query = query.trim();
  }

  const endpoint = query?.trim()
    ? 'https://hn.algolia.com/api/v1/search'
    : 'https://hn.algolia.com/api/v1/search_by_date';

  const response = await axios.get<HNAlgoliaResponse>(endpoint, {
    params,
    timeout: 15000
  });

  return response.data.hits
    .filter((h) => h.title && (h.url || h.story_text))
    .map(hitToItem);
}

export const hackernewsDiscoveryAdapter: PlatformDiscoveryAdapter = {
  source: 'hackernews',
  capabilities: {
    trending: true,
    search: true,
    timeWindows: ['today', '7d', '30d'],
    sortMetrics: [
      { value: 'hot', label: 'Points' },
      { value: 'comments', label: '评论数' }
    ]
  },

  async discover(params: DiscoveryParams): Promise<DiscoveryItem[]> {
    const limit = params.limit ?? 30;
    const timeWindow = params.timeWindow ?? 'today';
    const sortBy = params.sortBy ?? 'hot';
    const query = params.mode === 'search' ? params.query : undefined;

    const items = await fetchHNStories(timeWindow, query, limit);
    return sortItems(items, sortBy).slice(0, limit);
  }
};
