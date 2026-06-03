import axios from 'axios';
import crypto from 'crypto';
import type {
  DiscoveryItem,
  DiscoveryParams,
  DiscoverySortMetric,
  DiscoveryTimeWindow,
  PlatformDiscoveryAdapter
} from './types.js';

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function bilibiliHeaders() {
  return {
    'User-Agent': USER_AGENT,
    Referer: 'https://www.bilibili.com/',
    Cookie: `buvid3=${crypto.randomUUID()}infoc`
  };
}

interface BiliPopularItem {
  title: string;
  bvid: string;
  short_link_v2?: string;
  desc?: string;
  owner?: { name: string; mid: number };
  stat?: {
    view: number;
    danmaku: number;
    like: number;
    reply?: number;
    favorite?: number;
  };
  pubdate?: number;
}

interface BiliPopularResponse {
  code: number;
  data?: { list?: BiliPopularItem[] };
}

interface BiliRankingItem {
  title: string;
  bvid: string;
  desc?: string;
  author?: string;
  mid?: number;
  stat?: {
    view: number;
    danmaku: number;
    like: number;
    reply?: number;
  };
  pubdate?: number;
}

interface BiliRankingResponse {
  code: number;
  data?: { list?: BiliRankingItem[] };
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, '').trim();
}

function itemFromPopular(v: BiliPopularItem): DiscoveryItem {
  const views = v.stat?.view ?? 0;
  const likes = v.stat?.like ?? 0;
  const danmaku = v.stat?.danmaku ?? 0;
  const comments = v.stat?.reply ?? 0;

  return {
    title: stripTags(v.title),
    content: v.desc?.slice(0, 150) || stripTags(v.title),
    url: v.short_link_v2 || `https://www.bilibili.com/video/${v.bvid}`,
    source: 'bilibili',
    sourceId: v.bvid,
    publishedAt: v.pubdate ? new Date(v.pubdate * 1000).toISOString() : undefined,
    viewCount: views,
    likeCount: likes,
    commentCount: comments,
    danmakuCount: danmaku,
    score: views,
    metricLabels: {
      primary: '播放量',
      primaryValue: views,
      secondary: likes > 0 ? '点赞数' : undefined,
      secondaryValue: likes > 0 ? likes : undefined
    },
    author: v.owner
      ? { name: v.owner.name, username: String(v.owner.mid) }
      : undefined
  };
}

function itemFromRanking(v: BiliRankingItem): DiscoveryItem {
  const views = v.stat?.view ?? 0;
  const likes = v.stat?.like ?? 0;
  const danmaku = v.stat?.danmaku ?? 0;
  const comments = v.stat?.reply ?? 0;

  return {
    title: stripTags(v.title),
    content: v.desc?.slice(0, 150) || stripTags(v.title),
    url: `https://www.bilibili.com/video/${v.bvid}`,
    source: 'bilibili',
    sourceId: v.bvid,
    publishedAt: v.pubdate ? new Date(v.pubdate * 1000).toISOString() : undefined,
    viewCount: views,
    likeCount: likes,
    commentCount: comments,
    danmakuCount: danmaku,
    score: views,
    metricLabels: {
      primary: '播放量',
      primaryValue: views,
      secondary: danmaku > 0 ? '弹幕数' : undefined,
      secondaryValue: danmaku > 0 ? danmaku : undefined
    },
    author: v.author ? { name: v.author, username: v.mid ? String(v.mid) : undefined } : undefined
  };
}

async function fetchBilibiliPopular(limit: number): Promise<DiscoveryItem[]> {
  const response = await axios.get<BiliPopularResponse>(
    'https://api.bilibili.com/x/web-interface/popular',
    {
      params: { ps: Math.min(limit, 50) },
      headers: bilibiliHeaders(),
      timeout: 15000
    }
  );

  if (response.data?.code !== 0 || !response.data?.data?.list) {
    throw new Error('Bilibili popular API failed');
  }

  return response.data.data.list.map(itemFromPopular);
}

