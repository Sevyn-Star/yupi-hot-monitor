import axios from 'axios';
import type {
  DiscoveryItem,
  DiscoveryParams,
  DiscoverySortMetric,
  DiscoveryTimeWindow,
  PlatformDiscoveryAdapter
} from './types.js';

interface HuggingFaceModel {
  id: string;
  modelId?: string;
  downloads?: number;
  likes?: number;
  pipeline_tag?: string;
  lastModified?: string;
  trendingScore?: number;
}

function sinceIso(timeWindow: DiscoveryTimeWindow): string {
  const d = new Date();
  if (timeWindow === 'today') {
    d.setHours(0, 0, 0, 0);
  } else if (timeWindow === '7d') {
    d.setDate(d.getDate() - 7);
  } else {
    d.setDate(d.getDate() - 30);
  }
  return d.toISOString();
}

function modelToItem(m: HuggingFaceModel): DiscoveryItem {
  const modelId = m.modelId || m.id;
  const downloads = m.downloads ?? 0;
  const likes = m.likes ?? 0;
  const parts: string[] = [];
  if (m.pipeline_tag) parts.push(m.pipeline_tag);

  return {
    title: modelId,
    content: parts.join(' · ') || 'Hugging Face 模型',
    url: `https://huggingface.co/${modelId}`,
    source: 'huggingface',
    sourceId: modelId,
    publishedAt: m.lastModified,
    viewCount: downloads,
    likeCount: likes,
    score: m.trendingScore ?? downloads,
    metricLabels: {
      primary: '下载量',
      primaryValue: downloads,
      secondary: likes > 0 ? '点赞数' : undefined,
      secondaryValue: likes > 0 ? likes : undefined
    }
  };
}

function apiSort(sortBy: DiscoverySortMetric): string {
  switch (sortBy) {
    case 'likes':
      return 'likes';
    case 'updated':
      return 'lastModified';
    case 'hot':
      return 'trendingScore';
    case 'views':
    default:
      return 'downloads';
  }
}

function sortItems(items: DiscoveryItem[], sortBy: DiscoverySortMetric): DiscoveryItem[] {
  const sorted = [...items];
  sorted.sort((a, b) => {
    switch (sortBy) {
      case 'likes':
        return (b.likeCount ?? 0) - (a.likeCount ?? 0);
      case 'updated':
        return (
          new Date(b.publishedAt ?? 0).getTime() - new Date(a.publishedAt ?? 0).getTime()
        );
      case 'hot':
        return (b.score ?? 0) - (a.score ?? 0);
      case 'views':
      default:
        return (b.viewCount ?? 0) - (a.viewCount ?? 0);
    }
  });
  return sorted;
}

async function fetchTrendingModels(
  timeWindow: DiscoveryTimeWindow,
  sortBy: DiscoverySortMetric,
  query: string | undefined,
  limit: number
): Promise<DiscoveryItem[]> {
  const sort = apiSort(sortBy);
  const params: Record<string, string | number> = {
    limit: Math.min(limit * 2, 50),
    sort,
    direction: -1
  };
  if (query?.trim()) {
    params.search = query.trim();
  }

  const response = await axios.get<HuggingFaceModel[]>(
    'https://huggingface.co/api/models',
    {
      params,
      headers: { Accept: 'application/json' },
      timeout: 15000
    }
  );

  const models = Array.isArray(response.data) ? response.data : [];
  const since = new Date(sinceIso(timeWindow)).getTime();

  const filtered = models.filter((m) => {
    if (!m.lastModified) return true;
    return new Date(m.lastModified).getTime() >= since;
  });

  return filtered.map(modelToItem);
}

export const huggingfaceDiscoveryAdapter: PlatformDiscoveryAdapter = {
  source: 'huggingface',
  capabilities: {
    trending: true,
    search: true,
    timeWindows: ['today', '7d', '30d'],
    sortMetrics: [
      { value: 'hot', label: '趋势分' },
      { value: 'views', label: '下载量' },
      { value: 'likes', label: '点赞数' },
      { value: 'updated', label: '最近更新' }
    ]
  },

  async discover(params: DiscoveryParams): Promise<DiscoveryItem[]> {
    const limit = params.limit ?? 30;
    const timeWindow = params.timeWindow ?? '7d';
    const sortBy = params.sortBy ?? 'hot';
    const query = params.mode === 'search' ? params.query : undefined;

    const items = await fetchTrendingModels(timeWindow, sortBy, query, limit);
    return sortItems(items, sortBy).slice(0, limit);
  }
};
