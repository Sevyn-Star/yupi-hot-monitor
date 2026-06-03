import { prisma } from '../db.js';

export interface TrendDayBucket {
  date: string;
  count: number;
}

export interface TrendSourceBucket {
  source: string;
  count: number;
}

export interface HotspotTrends {
  days: number;
  byDay: TrendDayBucket[];
  bySource: TrendSourceBucket[];
  byImportance: { importance: string; count: number }[];
  total: number;
}

export async function getHotspotTrends(days = 7): Promise<HotspotTrends> {
  const safeDays = Math.min(30, Math.max(1, days));
  const since = new Date();
  since.setDate(since.getDate() - (safeDays - 1));
  since.setHours(0, 0, 0, 0);

  const hotspots = await prisma.hotspot.findMany({
    where: { createdAt: { gte: since } },
    select: { createdAt: true, source: true, importance: true }
  });

  const dayMap = new Map<string, number>();
  const sourceMap = new Map<string, number>();
  const importanceMap = new Map<string, number>();

  for (let i = 0; i < safeDays; i++) {
    const d = new Date(since);
    d.setDate(since.getDate() + i);
    dayMap.set(d.toISOString().slice(0, 10), 0);
  }

  for (const h of hotspots) {
    const key = h.createdAt.toISOString().slice(0, 10);
    dayMap.set(key, (dayMap.get(key) ?? 0) + 1);
    sourceMap.set(h.source, (sourceMap.get(h.source) ?? 0) + 1);
    importanceMap.set(h.importance, (importanceMap.get(h.importance) ?? 0) + 1);
  }

  return {
    days: safeDays,
    byDay: [...dayMap.entries()].map(([date, count]) => ({ date, count })),
    bySource: [...sourceMap.entries()]
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count),
    byImportance: [...importanceMap.entries()].map(([importance, count]) => ({
      importance,
      count
    })),
    total: hotspots.length
  };
}