/** 全站排行榜（综合榜，近似周热度） */
async function fetchBilibiliRanking(limit: number): Promise<DiscoveryItem[]> {
  const response = await axios.get<BiliRankingResponse>(
    'https://api.bilibili.com/x/web-interface/ranking/v2',
    {
      params: { rid: 0, type: 'all' },
      headers: bilibiliHeaders(),
      timeout: 15000
    }
  );

  if (response.data?.code !== 0 || !response.data?.data?.list) {
    throw new Error('Bilibili ranking API failed');
  }

  return response.data.data.list.slice(0, limit).map(itemFromRanking);
}

async function fetchBilibiliSearch(query: string, limit: number): Promise<DiscoveryItem[]> {
  const response = await axios.get<{
    code: number;
    data?: {
      result?: Array<{
        bvid: string;
        title: string;
        description: string;
        author: string;
        mid: number;
        play: number;
        like: number;
        review: number;
        danmaku: number;
        pubdate: number;
      }>;
    };
  }>('https://api.bilibili.com/x/web-interface/search/type', {
    params: {
      keyword: query,
      search_type: 'video',
      order: 'click',
      page: 1,
      pagesize: Math.min(limit, 50)
    },
    headers: {
      ...bilibiliHeaders(),
      Referer: 'https://search.bilibili.com/'
    },
    timeout: 15000
  });

  const videos = response.data?.data?.result ?? [];
  return videos.map((v) => ({
    title: stripTags(v.title),
    content: v.description || stripTags(v.title),
    url: `https://www.bilibili.com/video/${v.bvid}`,
    source: 'bilibili' as const,
    sourceId: v.bvid,
    publishedAt: new Date(v.pubdate * 1000).toISOString(),
    viewCount: v.play,
    likeCount: v.like,
    commentCount: v.review,
    danmakuCount: v.danmaku,
    score: v.play,
    metricLabels: {
      primary: '播放量',
      primaryValue: v.play,
      secondary: v.like > 0 ? '点赞数' : undefined,
      secondaryValue: v.like > 0 ? v.like : undefined
    },
    author: { name: v.author, username: String(v.mid) }
  }));
}

function sortItems(items: DiscoveryItem[], sortBy: DiscoverySortMetric): DiscoveryItem[] {
  const sorted = [...items];
  sorted.sort((a, b) => {
    switch (sortBy) {
      case 'likes':
        return (b.likeCount ?? 0) - (a.likeCount ?? 0);
      case 'comments':
        return (b.commentCount ?? 0) - (a.commentCount ?? 0);
      case 'views':
      case 'hot':
      default:
        return (b.viewCount ?? 0) - (a.viewCount ?? 0);
    }
  });
  return sorted;
}

export const bilibiliDiscoveryAdapter: PlatformDiscoveryAdapter = {
  source: 'bilibili',
  capabilities: {
    trending: true,
    search: true,
    timeWindows: ['today', '7d', '30d'],
    sortMetrics: [
      { value: 'hot', label: '播放量' },
      { value: 'views', label: '播放量' },
      { value: 'likes', label: '点赞数' },
      { value: 'comments', label: '评论数' }
    ]
  },

  async discover(params: DiscoveryParams): Promise<DiscoveryItem[]> {
    const limit = params.limit ?? 30;
    const timeWindow = params.timeWindow ?? 'today';
    const sortBy = params.sortBy ?? 'hot';

    if (params.mode === 'search' && params.query?.trim()) {
      return sortItems(
        await fetchBilibiliSearch(params.query.trim(), limit),
        sortBy
      ).slice(0, limit);
    }

    let items: DiscoveryItem[];
    if (timeWindow === 'today') {
      items = await fetchBilibiliPopular(limit);
    } else {
      // 7d/30d：使用全站综合排行榜（B 站 API 无精确 30 天榜，排行榜为近期高热）
      items = await fetchBilibiliRanking(limit);
    }

    return sortItems(items, sortBy).slice(0, limit);
  }
};
