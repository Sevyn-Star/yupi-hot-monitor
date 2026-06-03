import { searchTwitter } from './twitter.js';
import {
  searchBing,
  searchGoogle,
  searchDuckDuckGo,
  searchHackerNews
} from './search.js';
import { searchGitHub, searchHuggingFace } from './communitySearch.js';
import { searchSogou, searchBilibili, searchWeibo } from './chinaSearch.js';
import type { SourceId } from './settings.js';
import { SOURCE_IDS } from './settings.js';
import { log } from '../utils/logger.js';

export interface SourceHealthResult {
  source: string;
  label: string;
  status: 'ok' | 'failed' | 'skipped';
  count: number;
  latencyMs: number;
  error?: string;
  checkedAt: string;
}

export interface SourcesHealthReport {
  query: string;
  checkedAt: string;
  results: SourceHealthResult[];
  summary: { ok: number; failed: number; skipped: number };
}

const LABELS: Record<SourceId, string> = {
  twitter: 'Twitter',
  bing: 'Bing',
  google: 'Google',
  duckduckgo: 'DuckDuckGo',
  hackernews: 'Hacker News',
  github: 'GitHub',
  huggingface: 'Hugging Face',
  sogou: '搜狗',
  bilibili: 'Bilibili',
  weibo: '微博'
};

const FETCHERS: Record<SourceId, (q: string) => Promise<unknown[]>> = {
  twitter: searchTwitter,
  bing: searchBing,
  google: searchGoogle,
  duckduckgo: searchDuckDuckGo,
  hackernews: searchHackerNews,
  github: searchGitHub,
  huggingface: searchHuggingFace,
  sogou: searchSogou,
  bilibili: searchBilibili,
  weibo: searchWeibo
};

let cachedReport: SourcesHealthReport | null = null;
let cachedAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

export async function checkSourcesHealth(
  enabledSources: SourceId[] = [...SOURCE_IDS],
  query = 'AI',
  options?: { force?: boolean }
): Promise<SourcesHealthReport> {
  const now = Date.now();
  if (!options?.force && cachedReport && now - cachedAt < CACHE_TTL_MS) {
    return cachedReport;
  }

  const checkedAt = new Date().toISOString();
  const results: SourceHealthResult[] = [];

  for (const id of SOURCE_IDS) {
    if (!enabledSources.includes(id)) {
      results.push({
        source: id,
        label: LABELS[id],
        status: 'skipped',
        count: 0,
        latencyMs: 0,
        checkedAt
      });
      continue;
    }

    const start = Date.now();
    try {
      const items = await FETCHERS[id](query);
      const latencyMs = Date.now() - start;
      results.push({
        source: id,
        label: LABELS[id],
        status: 'ok',
        count: items.length,
        latencyMs,
        checkedAt
      });
      log.info('source.health.ok', { source: id, count: items.length, latencyMs });
    } catch (error) {
      const latencyMs = Date.now() - start;
      const message = error instanceof Error ? error.message : String(error);
      results.push({
        source: id,
        label: LABELS[id],
        status: 'failed',
        count: 0,
        latencyMs,
        error: message,
        checkedAt
      });
      log.warn('source.health.failed', { source: id, error: message });
    }
  }

  const report: SourcesHealthReport = {
    query,
    checkedAt,
    results,
    summary: {
      ok: results.filter((r) => r.status === 'ok').length,
      failed: results.filter((r) => r.status === 'failed').length,
      skipped: results.filter((r) => r.status === 'skipped').length
    }
  };

  cachedReport = report;
  cachedAt = now;
  return report;
}

export function getCachedSourcesHealth(): SourcesHealthReport | null {
  if (!cachedReport || Date.now() - cachedAt >= CACHE_TTL_MS) return null;
  return cachedReport;
}
