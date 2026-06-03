import { analyzeContent } from '../ai.js';
import type { AIAnalysis } from '../../types.js';
import type { DiscoveryItem } from './types.js';

const PLATFORM_LABELS: Record<string, string> = {
  github: 'GitHub 开源趋势',
  weibo: '微博热搜',
  hackernews: 'Hacker News 技术热点',
  bilibili: 'Bilibili 热门视频',
  huggingface: 'Hugging Face 热门模型'
};

/**
 * 平台发现场景：用平台名作为「监控主题」做 Top N AI 简析（非关键词模式）
 */
export async function analyzeDiscoveryTopItems(
  items: DiscoveryItem[],
  source: string,
  topN = 5
): Promise<Map<number, AIAnalysis>> {
  const results = new Map<number, AIAnalysis>();
  const label = PLATFORM_LABELS[source] ?? source;
  const toAnalyze = items.slice(0, topN);

  await Promise.all(
    toAnalyze.map(async (item, index) => {
      try {
        const analysis = await analyzeContent(
          `${item.title}\n${item.content}`,
          label
        );
        results.set(index, analysis);
      } catch {
        results.set(index, {
          isReal: true,
          relevance: 70,
          relevanceReason: '榜单条目默认相关',
          keywordMentioned: true,
          importance: 'medium',
          summary: item.content.slice(0, 80)
        });
      }
    })
  );

  return results;
}

export function discoveryItemToHotspot(
  item: DiscoveryItem,
  index: number,
  analysis?: AIAnalysis
) {
  return {
    id: `discover-${item.source}-${index}-${Buffer.from(item.url).toString('base64url').slice(0, 10)}`,
    title: item.title,
    content: item.content,
    url: item.url,
    source: item.source,
    sourceId: item.sourceId ?? null,
    isReal: analysis?.isReal ?? true,
    relevance: analysis?.relevance ?? 80,
    relevanceReason: analysis?.relevanceReason ?? null,
    keywordMentioned: analysis?.keywordMentioned ?? null,
    importance: (analysis?.importance ?? 'medium') as 'low' | 'medium' | 'high' | 'urgent',
    summary: analysis?.summary ?? null,
    viewCount: item.viewCount ?? null,
    likeCount: item.likeCount ?? null,
    retweetCount: null,
    replyCount: null,
    commentCount: item.commentCount ?? null,
    quoteCount: null,
    danmakuCount: null,
    authorName: item.author?.name ?? null,
    authorUsername: item.author?.username ?? null,
    authorAvatar: null,
    authorFollowers: null,
    authorVerified: null,
    publishedAt: item.publishedAt ?? null,
    createdAt: new Date().toISOString(),
    keyword: null,
    metricLabels: item.metricLabels,
    score: item.score ?? item.viewCount ?? item.metricLabels.primaryValue
  };
}
