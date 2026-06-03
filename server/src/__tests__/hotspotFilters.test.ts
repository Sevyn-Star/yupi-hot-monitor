import { describe, it, expect } from 'vitest';
import {
  filterByFreshness,
  prioritizeResults,
  shouldSkipByRelevanceRules
} from '../jobs/hotspotFilters.js';
import type { SearchResult } from '../types.js';

function makeResult(overrides: Partial<SearchResult>): SearchResult {
  return {
    title: 't',
    content: 'c',
    url: `https://example.com/${Math.random()}`,
    source: 'bing',
    ...overrides
  } as SearchResult;
}

describe('filterByFreshness', () => {
  it('保留无发布时间的条目', () => {
    const results = [makeResult({ publishedAt: undefined })];
    expect(filterByFreshness(results, 24)).toHaveLength(1);
  });

  it('过滤超过 maxAgeHours 的条目', () => {
    const old = new Date(Date.now() - 48 * 3600 * 1000);
    const recent = new Date();
    const results = [
      makeResult({ publishedAt: old }),
      makeResult({ publishedAt: recent })
    ];
    expect(filterByFreshness(results, 24)).toHaveLength(1);
  });
});

describe('prioritizeResults', () => {
  it('Twitter 排在 Bing 之前', () => {
    const results = [
      makeResult({ source: 'bing', url: 'https://a.com/1' }),
      makeResult({ source: 'twitter', url: 'https://a.com/2' })
    ];
    const sorted = prioritizeResults(results);
    expect(sorted[0].source).toBe('twitter');
  });
});

describe('shouldSkipByRelevanceRules', () => {
  it('假内容', () => {
    expect(shouldSkipByRelevanceRules({ isReal: false, relevance: 90 })).toBe('fake');
  });

  it('低相关性', () => {
    expect(shouldSkipByRelevanceRules({ isReal: true, relevance: 40 })).toBe('low_relevance');
  });

  it('未提及且相关性不足 65', () => {
    expect(
      shouldSkipByRelevanceRules({
        isReal: true,
        relevance: 60,
        keywordMentioned: false
      })
    ).toBe('not_mentioned');
  });

  it('通过阈值', () => {
    expect(
      shouldSkipByRelevanceRules({
        isReal: true,
        relevance: 80,
        keywordMentioned: true
      })
    ).toBeNull();
  });
});
