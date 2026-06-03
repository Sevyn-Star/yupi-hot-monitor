import { Router } from 'express';
import type { SourceId } from '../services/settings.js';
import { SOURCE_IDS } from '../services/settings.js';
import {
  getDiscoveryAdapter,
  listDiscoveryCapabilities
} from '../services/discovery/registry.js';
import {
  analyzeDiscoveryTopItems,
  discoveryItemToHotspot
} from '../services/discovery/discoveryAi.js';
import {
  getSnapshotById,
  getSnapshotHistory,
  getTitleTrendSeries,
  savePlatformSnapshot
} from '../services/discovery/snapshots.js';
import type {
  DiscoveryMode,
  DiscoverySortMetric,
  DiscoveryTimeWindow
} from '../services/discovery/types.js';
import type { InsightPeriod } from '../services/discovery/insightTypes.js';
import {
  generateDiscoveryInsight,
  getCachedInsight
} from '../services/discovery/insightService.js';

const router = Router();

const cache = new Map<string, { expires: number; payload: unknown }>();
const CACHE_TTL_MS = 10 * 60 * 1000;

function cacheKey(parts: Record<string, string | number | undefined>): string {
  return Object.entries(parts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
}

function getCached<T>(key: string): T | null {
  const hit = cache.get(key);
  if (!hit || Date.now() > hit.expires) {
    cache.delete(key);
    return null;
  }
  return hit.payload as T;
}

function setCache(key: string, payload: unknown): void {
  cache.set(key, { expires: Date.now() + CACHE_TTL_MS, payload });
}

router.get('/capabilities', (_req, res) => {
  res.json({ platforms: listDiscoveryCapabilities() });
});

router.get('/snapshots', async (req, res) => {
  try {
    const source = String(req.query.source ?? '');
    const timeWindow = String(req.query.timeWindow ?? 'today');
    const sortBy = req.query.sortBy ? String(req.query.sortBy) : undefined;
    const days = req.query.days ? Number(req.query.days) : 7;

    if (!source) {
      return res.status(400).json({ error: 'source is required' });
    }

    const history = await getSnapshotHistory({
      source,
      timeWindow,
      sortBy,
      days
    });
    res.json({ history });
  } catch (error) {
    console.error('Error fetching snapshot history:', error);
    res.status(500).json({ error: 'Failed to fetch snapshot history' });
  }
});

router.get('/snapshots/:id', async (req, res) => {
  try {
    const data = await getSnapshotById(req.params.id);
    if (!data) return res.status(404).json({ error: 'Snapshot not found' });
    res.json(data);
  } catch (error) {
    console.error('Error fetching snapshot:', error);
    res.status(500).json({ error: 'Failed to fetch snapshot' });
  }
});

router.get('/trends', async (req, res) => {
  try {
    const source = String(req.query.source ?? '');
    const timeWindow = String(req.query.timeWindow ?? 'today');
    const sortBy = String(req.query.sortBy ?? 'hot');

    if (!source) {
      return res.status(400).json({ error: 'source is required' });
    }

    const series = await getTitleTrendSeries({ source, timeWindow, sortBy });
    res.json(series);
  } catch (error) {
    console.error('Error fetching discovery trends:', error);
    res.status(500).json({ error: 'Failed to fetch discovery trends' });
  }
});

const INSIGHT_PERIODS = ['today', '7d', '30d'] as const;

router.get('/insight', async (req, res) => {
  try {
    const source = String(req.query.source ?? '');
    const period = String(req.query.period ?? '7d');
    const sortBy = String(req.query.sortBy ?? 'hot');

    if (!source || !SOURCE_IDS.includes(source as SourceId)) {
      return res.status(400).json({ error: 'Invalid or missing source' });
    }
    if (!INSIGHT_PERIODS.includes(period as (typeof INSIGHT_PERIODS)[number])) {
      return res.status(400).json({ error: 'Invalid period', allowed: INSIGHT_PERIODS });
    }

    const insight = await getCachedInsight({
      source,
      period: period as InsightPeriod,
      sortBy
    });

    if (!insight) {
      return res.status(404).json({
        error: 'No insight cached yet',
        code: 'INSIGHT_NOT_FOUND',
        hint: 'POST /api/discover/insight/generate to create one'
      });
    }

    res.json({ insight });
  } catch (error) {
    console.error('Error fetching insight:', error);
    res.status(500).json({ error: 'Failed to fetch insight' });
  }
});

router.post('/insight/generate', async (req, res) => {
  try {
    const { source, period = '7d', sortBy = 'hot', currentItems, force = false } = req.body as {
      source?: string;
      period?: InsightPeriod;
      sortBy?: string;
      currentItems?: unknown[];
      force?: boolean;
    };

    if (!source || !SOURCE_IDS.includes(source as SourceId)) {
      return res.status(400).json({ error: 'Invalid or missing source' });
    }
    if (!INSIGHT_PERIODS.includes(period as (typeof INSIGHT_PERIODS)[number])) {
      return res.status(400).json({ error: 'Invalid period' });
    }

    const mappedItems = Array.isArray(currentItems)
      ? currentItems.map((row: { title?: string; content?: string; url?: string; source?: string }) => ({
          title: String(row.title ?? ''),
          content: String(row.content ?? ''),
          url: String(row.url ?? '#'),
          source: (row.source ?? source) as SourceId,
          metricLabels: { primary: '', primaryValue: 0 }
        }))
      : undefined;

    const insight = await generateDiscoveryInsight({
      source,
      period,
      sortBy,
      currentItems: mappedItems,
      force: Boolean(force)
    });

    res.json({ insight });
  } catch (error) {
    console.error('Error generating insight:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to generate insight'
    });
  }
});

