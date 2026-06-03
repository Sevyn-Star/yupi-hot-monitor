import axios from 'axios';
import type {
  DiscoveryItem,
  DiscoveryParams,
  DiscoverySortMetric,
  PlatformDiscoveryAdapter
} from './types.js';

const USER_AGENTS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
];

interface WeiboHotItem {
  word: string;
  note?: string;
  num: number;
  category?: string;
}

function sortWeiboItems(items: DiscoveryItem[], sortBy: DiscoverySortMetric): DiscoveryItem[] {
  const sorted = [...items];
  sorted.sort((a, b) => {
    if (sortBy === 'comments') {
      return (b.commentCount ?? 0) - (a.commentCount ?? 0);
    }
    return (b.viewCount ?? 0) - (a.viewCount ?? 0);
  });
  return sorted;
}

export async function fetchWeiboHotList(limit: number): Promise<DiscoveryItem[]> {
  const response = await axios.get('https://weibo.com/ajax/side/hotSearch', {
    headers: {
      'User-Agent': USER_AGENTS[0],
      Accept: 'application/json',
      Referer: 'https://weibo.com/'
    },
    timeout: 15000
  });

  if (response.data?.ok !== 1 || !response.data?.data?.realtime) {
    throw new Error('Weibo hot search API returned no data');
  }

  const hotItems: WeiboHotItem[] = response.data.data.realtime;

  return hotItems.slice(0, limit).map((item, index) => {
    const topicName = item.note || item.word;
    const heat = item.num || 0;
    return {
      title: topicName,
      content: `微博热搜第 ${index + 1} 位 · 热度 ${heat.toLocaleString()}`,
      url: `https://s.weibo.com/weibo?q=${encodeURIComponent('#' + topicName + '#')}`,
      source: 'weibo' as const,
      sourceId: topicName,
      viewCount: heat,
      score: heat,
      metricLabels: {
        primary: '热搜热度',
        primaryValue: heat
      }
    };
  });
}

export const weiboDiscoveryAdapter: PlatformDiscoveryAdapter = {
  source: 'weibo',
  capabilities: {
    trending: true,
    search: false,
    timeWindows: ['today'],
    sortMetrics: [
      { value: 'hot', label: '热搜热度' },
      { value: 'views', label: '热度值' }
    ]
  },

  async discover(params: DiscoveryParams): Promise<DiscoveryItem[]> {
    const limit = params.limit ?? 30;
    const sortBy = params.sortBy ?? 'hot';

    if (params.mode === 'search' && params.query?.trim()) {
      const all = await fetchWeiboHotList(50);
      const q = params.query.trim().toLowerCase();
      const filtered = all.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.content.toLowerCase().includes(q)
      );
      return sortWeiboItems(filtered, sortBy).slice(0, limit);
    }

    const items = await fetchWeiboHotList(limit);
    return sortWeiboItems(items, sortBy === 'hot' ? 'views' : sortBy).slice(0, limit);
  }
};
