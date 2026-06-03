import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, BookmarkPlus } from 'lucide-react';
import FilterSortBar, { defaultFilterState, type FilterState } from '../components/FilterSortBar';
import SearchOptionsPanel, {
  defaultSearchOptions,
  type SearchOptionsState
} from '../components/SearchOptionsPanel';
import HotspotCard from '../components/HotspotCard';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { hotspotsApi, type Hotspot, type SourceFetchStat } from '../services/api';
import { useApp } from '../context/AppContext';
import { sortHotspots } from '../utils/sortHotspots';
import { cn } from '../lib/utils';

export default function SearchPage() {
  const { keywords, showToast, bumpHotspotRefresh } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOptions, setSearchOptions] = useState<SearchOptionsState>({
    ...defaultSearchOptions
  });
  const [searchResults, setSearchResults] = useState<Hotspot[]>([]);
  const [searchSourceStats, setSearchSourceStats] = useState<SourceFetchStat[]>([]);
  const [searchFilters, setSearchFilters] = useState<FilterState>({ ...defaultFilterState });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const filteredSearchResults = useMemo(() => {
    let results = [...searchResults];
    if (searchFilters.source) results = results.filter((h) => h.source === searchFilters.source);
    if (searchFilters.importance) results = results.filter((h) => h.importance === searchFilters.importance);
    if (searchFilters.isReal === 'true') results = results.filter((h) => h.isReal);
    else if (searchFilters.isReal === 'false') results = results.filter((h) => !h.isReal);
    if (searchFilters.keywordId) {
      results = results.filter((h) => h.keyword?.id === searchFilters.keywordId);
    }
    if (searchFilters.timeRange) {
      const now = new Date();
      let dateFrom: Date | null = null;
      switch (searchFilters.timeRange) {
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
        results = results.filter((h) => {
          const d = h.publishedAt ? new Date(h.publishedAt) : new Date(h.createdAt);
          return d >= dateFrom!;
        });
      }
    }
    return sortHotspots(
      results,
      searchFilters.sortBy || 'createdAt',
      (searchFilters.sortOrder || 'desc') as 'asc' | 'desc'
    );
  }, [searchResults, searchFilters]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsLoading(true);
    try {
      const result = await hotspotsApi.search(searchQuery.trim(), {
        sources: searchOptions.source ? [searchOptions.source] : undefined,
        timeWindow: searchOptions.timeWindow || undefined,
        sortBy: searchOptions.sortBy || undefined
      });
      setSearchResults(result.results);
      setSearchSourceStats(result.sourceStats ?? []);
      const okCount = (result.sourceStats ?? []).filter((s) => s.status === 'ok').length;
      const scope = searchOptions.source
        ? `「${searchOptions.source}」`
        : `${okCount} 个源`;
      showToast(`找到 ${result.results.length} 条结果（${scope}）`, 'success');
    } catch {
      showToast('搜索失败', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const saveItems = async (items: Hotspot[]) => {
    if (items.length === 0) return;
    setIsSaving(true);
    try {
      const res = await hotspotsApi.saveBatch({
        items,
        keywordText: searchQuery.trim()
      });
      showToast(`入库 ${res.created} 条，更新 ${res.updated} 条`, 'success');
      bumpHotspotRefresh();
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : '入库失败', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSearch} className="p-5 rounded-2xl bg-white/[0.02] border border-white/5">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索热点内容..."
              className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <motion.button
            type="submit"
            disabled={isLoading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-medium flex items-center gap-2 shadow-lg shadow-blue-500/25 disabled:opacity-50"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            搜索
          </motion.button>
        </div>

        <SearchOptionsPanel value={searchOptions} onChange={setSearchOptions} />
      </form>

      {filteredSearchResults.length > 0 && (
        <div className="flex justify-end">
          <button
            type="button"
            disabled={isSaving}
            onClick={() => saveItems(filteredSearchResults)}
            className="px-4 py-2 rounded-xl text-sm bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20 flex items-center gap-2 disabled:opacity-50"
          >
            <BookmarkPlus className="w-4 h-4" />
            {isSaving ? '入库中…' : `全部入库（${filteredSearchResults.length}）`}
          </button>
        </div>
      )}

      <FilterSortBar filters={searchFilters} onChange={setSearchFilters} keywords={keywords} />

      {searchSourceStats.length > 0 && (
        <div className="flex flex-wrap gap-2 text-[11px]">
          {searchSourceStats.map((s) => (
            <span
              key={s.source}
              className={cn(
                'px-2 py-1 rounded-md border',
                s.status === 'ok' && 'border-emerald-500/20 text-emerald-500/80',
                s.status === 'failed' && 'border-red-500/20 text-red-400/80',
                s.status === 'skipped' && 'border-white/5 text-slate-600'
              )}
            >
              {s.source}: {s.status === 'ok' ? s.count : s.status}
            </span>
          ))}
        </div>
      )}

      {isLoading && <LoadingSpinner />}

      {!isLoading && searchResults.length === 0 && (
        <EmptyState
          icon={Search}
          title="输入关键词开始搜索"
          description="可选单平台、时间范围与排序指标；下方筛选栏可做二次过滤"
        />
      )}

      {!isLoading && filteredSearchResults.length === 0 && searchResults.length > 0 && (
        <EmptyState icon={Search} title="当前筛选条件下无结果" description="尝试调整筛选条件" />
      )}

      <div className="space-y-3">
        {!isLoading &&
          filteredSearchResults.map((hotspot, i) => (
            <HotspotCard
              key={hotspot.id}
              hotspot={hotspot}
              index={i}
              variant="compact"
              showKeyword={false}
              isSearchResult
              onSaveToDb={() => saveItems([hotspot])}
            />
          ))}
      </div>
    </div>
  );
}
