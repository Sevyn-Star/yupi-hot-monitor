import { useEffect, useState } from 'react';
import { Flame, Search, ChevronsUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import FilterSortBar, { defaultFilterState, type FilterState } from '../components/FilterSortBar';
import StatsCards from '../components/StatsCards';
import HotspotCard from '../components/HotspotCard';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { useHotspots } from '../hooks/useHotspots';
import { useApp } from '../context/AppContext';
import ReportExportButton from '../components/ReportExportButton';
import TrendPanel from '../components/TrendPanel';
import { hotspotsApi } from '../services/api';
import { cn } from '../lib/utils';
import { Link } from 'react-router-dom';

export default function DashboardPage() {
  const { keywords, setDetailHotspotId, showToast, bumpHotspotRefresh } = useApp();
  const [filters, setFilters] = useState<FilterState>({ ...defaultFilterState });
  const [page, setPage] = useState(1);
  const [expandedReasons, setExpandedReasons] = useState<Set<string>>(new Set());
  const [expandedContents, setExpandedContents] = useState<Set<string>>(new Set());
  const [allReasonsExpanded, setAllReasonsExpanded] = useState(false);

  const { hotspots, stats, totalPages, isLoading, error, reload } = useHotspots(filters, page);

  const handleDeleteHotspot = async (id: string) => {
    if (!confirm('确定删除这条热点？')) return;
    try {
      await hotspotsApi.delete(id);
      showToast('已删除', 'success');
      bumpHotspotRefresh();
      reload();
    } catch {
      showToast('删除失败', 'error');
    }
  };

  useEffect(() => {
    setPage(1);
  }, [filters]);

  const toggleReason = (id: string) => {
    setExpandedReasons((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleContent = (id: string) => {
    setExpandedContents((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllReasons = () => {
    if (allReasonsExpanded) {
      setExpandedReasons(new Set());
    } else {
      setExpandedReasons(new Set(hotspots.filter((h) => h.relevanceReason).map((h) => h.id)));
    }
    setAllReasonsExpanded(!allReasonsExpanded);
  };

  return (
    <div className="space-y-8">
      {stats && <StatsCards stats={stats} keywords={keywords} />}
      <TrendPanel />

      <div>
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-500" />
            实时热点流
          </h2>
          <div className="flex items-center gap-3">
            <ReportExportButton showToast={showToast} />
            <span className="text-xs text-slate-600">自动扫描（间隔见设置）</span>
          </div>
        </div>

        <div className="mb-5">
          <FilterSortBar filters={filters} onChange={setFilters} keywords={keywords} />
        </div>

        {error && (
          <p className="text-sm text-red-400 mb-4 text-center">{error}</p>
        )}

        {isLoading ? (
          <LoadingSpinner />
        ) : hotspots.length === 0 ? (
          <EmptyState
            icon={Search}
            title="尚未发现热点"
            description={
              keywords.length === 0
                ? '前往监控词页添加关键词，或运行 npm run demo 加载演示数据'
                : '点击右上角「立即扫描」，或等待定时任务入库'
            }
            action={
              keywords.length === 0 ? (
                <Link
                  to="/keywords"
                  className="text-sm text-blue-400 hover:text-blue-300 underline"
                >
                  去添加监控词 →
                </Link>
              ) : undefined
            }
          />
        ) : (
          <div className="space-y-3">
            {hotspots.some((h) => h.relevanceReason) && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={toggleAllReasons}
                  className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-400 transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5"
                >
                  <ChevronsUpDown className="w-3.5 h-3.5" />
                  {allReasonsExpanded ? '折叠所有理由' : '展开所有理由'}
                </button>
              </div>
            )}

            {hotspots.map((hotspot, index) => (
              <HotspotCard
                key={hotspot.id}
                hotspot={hotspot}
                index={index}
                variant="full"
                expandedReason={expandedReasons.has(hotspot.id)}
                expandedContent={expandedContents.has(hotspot.id)}
                onToggleReason={() => toggleReason(hotspot.id)}
                onToggleContent={() => toggleContent(hotspot.id)}
                onTitleClick={() => setDetailHotspotId(hotspot.id)}
                onDelete={() => handleDeleteHotspot(hotspot.id)}
              />
            ))}
          </div>
        )}

        {totalPages > 1 && !isLoading && (
          <div className="flex items-center justify-center gap-3 mt-6">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1.5">
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 7) pageNum = i + 1;
                else if (page <= 4) pageNum = i + 1;
                else if (page >= totalPages - 3) pageNum = totalPages - 6 + i;
                else pageNum = page - 3 + i;
                return (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setPage(pageNum)}
                    className={cn(
                      'w-8 h-8 rounded-lg text-xs font-medium',
                      page === pageNum
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        : 'text-slate-500 hover:bg-white/5'
                    )}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <span className="text-xs text-slate-600 ml-2">共 {stats?.total || 0} 条</span>
          </div>
        )}
      </div>
    </div>
  );
}
