import { prisma } from '../../db.js';
import type { DiscoveryItem } from './types.js';
import type { InsightPeriod } from './insightTypes.js';

function periodToDays(period: InsightPeriod): number {
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

export async function loadSnapshotItems(params: {
  source: string;
  sortBy: string;
  period: InsightPeriod;
  /** 相对当前 period 向前偏移的天数（用于「上一周期」对比） */
  dayOffset?: number;
}): Promise<{ items: Array<{ item: DiscoveryItem; rank: number }>; snapshotIds: string[] }> {
  const days = periodToDays(params.period);
  const offset = params.dayOffset ?? 0;

  const rangeEnd = new Date();
  if (offset > 0) {
    rangeEnd.setDate(rangeEnd.getDate() - offset);
  }

  const rangeStart = new Date(rangeEnd);
  rangeStart.setDate(rangeStart.getDate() - days);

  const fetchedAt: { gte: Date; lt?: Date } = { gte: rangeStart };
  if (offset > 0) {
    fetchedAt.lt = rangeEnd;
  }

  const rows = await prisma.platformSnapshot.findMany({
    where: {
      source: params.source,
      sortBy: params.sortBy,
      fetchedAt
    },
    orderBy: { fetchedAt: 'desc' },
    take: 50
  });

  const aggregated: Array<{ item: DiscoveryItem; rank: number }> = [];
  const snapshotIds: string[] = [];

  for (const row of rows) {
    snapshotIds.push(row.id);
    let items: DiscoveryItem[] = [];
    try {
      items = JSON.parse(row.payload) as DiscoveryItem[];
    } catch {
      continue;
    }
    items.forEach((item, index) => {
      aggregated.push({ item, rank: index + 1 });
    });
  }

  return { items: aggregated, snapshotIds };
}

export function mergeCurrentItems(
  snapshotItems: Array<{ item: DiscoveryItem; rank: number }>,
  currentItems: DiscoveryItem[]
): Array<{ item: DiscoveryItem; rank: number }> {
  const merged = [...snapshotItems];
  currentItems.forEach((item, index) => {
    merged.push({ item, rank: index + 1 });
  });
  return merged;
}
