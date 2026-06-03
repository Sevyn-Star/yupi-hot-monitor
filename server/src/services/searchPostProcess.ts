import type { SearchResult } from '../types.js';
import type { DiscoveryItem, DiscoverySortMetric, DiscoveryTimeWindow } from './discovery/types.js';

export function timeWindowToDate(timeWindow: DiscoveryTimeWindow): Date {
  const d = new Date();
  if (timeWindow === 'today') {
    d.setHours(0, 0, 0, 0);
  } else if (timeWindow === '7d') {
    d.setDate(d.getDate() - 7);
  } else {
    d.setDate(d.getDate() - 30);
  }
  return d;
}

export function discoveryItemsToSearchResults(items: DiscoveryItem[]): SearchResult[] {
  return items.map((item) => ({
    title: item.title,
    content: item.content,
    url: item.url,
    source: item.source,
    sourceId: item.sourceId,
    publishedAt: item.publishedAt ? new Date(item.publishedAt) : undefined,
    viewCount: item.viewCount,
    likeCount: item.likeCount,
    score: item.score,
    commentCount: item.commentCount,
    danmakuCount: item.danmakuCount,
    author: item.author
  }));
}

function hotScore(item: SearchResult): number {
  const likes = item.likeCount ?? 0;
  const retweets = item.retweetCount ?? 0;
  const views = item.viewCount ?? 0;
  const points = item.score ?? 0;
  return points * 10 + likes * 5 + retweets * 3 + Math.log10(Math.max(views, 1)) * 2;
}

export function sortSearchResults(
  results: SearchResult[],
  sortBy: string
): SearchResult[] {
  const sorted = [...results];
  sorted.sort((a, b) => {
    switch (sortBy) {
      case 'views':
        return (b.viewCount ?? 0) - (a.viewCount ?? 0);
      case 'likes':
        return (b.likeCount ?? 0) - (a.likeCount ?? 0);
      case 'stars':
        return (b.score ?? 0) - (a.score ?? 0);
      case 'comments':
        return (b.commentCount ?? 0) - (a.commentCount ?? 0);
      case 'publishedAt':
        return (
          new Date(b.publishedAt ?? 0).getTime() - new Date(a.publishedAt ?? 0).getTime()
        );
      case 'hot':
      default:
        return hotScore(b) - hotScore(a);
    }
  });
  return sorted;
}

export function filterSearchResultsByTimeWindow(
  results: SearchResult[],
  timeWindow: DiscoveryTimeWindow
): SearchResult[] {
  const since = timeWindowToDate(timeWindow);
  return results.filter((item) => {
    if (!item.publishedAt) return true;
    return item.publishedAt >= since;
  });
}

export function mapSortByForDiscovery(sortBy: string): DiscoverySortMetric {
  if (sortBy === 'stars') return 'stars';
  if (sortBy === 'views') return 'views';
  if (sortBy === 'comments') return 'comments';
  if (sortBy === 'likes') return 'forks';
  if (sortBy === 'publishedAt') return 'updated';
  return 'hot';
}