router.post('/', async (req, res) => {
  try {
    const {
      source,
      mode = 'trending',
      timeWindow = 'today',
      sortBy = 'hot',
      query,
      limit = 30,
      saveSnapshot = true,
      skipAi = false
    } = req.body as {
      source?: string;
      mode?: DiscoveryMode;
      timeWindow?: DiscoveryTimeWindow;
      sortBy?: DiscoverySortMetric;
      query?: string;
      limit?: number;
      saveSnapshot?: boolean;
      skipAi?: boolean;
    };

    if (!source || !SOURCE_IDS.includes(source as SourceId)) {
      return res.status(400).json({ error: 'Invalid or missing source' });
    }

    const adapter = getDiscoveryAdapter(source as SourceId);
    if (!adapter) {
      return res.status(400).json({
        error: `Platform "${source}" does not support discovery yet`,
        code: 'DISCOVERY_NOT_SUPPORTED'
      });
    }

    if (mode === 'search' && !adapter.capabilities.search) {
      return res.status(400).json({
        error: 'This platform only supports trending lists (no keyword search in discovery)',
        code: 'SEARCH_NOT_SUPPORTED'
      });
    }

    if (mode === 'trending' && !adapter.capabilities.trending) {
      return res.status(400).json({ error: 'Trending not supported for this platform' });
    }

    const tw = (timeWindow ?? 'today') as DiscoveryTimeWindow;
    if (!adapter.capabilities.timeWindows.includes(tw)) {
      return res.status(400).json({
        error: `timeWindow "${tw}" not supported`,
        supported: adapter.capabilities.timeWindows
      });
    }

    const key = cacheKey({ source, mode, timeWindow: tw, sortBy, query, limit });
    const cached = getCached<typeof res.body>(key);

    let items;
    let cacheHit = false;

    if (cached && typeof cached === 'object' && cached !== null && 'items' in cached) {
      const c = cached as { items: unknown[] };
      items = c.items;
      cacheHit = true;
    } else {
      items = await adapter.discover({
        source: source as SourceId,
        mode,
        timeWindow: tw,
        sortBy,
        query,
        limit: Math.min(Number(limit) || 30, 50)
      });
      setCache(key, { items });
    }

    let snapshotId: string | undefined;
    if (saveSnapshot && items.length > 0 && !cacheHit) {
      snapshotId = await savePlatformSnapshot({
        source,
        timeWindow: tw,
        sortBy: sortBy ?? 'hot',
        mode,
        items
      });
    }

    const analysisMap = skipAi
      ? new Map()
      : await analyzeDiscoveryTopItems(items, source, 5);

    const results = items.map((item, index) =>
      discoveryItemToHotspot(item, index, analysisMap.get(index))
    );

    res.json({
      results,
      items,
      meta: {
        source,
        mode,
        timeWindow: tw,
        sortBy,
        capabilities: adapter.capabilities,
        fetchedAt: new Date().toISOString(),
        cacheHit,
        snapshotId,
        aiAnalyzedCount: skipAi ? 0 : Math.min(5, items.length)
      }
    });
  } catch (error) {
    console.error('Discovery error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Discovery failed'
    });
  }
});

export default router;
