import { searchTwitter } from './twitter.js';
import {
  searchBing,
  searchGoogle,
  searchDuckDuckGo,
  searchHackerNews,
  deduplicateResults
} from './search.js';
import { searchGitHub, searchHuggingFace } from './communitySearch.js';
import {
  searchSogou,
  searchBilibili,
  searchWeibo,
  detectAndFetchAccount
} from './chinaSearch.js';
import type { SourceId } from './settings.js';
import { SOURCE_IDS } from './settings.js';
import type { SearchResult } from '../types.js';
import { getDiscoveryAdapter } from './discovery/registry.js';
import type { DiscoveryTimeWindow } from './discovery/types.js';
import {
  discoveryItemsToSearchResults,
  filterSearchResultsByTimeWindow,
  mapSortByForDiscovery,
  sortSearchResults
} from './searchPostProcess.js';

export interface SourceFetchStat {
  source: string;
  status: 'ok' | 'failed' | 'skipped';
  count: number;
  error?: string;
}

export interface AggregateSearchResult {
  results: SearchResult[];
  sourceStats: SourceFetchStat[];
  accountResultsCount: number;
}

export interface AggregateSearchOptions {
  includeAccountDetection?: boolean;
  timeWindow?: DiscoveryTimeWindow;
  sortBy?: string;
}

type SourceFetcher = (query: string) => Promise<SearchResult[]>;

async function fetchSourceResults(
  id: SourceId,
  query: string,
  options?: AggregateSearchOptions
): Promise<SearchResult[]> {
  const adapter = getDiscoveryAdapter(id);
  const wantsDiscovery =
    adapter?.capabilities.search &&
    (options?.timeWindow ||
      (options?.sortBy && options.sortBy !== 'relevance'));

  if (wantsDiscovery && adapter) {
    const items = await adapter.discover({
      source: id,
      mode: 'search',
      query,
      timeWindow: options?.timeWindow ?? '30d',
      sortBy: mapSortByForDiscovery(options?.sortBy ?? 'hot'),
      limit: 25
    });
    return discoveryItemsToSearchResults(items);
  }

  let results = await FETCHERS[id].fetch(query);
  if (options?.timeWindow) {
    results = filterSearchResultsByTimeWindow(results, options.timeWindow);
  }
  if (options?.sortBy && options.sortBy !== 'relevance') {
    results = sortSearchResults(results, options.sortBy);
  }
  return results;
}

const FETCHERS: Record<SourceId, { label: string; fetch: SourceFetcher }> = {
  twitter: { label: 'Twitter', fetch: searchTwitter },
  bing: { label: 'Bing', fetch: searchBing },
  google: { label: 'Google', fetch: searchGoogle },
  duckduckgo: { label: 'DuckDuckGo', fetch: searchDuckDuckGo },
  hackernews: { label: 'HackerNews', fetch: searchHackerNews },
  github: { label: 'GitHub', fetch: searchGitHub },
  huggingface: { label: 'Hugging Face', fetch: searchHuggingFace },
  sogou: { label: 'Sogou', fetch: searchSogou },
  bilibili: { label: 'Bilibili', fetch: searchBilibili },
  weibo: { label: 'Weibo', fetch: searchWeibo }
};

export async function searchAllSources(
  query: string,
  enabledSources: SourceId[] = [...SOURCE_IDS],
  options?: AggregateSearchOptions
): Promise<AggregateSearchResult> {
  const includeAccount = options?.includeAccountDetection ?? true;
  const sourceStats: SourceFetchStat[] = [];
  const allResults: SearchResult[] = [];
  let accountResultsCount = 0;

  if (includeAccount) {
    try {
      const accountResult = await detectAndFetchAccount(query);
      if (accountResult.results.length > 0) {
        allResults.push(...accountResult.results);
        accountResultsCount = accountResult.results.length;
        sourceStats.push({
          source: 'account',
          status: 'ok',
          count: accountResult.results.length
        });
      }
    } catch (error) {
      sourceStats.push({
        source: 'account',
        status: 'failed',
        count: 0,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  const activeSources = enabledSources.filter((id) => SOURCE_IDS.includes(id));

  const settled = await Promise.allSettled(
    activeSources.map(async (id) => {
      const items = await fetchSourceResults(id, query, options);
      return { id, items };
    })
  );

  for (let i = 0; i < activeSources.length; i++) {
    const id = activeSources[i];
    const result = settled[i];
    const label = FETCHERS[id].label;

    if (result.status === 'fulfilled') {
      allResults.push(...result.value.items);
      sourceStats.push({
        source: id,
        status: 'ok',
        count: result.value.items.length
      });
      console.log(`  ${label}: ${result.value.items.length} results`);
    } else {
      const reason = result.reason;
      sourceStats.push({
        source: id,
        status: 'failed',
        count: 0,
        error: reason instanceof Error ? reason.message : String(reason)
      });
      console.log(`  ${label}: failed - ${reason}`);
    }
  }

  for (const id of SOURCE_IDS) {
    if (!activeSources.includes(id)) {
      sourceStats.push({ source: id, status: 'skipped', count: 0 });
    }
  }

  let results = deduplicateResults(allResults);

  if (options?.sortBy && options.sortBy !== 'relevance' && activeSources.length > 1) {
    results = sortSearchResults(results, options.sortBy);
  }

  return {
    results,
    sourceStats,
    accountResultsCount
  };
}
