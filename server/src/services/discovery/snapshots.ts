import { prisma } from '../../db.js';
import type { DiscoveryItem } from './types.js';

export async function savePlatformSnapshot(params: {
  source: string;
  timeWindow: string;
  sortBy: string;
  mode: string;
  items: DiscoveryItem[];
}): Promise<string> {
  const row = await prisma.platformSnapshot.create({
    data: {
      source: params.source,
      timeWindow: params.timeWindow,
      sortBy: params.sortBy,
      mode: params.mode,
      payload: JSON.stringify(params.items),
      itemCount: params.items.length
    }
  });
  return row.id;
}

export async function getSnapshotHistory(params: {
  source: string;
  timeWindow: string;
  sortBy?: string;
  days?: number;
  limit?: number;
}) {
  const days = params.days ?? 7;
  const since = new Date();
  since.setDate(since.getDate() - days);

  const rows = await prisma.platformSnapshot.findMany({
    where: {
      source: params.source,
      timeWindow: params.timeWindow,
      ...(params.sortBy ? { sortBy: params.sortBy } : {}),
      fetchedAt: { gte: since }
    },
    orderBy: { fetchedAt: 'asc' },
    take: params.limit ?? 100,
    select: {
      id: true,
      source: true,
      timeWindow: true,
      sortBy: true,
      mode: true,
      itemCount: true,
      fetchedAt: true
    }
  });

  return rows.map((r) => ({
    id: r.id,
    source: r.source,
    timeWindow: r.timeWindow,
    sortBy: r.sortBy,
    mode: r.mode,
    itemCount: r.itemCount,
    fetchedAt: r.fetchedAt.toISOString()
  }));
}

export async function getSnapshotById(id: string): Promise<{
  meta: { id: string; source: string; timeWindow: string; sortBy: string; fetchedAt: string };
  items: DiscoveryItem[];
} | null> {
  const row = await prisma.platformSnapshot.findUnique({ where: { id } });
  if (!row) return null;

  let items: DiscoveryItem[] = [];
  try {
    items = JSON.parse(row.payload) as DiscoveryItem[];
  } catch {
    items = [];
  }

  return {
    meta: {
      id: row.id,
      source: row.source,
      timeWindow: row.timeWindow,
      sortBy: row.sortBy,
      fetchedAt: row.fetchedAt.toISOString()
    },
    items
  };
}

/** 榜单 Top N 标题随时间的出现次数（用于简单趋势曲线） */
export async function getTitleTrendSeries(params: {
  source: string;
  timeWindow: string;
  sortBy: string;
  topTitles?: number;
}) {
  const since = new Date();
  since.setDate(since.getDate() - 7);

  const snapshots = await prisma.platformSnapshot.findMany({
    where: {
      source: params.source,
      timeWindow: params.timeWindow,
      sortBy: params.sortBy,
      fetchedAt: { gte: since }
    },
    orderBy: { fetchedAt: 'asc' },
    take: 50
  });

  const titleCounts = new Map<string, number>();
  const points: { date: string; count: number; topTitle: string }[] = [];

  for (const snap of snapshots) {
    let items: DiscoveryItem[] = [];
    try {
      items = JSON.parse(snap.payload) as DiscoveryItem[];
    } catch {
      continue;
    }
    const date = snap.fetchedAt.toISOString().slice(0, 10);
    const top = items[0];
    points.push({
      date,
      count: items.length,
      topTitle: top?.title ?? ''
    });
    for (const item of items.slice(0, 5)) {
      titleCounts.set(item.title, (titleCounts.get(item.title) ?? 0) + 1);
    }
  }

  const topTitles = [...titleCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, params.topTitles ?? 10)
    .map(([title, appearances]) => ({ title, appearances }));

  return { points, topTitles };
}
