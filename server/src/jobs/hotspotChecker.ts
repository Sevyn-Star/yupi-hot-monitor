import { Server } from 'socket.io';
import { prisma } from '../db.js';
import { searchAllSources } from '../services/aggregateSearch.js';
import { analyzeContent, expandKeyword, preMatchKeyword } from '../services/ai.js';
import { sendHotspotEmail } from '../services/email.js';
import { sendHotspotWebhook } from '../services/webhook.js';
import { getAppSettings } from '../services/settings.js';
import { resetAiStatsForScan, getCurrentScanAiStats } from '../services/aiStats.js';
import {
  setCurrentKeyword,
  setLastSourceStats,
  setPendingRunDetails,
  emptyFilterStats,
  type ScanFilterStats,
  type KeywordScanSummary
} from '../services/scanStatus.js';
import { log } from '../utils/logger.js';
import {
  filterByFreshness,
  prioritizeResults,
  shouldSkipByRelevanceRules,
  MAX_AGE_HOURS
} from './hotspotFilters.js';

const TWITTER_QUOTA = 15;
const OTHER_QUOTA = 10;

function mergeFilterStats(target: ScanFilterStats, add: ScanFilterStats): void {
  (Object.keys(target) as (keyof ScanFilterStats)[]).forEach((k) => {
    target[k] += add[k];
  });
}

