import type { SearchResult } from '../types.js';

export const MAX_AGE_HOURS = 7 * 24;

export function filterByFreshness(
  results: SearchResult[],
  maxAgeHours = MAX_AGE_HOURS
): SearchResult[] {
  const cutoff = new Date(Date.now() - maxAgeHours * 3600 * 1000);
  return results.filter((item) => {
    if (!item.publishedAt) return true;
    return item.publishedAt >= cutoff;
  });
}

export function prioritizeResults(results: SearchResult[]): SearchResult[] {
  const priorityMap: Record<string, number> = {
    twitter: 1,
    weibo: 2,
    bilibili: 3,
    hackernews: 4,
    github: 5,
    huggingface: 6,
    sogou: 7,
    bing: 8,
    google: 9,
    duckduckgo: 10
  };
  return [...results].sort(
    (a, b) => (priorityMap[a.source] || 99) - (priorityMap[b.source] || 99)
  );
}

/** 是否应因相关性规则过滤（不调用 AI 的快速判断占位，实际分析在 checker 内） */
export function shouldSkipByRelevanceRules(
  analysis: {
    isReal: boolean;
    relevance: number;
    keywordMentioned?: boolean | null;
  }
): 'fake' | 'low_relevance' | 'not_mentioned' | null {
  if (!analysis.isReal) return 'fake';
  if (analysis.relevance < 50) return 'low_relevance';
  if (!analysis.keywordMentioned && analysis.relevance < 65) return 'not_mentioned';
  return null;
}
