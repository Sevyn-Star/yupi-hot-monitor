import axios from 'axios';
import * as cheerio from 'cheerio';
import type {
  DiscoveryItem,
  DiscoveryParams,
  DiscoverySortMetric,
  DiscoveryTimeWindow,
  PlatformDiscoveryAdapter
} from './types.js';

const USER_AGENT = 'HotPulse-Monitor/1.0';

function timeWindowToSince(tw: DiscoveryTimeWindow): 'daily' | 'weekly' | 'monthly' {
  switch (tw) {
    case 'today':
      return 'daily';
    case '7d':
      return 'weekly';
    case '30d':
      return 'monthly';
    default:
      return 'daily';
  }
}

function pushedAfter(tw: DiscoveryTimeWindow): string {
  const d = new Date();
  if (tw === 'today') {
    d.setHours(0, 0, 0, 0);
  } else if (tw === '7d') {
    d.setDate(d.getDate() - 7);
  } else {
    d.setDate(d.getDate() - 30);
  }
  return d.toISOString().slice(0, 10);
}

function parseStarCount(text: string): number {
  const cleaned = text.replace(/,/g, '').trim();
  if (cleaned.endsWith('k')) return Math.round(parseFloat(cleaned) * 1000);
  if (cleaned.endsWith('m')) return Math.round(parseFloat(cleaned) * 1_000_000);
  const n = parseInt(cleaned, 10);
  return Number.isFinite(n) ? n : 0;
}

/** 抓取 GitHub Trending 页（日/周/月榜） */
async function fetchGitHubTrendingPage(
  timeWindow: DiscoveryTimeWindow,
  limit: number
): Promise<DiscoveryItem[]> {
  const since = timeWindowToSince(timeWindow);
  const response = await axios.get(`https://github.com/trending`, {
    params: { since },
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html'
    },
    timeout: 20000
  });

  const $ = cheerio.load(response.data);
  const items: DiscoveryItem[] = [];

  $('article.Box-row').each((_, el) => {
    if (items.length >= limit) return false;

    const titleLink = $(el).find('h2 a').first();
    const href = titleLink.attr('href')?.trim();
    if (!href) return;

    const fullName = href.replace(/^\//, '').trim();
    const description = $(el).find('p.col-9').text().trim();
    const starsText = $(el).find('a[href$="/stargazers"]').first().text().trim()
      || $(el).find('svg.octicon-star').parent().text().trim();
    const forksText = $(el).find('a[href$="/forks"]').first().text().trim();
    const stars = parseStarCount(starsText);
    const forks = parseStarCount(forksText);
    const lang = $(el).find('[itemprop="programmingLanguage"]').text().trim();

    const parts: string[] = [];
    if (lang) parts.push(lang);
    if (description) parts.push(description);

    items.push({
      title: fullName,
      content: parts.join(' · ') || `GitHub 趋势仓库`,
      url: `https://github.com${href}`,
      source: 'github',
      sourceId: fullName,
      score: stars,
      likeCount: forks,
      metricLabels: {
        primary: 'Star 数',
        primaryValue: stars,
        secondary: forks > 0 ? 'Fork 数' : undefined,
        secondaryValue: forks > 0 ? forks : undefined
      },
      author: {
        name: fullName.split('/')[0] ?? fullName,
        username: fullName.split('/')[0]
      }
    });
  });

  return items;
}

interface GitHubRepoSearch {
  items: Array<{
    id: number;
    full_name: string;
    html_url: string;
    description: string | null;
    stargazers_count: number;
    forks_count: number;
    updated_at: string;
    owner: { login: string };
  }>;
}