export async function runHotspotCheck(io: Server): Promise<{
  newHotspotsCount: number;
  keywordsChecked: number;
}> {
  resetAiStatsForScan();
  const totalFilterStats = emptyFilterStats();
  const keywordSummaries: KeywordScanSummary[] = [];

  log.info('hotspot.check.start');

  const appSettings = await getAppSettings();

  const keywords = await prisma.keyword.findMany({
    where: { isActive: true }
  });

  if (keywords.length === 0) {
    log.info('hotspot.check.no_keywords');
    setPendingRunDetails({
      filterStats: totalFilterStats,
      keywordSummaries: [],
      aiCalls: getCurrentScanAiStats()
    });
    return { newHotspotsCount: 0, keywordsChecked: 0 };
  }

  let newHotspotsCount = 0;

  for (const keyword of keywords) {
    const keywordStart = Date.now();
    const kwStats = emptyFilterStats();
    let keywordNew = 0;
    let sourceStats: KeywordScanSummary['sourceStats'] = [];
    let keywordError: string | undefined;

    setCurrentKeyword(keyword.text);
    log.info('hotspot.keyword.start', { keyword: keyword.text });

    try {
      const expandedKeywords = await expandKeyword(keyword.text);

      const searchResult = await searchAllSources(
        keyword.text,
        appSettings.enabledSources,
        { includeAccountDetection: true }
      );
      sourceStats = searchResult.sourceStats;
      setLastSourceStats(sourceStats);

      kwStats.rawFetched = searchResult.results.length;
      totalFilterStats.rawFetched += searchResult.results.length;

      const freshResults = prioritizeResults(filterByFreshness(searchResult.results));
      kwStats.afterFreshness = freshResults.length;
      totalFilterStats.afterFreshness += freshResults.length;

      let twitterProcessed = 0;
      let otherProcessed = 0;

      for (const item of freshResults) {
        if (item.source === 'twitter' && twitterProcessed >= TWITTER_QUOTA) {
          kwStats.skippedQuota++;
          continue;
        }
        if (item.source !== 'twitter' && otherProcessed >= OTHER_QUOTA) {
          kwStats.skippedQuota++;
          continue;
        }
        if (twitterProcessed + otherProcessed >= TWITTER_QUOTA + OTHER_QUOTA) {
          kwStats.skippedQuota++;
          break;
        }

        try {
          const existing = await prisma.hotspot.findFirst({
            where: { url: item.url, source: item.source }
          });
          if (existing) {
            kwStats.skippedDuplicate++;
            continue;
          }

          const fullText = item.title + '\n' + item.content;
          const preMatch = preMatchKeyword(fullText, expandedKeywords);
          const analysis = await analyzeContent(fullText, keyword.text, preMatch);

          const skipReason = shouldSkipByRelevanceRules(analysis);
          if (skipReason === 'fake') {
            kwStats.skippedFake++;
            continue;
          }
          if (skipReason === 'low_relevance') {
            kwStats.skippedLowRelevance++;
            continue;
          }
          if (skipReason === 'not_mentioned') {
            kwStats.skippedNotMentioned++;
            continue;
          }

          const hotspot = await prisma.hotspot.create({
            data: {
              title: item.title,
              content: item.content,
              url: item.url,
              source: item.source,
              sourceId: item.sourceId || null,
              isReal: analysis.isReal,
              relevance: analysis.relevance,
              relevanceReason: analysis.relevanceReason || null,
              keywordMentioned: analysis.keywordMentioned ?? null,
              importance: analysis.importance,
              summary: analysis.summary,
              viewCount: item.viewCount || null,
              likeCount: item.likeCount || null,
              retweetCount: item.retweetCount || null,
              replyCount: item.replyCount || null,
              commentCount: item.commentCount || null,
              quoteCount: item.quoteCount || null,
              danmakuCount: item.danmakuCount || null,
              authorName: item.author?.name || null,
              authorUsername: item.author?.username || null,
              authorAvatar: item.author?.avatar || null,
              authorFollowers: item.author?.followers || null,
              authorVerified: item.author?.verified ?? null,
              publishedAt: item.publishedAt || null,
              keywordId: keyword.id
            },
            include: { keyword: true }
          });

          kwStats.saved++;
          keywordNew++;
          newHotspotsCount++;
          if (item.source === 'twitter') twitterProcessed++;
          else otherProcessed++;

          await prisma.notification.create({
            data: {
              type: 'hotspot',
              title: `发现新热点: ${hotspot.title.slice(0, 50)}`,
              content: analysis.summary || hotspot.content.slice(0, 100),
              hotspotId: hotspot.id
            }
          });

          io.to(`keyword:${keyword.text}`).emit('hotspot:new', hotspot);
          io.emit('notification', {
            type: 'hotspot',
            title: '发现新热点',
            content: hotspot.title,
            hotspotId: hotspot.id,
            importance: hotspot.importance
          });

          if (['high', 'urgent'].includes(analysis.importance)) {
            if (appSettings.emailNotificationsEnabled) {
              await sendHotspotEmail(hotspot);
            }
            if (appSettings.webhookNotificationsEnabled) {
              await sendHotspotWebhook({
                title: hotspot.title,
                url: hotspot.url,
                source: hotspot.source,
                importance: hotspot.importance,
                summary: hotspot.summary,
                keyword: { text: keyword.text }
              });
            }
          }
        } catch (error) {
          kwStats.processErrors++;
          log.error('hotspot.item.error', {
            keyword: keyword.text,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }

      mergeFilterStats(totalFilterStats, kwStats);

      log.info('hotspot.keyword.done', {
        keyword: keyword.text,
        raw: kwStats.rawFetched,
        fresh: kwStats.afterFreshness,
        saved: kwStats.saved,
        filtered: {
          duplicate: kwStats.skippedDuplicate,
          fake: kwStats.skippedFake,
          lowRelevance: kwStats.skippedLowRelevance,
          notMentioned: kwStats.skippedNotMentioned,
          quota: kwStats.skippedQuota
        },
        sourceStats
      });

      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (error) {
      keywordError = error instanceof Error ? error.message : String(error);
      log.error('hotspot.keyword.failed', { keyword: keyword.text, error: keywordError });
    }

    keywordSummaries.push({
      keyword: keyword.text,
      rawCount: kwStats.rawFetched,
      freshCount: kwStats.afterFreshness,
      newHotspots: keywordNew,
      filterStats: { ...kwStats },
      sourceStats,
      durationMs: Date.now() - keywordStart,
      error: keywordError
    });

    await prisma.keyword.update({
      where: { id: keyword.id },
      data: { lastScannedAt: new Date() }
    });
  }

  setCurrentKeyword(null);

  const aiCalls = getCurrentScanAiStats();
  setPendingRunDetails({
    filterStats: totalFilterStats,
    keywordSummaries,
    aiCalls
  });

  log.info('hotspot.check.complete', {
    newHotspotsCount,
    keywordsChecked: keywords.length,
    filterStats: totalFilterStats,
    aiCalls
  });

  return { newHotspotsCount, keywordsChecked: keywords.length };
}
