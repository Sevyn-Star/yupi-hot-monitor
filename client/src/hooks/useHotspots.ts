import { useCallback, useEffect, useState } from 'react';
import { hotspotsApi, type Hotspot, type Stats } from '../services/api';
import type { FilterState } from '../components/FilterSortBar';
import { useApp } from '../context/AppContext';

export function useHotspots(filters: FilterState, page: number) {
  const { hotspotRefreshToken } = useApp();
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const filterParams: Record<string, string | number> = {
        limit: 20,
        page
      };
      if (filters.source) filterParams.source = filters.source;
      if (filters.importance) filterParams.importance = filters.importance;
      if (filters.keywordId) filterParams.keywordId = filters.keywordId;
      if (filters.timeRange) filterParams.timeRange = filters.timeRange;
      if (filters.isReal) filterParams.isReal = filters.isReal;
      if (filters.sortBy) filterParams.sortBy = filters.sortBy;
      if (filters.sortOrder) filterParams.sortOrder = filters.sortOrder;

      const [hotspotsData, statsData] = await Promise.all([
        hotspotsApi.getAll(filterParams as Parameters<typeof hotspotsApi.getAll>[0]),
        hotspotsApi.getStats()
      ]);
      setHotspots(hotspotsData.data);
      setTotalPages(hotspotsData.pagination.totalPages);
      setStats(statsData);
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败');
    } finally {
      setIsLoading(false);
    }
  }, [filters, page, hotspotRefreshToken]);

  useEffect(() => {
    load();
  }, [load]);

  return { hotspots, stats, totalPages, isLoading, error, reload: load };
}
