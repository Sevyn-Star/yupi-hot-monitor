import { prisma } from '../../db.js';
import type { DiscoveryItem } from './types.js';
import type { DiscoveryInsightPayload, InsightPeriod } from './insightTypes.js';
import { extractKeywordCandidates } from './keywordExtract.js';
import { loadSnapshotItems, mergeCurrentItems } from './insightSnapshots.js';
import { buildFallbackInsight, synthesizeInsightWithAi } from './insightAi.js';

const INSIGHT_CACHE_MS = 3 * 60 * 60 * 1000;

function periodToPreviousOffset(period: InsightPeriod): number {
  switch (period) {
    case 'today':
      return 1;
    case '7d':
      return 7;
    case '30d':
      return 30;
    default:
      return 7;
  }
}

export async function getCachedInsight(params: {
  source: string;
  period: InsightPeriod;
  sortBy: string;
}): Promise<DiscoveryInsightPayload | null> {
  const since = new Date(Date.now() - INSIGHT_CACHE_MS);
  const row = await prisma.discoveryInsight.findFirst({
    where: {
      source: params.source,
      period: params.period,
      sortBy: params.sortBy,
      generatedAt: { gte: since }
    },
    orderBy: { generatedAt: 'desc' }
  });

  if (!row) return null;
  try {
    return JSON.parse(row.payload) as DiscoveryInsightPayload;
  } catch {
    return null;
  }
}

export async function generateDiscoveryInsight(params: {
  source: string;
  period: InsightPeriod;
  sortBy: string;
  currentItems?: DiscoveryItem[];
  force?: boolean;
}): Promise<DiscoveryInsightPayload> {
  if (!params.force) {
    const cached = await getCachedInsight(params);
    if (cached) return cached;
  }

  const { items: snapshotItems, snapshotIds } = await loadSnapshotItems({
    source: params.source,
    sortBy: params.sortBy,
    period: params.period
  });

  const allItems = mergeCurrentItems(snapshotItems, params.currentItems ?? []);

  const { items: prevItems } = await loadSnapshotItems({
    source: params.source,
    sortBy: params.sortBy,
    period: params.period,
    dayOffset: periodToPreviousOffset(params.period)
  });

  const prevKeywords = extractKeywordCandidates(prevItems, params.source);
  const prevTermMap = new Map(prevKeywords.map((k) => [k.term, k.score]));

  const topKeywords = extractKeywordCandidates(allItems, params.source, prevTermMap);

  const sampleTitles = [...new Set(allItems.map((x) => x.item.title))].slice(0, 25);

  const stats = {
    snapshotCount: snapshotIds.length,
    itemCount: allItems.length
  };

  const aiPart = await synthesizeInsightWithAi({
    source: params.source,
    period: params.period,
    keywords: topKeywords,
    previousTopTerms: prevKeywords.slice(0, 10).map((k) => k.term),
    sampleTitles,
    stats
  });

  const fallback = buildFallbackInsight({
    source: params.source,
    period: params.period,
    keywords: topKeywords,
    stats
  });

  const payload: DiscoveryInsightPayload = {
    period: params.period,
    source: params.source,
    themes: aiPart?.themes ?? fallback.themes,
    topKeywords,
    summary: aiPart?.summary || fallback.summary,
    vsLastPeriod: aiPart?.vsLastPeriod,
    stats: {
      ...stats,
      generatedAt: new Date().toISOString(),
      aiEnhanced: Boolean(aiPart)
    }
  };

  await prisma.discoveryInsight.create({
    data: {
      source: params.source,
      period: params.period,
      sortBy: params.sortBy,
      payload: JSON.stringify(payload),
      snapshotIds: JSON.stringify(snapshotIds)
    }
  });

  return payload;
}
