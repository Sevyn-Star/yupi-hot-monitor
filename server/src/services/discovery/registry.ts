import type { SourceId } from '../settings.js';
import { githubDiscoveryAdapter } from './githubAdapter.js';
import { weiboDiscoveryAdapter } from './weiboAdapter.js';
import { hackernewsDiscoveryAdapter } from './hackernewsAdapter.js';
import { bilibiliDiscoveryAdapter } from './bilibiliAdapter.js';
import { huggingfaceDiscoveryAdapter } from './huggingfaceAdapter.js';
import type { DiscoveryCapabilities, PlatformDiscoveryAdapter } from './types.js';

/** 不支持纯榜单的搜索引擎（仅关键词搜索，Phase 1 不接入发现） */
export const DISCOVERY_EXCLUDED_SOURCES: SourceId[] = [
  'bing',
  'google',
  'duckduckgo',
  'sogou'
];

export const DISCOVERY_ADAPTERS: Partial<Record<SourceId, PlatformDiscoveryAdapter>> = {
  github: githubDiscoveryAdapter,
  weibo: weiboDiscoveryAdapter,
  hackernews: hackernewsDiscoveryAdapter,
  bilibili: bilibiliDiscoveryAdapter,
  huggingface: huggingfaceDiscoveryAdapter
};

/** 已接入平台发现的所有源（按展示顺序） */
export const DISCOVERY_SOURCE_IDS: SourceId[] = [
  'github',
  'weibo',
  'hackernews',
  'bilibili',
  'huggingface'
];

export function getDiscoveryAdapter(source: SourceId): PlatformDiscoveryAdapter | null {
  return DISCOVERY_ADAPTERS[source] ?? null;
}

export function listDiscoveryCapabilities(): {
  source: SourceId;
  label: string;
  capabilities: DiscoveryCapabilities;
  available: boolean;
}[] {
  const labels: Record<string, string> = {
    github: 'GitHub',
    weibo: '微博热搜',
    hackernews: 'Hacker News',
    bilibili: 'Bilibili',
    huggingface: 'Hugging Face',
    twitter: 'Twitter / X',
    bing: 'Bing',
    google: 'Google',
    duckduckgo: 'DuckDuckGo',
    sogou: '搜狗'
  };

  return DISCOVERY_SOURCE_IDS.map((source) => {
    const adapter = DISCOVERY_ADAPTERS[source];
    return {
      source,
      label: labels[source] ?? source,
      capabilities: adapter!.capabilities,
      available: Boolean(adapter)
    };
  });
}
