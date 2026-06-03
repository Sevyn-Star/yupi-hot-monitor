import { Router } from 'express';
import { prisma } from '../db.js';
import { sortHotspots } from '../utils/sortHotspots.js';
import { getAppSettings, type SourceId } from '../services/settings.js';
import { searchAllSources } from '../services/aggregateSearch.js';
import { analyzeContent } from '../services/ai.js';
import {
  generateHotspotReportMarkdown,
  type ReportRange
} from '../services/report.js';
import { getHotspotTrends } from '../services/trends.js';
import { persistHotspot, resolveKeywordId } from '../services/persistHotspot.js';

const router = Router();

const REPORT_RANGES = new Set<ReportRange>(['today', '7d', '30d']);

// 获取所有热点
router.get('/', async (req, res) => {
  try {
    const { 
      page = '1', 
      limit = '20', 
      source, 
      importance,
      keywordId,
      isReal,
      timeRange,
      timeFrom,
      timeTo,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (source) where.source = source;
    if (importance) where.importance = importance;
    if (keywordId) where.keywordId = keywordId;
    if (isReal !== undefined && isReal !== '') {
      where.isReal = isReal === 'true';
    }

    // 时间范围筛选
    if (timeRange) {
      const now = new Date();
      let dateFrom: Date | null = null;
      switch (timeRange) {
        case '1h':
          dateFrom = new Date(now.getTime() - 60 * 60 * 1000);
          break;
        case 'today':
          dateFrom = new Date(now);
          dateFrom.setHours(0, 0, 0, 0);
          break;
        case '7d':
          dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
      }
      if (dateFrom) {
        where.createdAt = { gte: dateFrom };
      }
    } else if (timeFrom || timeTo) {
      where.createdAt = {};
      if (timeFrom) where.createdAt.gte = new Date(timeFrom as string);
      if (timeTo) where.createdAt.lte = new Date(timeTo as string);
    }

    // 排序处理
    let orderBy: any;
    const sort = sortBy as string;
    const order = (sortOrder as string) === 'asc' ? 'asc' : 'desc';

    // importance 和 hot 需要在内存中排序（Prisma 不支持自定义排序）
    const needsMemorySort = sort === 'importance' || sort === 'hot';

    switch (sort) {
      case 'publishedAt':
        orderBy = [{ publishedAt: order }, { createdAt: 'desc' }];
        break;
      case 'relevance':
        orderBy = { relevance: order };
        break;
      case 'importance':
      case 'hot':
        orderBy = { createdAt: 'desc' };
        break;
      default:
        orderBy = { createdAt: order };
        break;
    }

    const [rawHotspots, total] = await Promise.all([
      prisma.hotspot.findMany({
        where,
        orderBy,
        ...(needsMemorySort ? {} : { skip, take: limitNum }),
        include: {
          keyword: {
            select: { id: true, text: true, category: true }
          }
        }
      }),
      prisma.hotspot.count({ where })
    ]);

    let hotspots;
    if (needsMemorySort) {
      const sorted = sortHotspots(rawHotspots, sort, order as 'asc' | 'desc');
      hotspots = sorted.slice(skip, skip + limitNum);
    } else {
      hotspots = rawHotspots;
    }

    res.json({
      data: hotspots,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Error fetching hotspots:', error);
    res.status(500).json({ error: 'Failed to fetch hotspots' });
  }
});

// 近 N 天热点趋势
router.get('/trends', async (req, res) => {
  try {
    const days = parseInt((req.query.days as string) || '7', 10);
    const trends = await getHotspotTrends(days);
    res.json(trends);
  } catch (error) {
    console.error('Error fetching trends:', error);
    res.status(500).json({ error: 'Failed to fetch trends' });
  }
});

// 获取热点统计
router.get('/stats', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalHotspots,
      todayHotspots,
      urgentHotspots,
      sourceStats
    ] = await Promise.all([
      prisma.hotspot.count(),
      prisma.hotspot.count({
        where: { createdAt: { gte: today } }
      }),
      prisma.hotspot.count({
        where: { importance: 'urgent' }
      }),
      prisma.hotspot.groupBy({
        by: ['source'],
        _count: { source: true }
      })
    ]);

    res.json({
      total: totalHotspots,
      today: todayHotspots,
      urgent: urgentHotspots,
      bySource: sourceStats.reduce((acc: Record<string, number>, item: { source: string; _count: { source: number } }) => {
        acc[item.source] = item._count.source;
        return acc;
      }, {} as Record<string, number>)
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Markdown 热点报告（今日 / 7 天 / 30 天）
router.get('/report', async (req, res) => {
  try {
    const raw = (req.query.range as string) || '7d';
    const range = REPORT_RANGES.has(raw as ReportRange)
      ? (raw as ReportRange)
      : '7d';
    const result = await generateHotspotReportMarkdown(range);
    const accept = req.headers.accept || '';
    if (accept.includes('text/markdown')) {
      res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="hotpulse-report-${range}.md"`
      );
      return res.send(result.markdown);
    }
    res.json(result);
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

// 获取单个热点
router.get('/:id', async (req, res) => {
  try {
    const hotspot = await prisma.hotspot.findUnique({
      where: { id: req.params.id },
      include: {
        keyword: true
      }
    });

    if (!hotspot) {
      return res.status(404).json({ error: 'Hotspot not found' });
    }

    res.json(hotspot);
  } catch (error) {
    console.error('Error fetching hotspot:', error);
    res.status(500).json({ error: 'Failed to fetch hotspot' });
  }
});

// 将搜索结果或手动条目保存入库
router.post('/save', async (req, res) => {
  try {
    const { items, keywordId, keywordText } = req.body as {
      items?: unknown[];
      keywordId?: string;
      keywordText?: string;
    };

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'items array is required' });
    }

    const resolvedKeywordId = await resolveKeywordId(keywordId, keywordText);
    let created = 0;
    let updated = 0;
    const saved: unknown[] = [];

    for (const raw of items.slice(0, 20)) {
      const item = raw as Record<string, unknown>;
      if (!item.title || !item.url || !item.source) continue;

      const { hotspot, created: isNew } = await persistHotspot(
        {
          title: String(item.title),
          content: String(item.content || item.title),
          url: String(item.url),
          source: String(item.source),
          sourceId: item.sourceId != null ? String(item.sourceId) : null,
          isReal: item.isReal !== false,
          relevance: Number(item.relevance) || 50,
          relevanceReason:
            item.relevanceReason != null ? String(item.relevanceReason) : null,
          keywordMentioned:
            item.keywordMentioned != null ? Boolean(item.keywordMentioned) : null,
          importance: String(item.importance || 'medium'),
          summary: item.summary != null ? String(item.summary) : null,
          viewCount: item.viewCount != null ? Number(item.viewCount) : null,
          likeCount: item.likeCount != null ? Number(item.likeCount) : null,
          retweetCount: item.retweetCount != null ? Number(item.retweetCount) : null,
          replyCount: item.replyCount != null ? Number(item.replyCount) : null,
          commentCount: item.commentCount != null ? Number(item.commentCount) : null,
          quoteCount: item.quoteCount != null ? Number(item.quoteCount) : null,
          danmakuCount: item.danmakuCount != null ? Number(item.danmakuCount) : null,
          authorName: item.authorName != null ? String(item.authorName) : null,
          authorUsername:
            item.authorUsername != null ? String(item.authorUsername) : null,
          authorAvatar: item.authorAvatar != null ? String(item.authorAvatar) : null,
          authorFollowers:
            item.authorFollowers != null ? Number(item.authorFollowers) : null,
          authorVerified:
            item.authorVerified != null ? Boolean(item.authorVerified) : null,
          publishedAt:
            item.publishedAt != null ? String(item.publishedAt) : null
        },
        resolvedKeywordId,
        { createNotification: true }
      );

      if (isNew) created++;
      else updated++;
      saved.push(hotspot);
    }

    res.status(201).json({ created, updated, saved });
  } catch (error) {
    console.error('Error saving hotspots:', error);
    res.status(500).json({ error: 'Failed to save hotspots' });
  }
});

// 手动搜索热点（与定时监控共用多源聚合）
router.post('/search', async (req, res) => {
  try {
    const {
      query,
      sources: sourcesOverride,
      timeWindow,
      sortBy
    } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const validTimeWindows = ['today', '7d', '30d'] as const;
    const searchTimeWindow =
      typeof timeWindow === 'string' &&
      validTimeWindows.includes(timeWindow as (typeof validTimeWindows)[number])
        ? (timeWindow as (typeof validTimeWindows)[number])
        : undefined;

    const searchSortBy = typeof sortBy === 'string' && sortBy ? sortBy : undefined;

    const appSettings = await getAppSettings();
    let enabledSources = appSettings.enabledSources;
    if (Array.isArray(sourcesOverride) && sourcesOverride.length > 0) {
      enabledSources = sourcesOverride.filter((s: string) =>
        appSettings.enabledSources.includes(s as SourceId)
      ) as SourceId[];
      if (enabledSources.length === 0) {
        enabledSources = appSettings.enabledSources;
      }
    }

    const { results, sourceStats } = await searchAllSources(query, enabledSources, {
      includeAccountDetection: enabledSources.length !== 1,
      timeWindow: searchTimeWindow,
      sortBy: searchSortBy
    });

    const analyzedResults = await Promise.all(
      results.slice(0, 15).map(async (item) => {
        try {
          const analysis = await analyzeContent(
            item.title + ' ' + item.content,
            query
          );
          return {
            id: `search-${item.source}-${Buffer.from(item.url).toString('base64url').slice(0, 12)}`,
            title: item.title,
            content: item.content,
            url: item.url,
            source: item.source,
            sourceId: item.sourceId ?? null,
            isReal: analysis.isReal,
            relevance: analysis.relevance,
            relevanceReason: analysis.relevanceReason,
            keywordMentioned: analysis.keywordMentioned,
            importance: analysis.importance,
            summary: analysis.summary,
            viewCount: item.viewCount ?? null,
            likeCount: item.likeCount ?? null,
            retweetCount: item.retweetCount ?? null,
            replyCount: item.replyCount ?? null,
            commentCount: item.commentCount ?? null,
            quoteCount: item.quoteCount ?? null,
            danmakuCount: item.danmakuCount ?? null,
            authorName: item.author?.name ?? null,
            authorUsername: item.author?.username ?? null,
            authorAvatar: item.author?.avatar ?? null,
            authorFollowers: item.author?.followers ?? null,
            authorVerified: item.author?.verified ?? null,
            publishedAt: item.publishedAt?.toISOString() ?? null,
            createdAt: new Date().toISOString(),
            keyword: null,
            analysis
          };
        } catch {
          return null;
        }
      })
    );

    res.json({
      results: analyzedResults.filter(Boolean),
      sourceStats
    });
  } catch (error) {
    console.error('Error searching hotspots:', error);
    res.status(500).json({ error: 'Failed to search hotspots' });
  }
});

// 删除热点
router.delete('/:id', async (req, res) => {
  try {
    await prisma.hotspot.delete({
      where: { id: req.params.id }
    });

    res.status(204).send();
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Hotspot not found' });
    }
    console.error('Error deleting hotspot:', error);
    res.status(500).json({ error: 'Failed to delete hotspot' });
  }
});

export default router;
