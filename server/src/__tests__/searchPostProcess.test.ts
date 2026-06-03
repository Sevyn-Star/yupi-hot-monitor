import { describe, it, expect } from 'vitest';
import {
  filterSearchResultsByTimeWindow,
  sortSearchResults,
  discoveryItemsToSearchResults
} from '../services/searchPostProcess.js';
import type { SearchResult } from '../types.js';

describe('searchPostProcess', () => {
  it('sortSearchResults by views and stars', () => {
    const items: SearchResult[] = [
      { title: 'a', content: '', url: 'https://a.com', source: 'bing', viewCount: 10 },
      { title: 'b', content: '', url: 'https://b.com', source: 'github', viewCount: 100, score: 5 },
      { title: 'c', content: '', url: 'https://c.com', source: 'github', score: 50 }
    ];
    const byViews = sortSearchResults(items, 'views');
    expect(byViews[0].viewCount).toBe(100);
    const byStars = sortSearchResults(items, 'stars');
    expect(byStars[0].score).toBe(50);
  });

  it('filterSearchResultsByTimeWindow keeps recent only', () => {
    const old = new Date();
    old.setDate(old.getDate() - 10);
    const recent = new Date();
    const items: SearchResult[] = [
      {
        title: 'old',
        content: '',
        url: 'https://old.com',
        source: 'bing',
        publishedAt: old
      },
      {
        title: 'new',
        content: '',
        url: 'https://new.com',
        source: 'bing',
        publishedAt: recent
      }
    ];
    const filtered = filterSearchResultsByTimeWindow(items, '7d');
    expect(filtered).toHaveLength(1);
    expect(filtered[0].title).toBe('new');
  });

  it('discoveryItemsToSearchResults maps fields', () => {
    const mapped = discoveryItemsToSearchResults([
      {
        title: 'repo',
        content: 'desc',
        url: 'https://github.com/x/y',
        source: 'github',
        viewCount: 1,
        score: 99,
        metricLabels: { primary: 'Star 数', primaryValue: 99 }
      }
    ]);
    expect(mapped[0].score).toBe(99);
    expect(mapped[0].source).toBe('github');
  });
});