/** Search API 补充：按 star/fork/更新时间排序 */
async function fetchGitHubSearch(
  timeWindow: DiscoveryTimeWindow,
  sortBy: DiscoverySortMetric,
  query: string | undefined,
  limit: number
): Promise<DiscoveryItem[]> {
  const token = process.env.GITHUB_TOKEN?.trim();
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': USER_AGENT
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const sort =
    sortBy === 'forks' ? 'forks' : sortBy === 'updated' ? 'updated' : 'stars';
  const qParts = [`pushed:>=${pushedAfter(timeWindow)}`];
  if (query?.trim()) {
    qParts.unshift(`${query.trim()} in:name,description`);
  } else {
    qParts.unshift('stars:>50');
  }

  const response = await axios.get<GitHubRepoSearch>(
    'https://api.github.com/search/repositories',
    {
      params: {
        q: qParts.join(' '),
        sort,
        order: 'desc',
        per_page: Math.min(limit, 30)
      },
      headers,
      timeout: 15000
    }
  );

  return response.data.items.map((repo) => {
    const updatedText = formatRepoUpdatedAt(repo.updated_at);
    const desc = repo.description?.trim();
    const contentParts = [desc, `⭐ ${repo.stargazers_count.toLocaleString()}`, updatedText].filter(
      Boolean
    );

    return {
      title: repo.full_name,
      content: contentParts.join(' · '),
      url: repo.html_url,
      source: 'github' as const,
      sourceId: String(repo.id),
      publishedAt: repo.updated_at,
      score: repo.stargazers_count,
      likeCount: repo.forks_count,
      metricLabels: {
        primary: 'Star 数',
        primaryValue: repo.stargazers_count,
        secondary: repo.forks_count > 0 ? 'Fork 数' : undefined,
        secondaryValue: repo.forks_count > 0 ? repo.forks_count : undefined
      },
      author: {
        name: repo.owner.login,
        username: repo.owner.login
      }
    };
  });
}

function formatRepoUpdatedAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `推送 ${d.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })}`;
}

/** 需 Search API 的排序（Trending 页无推送时间） */
function needsSearchApi(sortBy: DiscoverySortMetric): boolean {
  return sortBy === 'updated' || sortBy === 'forks' || sortBy === 'stars';
}

function sortItems(items: DiscoveryItem[], sortBy: DiscoverySortMetric): DiscoveryItem[] {
  const sorted = [...items];
  sorted.sort((a, b) => {
    switch (sortBy) {
      case 'forks':
        return (b.likeCount ?? 0) - (a.likeCount ?? 0);
      case 'updated':
        return (
          new Date(b.publishedAt ?? 0).getTime() -
          new Date(a.publishedAt ?? 0).getTime()
        );
      case 'stars':
      case 'hot':
      default:
        return (b.score ?? 0) - (a.score ?? 0);
    }
  });
  return sorted;
}

export const githubDiscoveryAdapter: PlatformDiscoveryAdapter = {
  source: 'github',
  capabilities: {
    trending: true,
    search: true,
    timeWindows: ['today', '7d', '30d'],
    sortMetrics: [
      { value: 'hot', label: '综合热度' },
      { value: 'stars', label: 'Star 数' },
      { value: 'forks', label: 'Fork 数' },
      { value: 'updated', label: '最近更新' }
    ]
  },

  async discover(params: DiscoveryParams): Promise<DiscoveryItem[]> {
    const limit = params.limit ?? 30;
    const timeWindow = params.timeWindow ?? 'today';
    const sortBy = params.sortBy ?? 'hot';

    if (params.mode === 'search' && params.query?.trim()) {
      return sortItems(
        await fetchGitHubSearch(timeWindow, sortBy, params.query, limit),
        sortBy
      ).slice(0, limit);
    }

    // 「最近更新 / Star / Fork」必须用 Search API（带 pushed 时间过滤），不能用 Trending 页
    if (needsSearchApi(sortBy)) {
      const items = await fetchGitHubSearch(timeWindow, sortBy, undefined, limit);
      return sortItems(items, sortBy).slice(0, limit);
    }

    let items: DiscoveryItem[];
    try {
      items = await fetchGitHubTrendingPage(timeWindow, limit);
    } catch (err) {
      console.warn('GitHub trending scrape failed, falling back to search API:', err);
      items = await fetchGitHubSearch(timeWindow, sortBy, undefined, limit);
    }

    if (items.length < 5) {
      const extra = await fetchGitHubSearch(timeWindow, sortBy, undefined, limit);
      const seen = new Set(items.map((i) => i.url));
      for (const item of extra) {
        if (!seen.has(item.url)) items.push(item);
      }
    }

    return sortItems(items, sortBy).slice(0, limit);
  }
};
