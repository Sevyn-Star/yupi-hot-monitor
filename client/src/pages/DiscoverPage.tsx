import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Compass, RefreshCw, BookmarkPlus, TrendingUp } from 'lucide-react';
import {
  discoverApi,
  hotspotsApi,
  type DiscoverHotspot,
  type DiscoveryPlatformInfo,
  type DiscoveryTrendPoint
} from '../services/api';
import { DISCOVERY_PLATFORM_OPTIONS } from '../constants/discovery';
import DiscoveryResultCard from '../components/DiscoveryResultCard';
import DiscoveryInsightPanel from '../components/DiscoveryInsightPanel';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { useApp } from '../context/AppContext';
import { cn } from '../lib/utils';
import { formatDateTime } from '../utils/relativeTime';

export default function DiscoverPage() {
  const { showToast, bumpHotspotRefresh } = useApp();
  const [platforms, setPlatforms] = useState<DiscoveryPlatformInfo[]>([]);
  const [source, setSource] = useState('github');
  const [timeWindow, setTimeWindow] = useState('today');
  const [sortBy, setSortBy] = useState('hot');
  const [results, setResults] = useState<DiscoverHotspot[]>([]);
  const [trendPoints, setTrendPoints] = useState<DiscoveryTrendPoint[]>([]);
  const [meta, setMeta] = useState<{
    fetchedAt?: string;
    cacheHit?: boolean;
    snapshotId?: string;
    aiAnalyzedCount?: number;
  }>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeKeyword, setActiveKeyword] = useState<string | null>(null);
  const [insightRefresh, setInsightRefresh] = useState(0);

  const currentPlatform = useMemo(
    () => platforms.find((p) => p.source === source),
    [platforms, source]
  );

  const timeOptions = useMemo(() => {
    const allowed = currentPlatform?.capabilities.timeWindows ?? ['today'];
    return [
      { value: 'today', label: '今天' },
      { value: '7d', label: '近 7 天' },
      { value: '30d', label: '近 30 天' }
    ].filter((o) => allowed.includes(o.value));
  }, [currentPlatform]);

  const sortOptions = currentPlatform?.capabilities.sortMetrics ?? [
    { value: 'hot', label: '综合热度' }
  ];

  useEffect(() => {
    discoverApi.getCapabilities().then((r) => setPlatforms(r.platforms)).catch(() => {});
  }, []);

  useEffect(() => {
    if (timeOptions.length && !timeOptions.some((o) => o.value === timeWindow)) {
      setTimeWindow(timeOptions[0].value);
    }
  }, [timeOptions, timeWindow]);

  useEffect(() => {
    if (sortOptions.length && !sortOptions.some((o) => o.value === sortBy)) {
      setSortBy(sortOptions[0].value);
    }
  }, [sortOptions, sortBy]);

  const loadTrends = useCallback(async (src: string, tw: string, sort: string) => {
    try {
      const data = await discoverApi.getTrends({ source: src, timeWindow: tw, sortBy: sort });
      setTrendPoints(data.points);
    } catch {
      setTrendPoints([]);
    }
  }, []);

  const runDiscover = useCallback(async () => {
    setLoading(true);
    try {
      const res = await discoverApi.discover({
        source,
        mode: 'trending',
        timeWindow,
        sortBy,
        limit: 30,
        saveSnapshot: true
      });
      setResults(res.results);
      setMeta({
        fetchedAt: res.meta.fetchedAt,
        cacheHit: res.meta.cacheHit,
        snapshotId: res.meta.snapshotId,
        aiAnalyzedCount: res.meta.aiAnalyzedCount
      });
      showToast(
        `已加载 ${res.results.length} 条${res.meta.cacheHit ? '（缓存）' : ''}，Top ${res.meta.aiAnalyzedCount} 已 AI 分析`,
        'success'
      );
      await loadTrends(source, timeWindow, sortBy);
      setInsightRefresh((n) => n + 1);
      setActiveKeyword(null);
    } catch (e) {
      showToast(e instanceof Error ? e.message : '加载榜单失败', 'error');
    } finally {
      setLoading(false);
    }
  }, [source, timeWindow, sortBy, showToast, loadTrends]);

  useEffect(() => {
    if (platforms.length === 0) return;
    runDiscover();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, timeWindow, sortBy, platforms.length]);

  const saveAll = async (items: DiscoverHotspot[] = results) => {
    if (items.length === 0) return;
    setSaving(true);
    try {
      const res = await hotspotsApi.saveBatch({
        items: items.map(({ metricLabels: _m, score: _s, ...rest }) => rest),
        keywordText: `discovery:${source}:${timeWindow}`
      });
      showToast(`入库 ${res.created} 条，更新 ${res.updated} 条`, 'success');
      bumpHotspotRefresh();
    } catch (e) {
      showToast(e instanceof Error ? e.message : '入库失败', 'error');
    } finally {
      setSaving(false);
    }
  };

  const maxTrendCount = Math.max(...trendPoints.map((p) => p.count), 1);

  const displayedResults = useMemo(() => {
    if (!activeKeyword) return results;
    const q = activeKeyword.toLowerCase();
    return results.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.content.toLowerCase().includes(q)
    );
  }, [results, activeKeyword]);

  return (
    <div className="space-y-6">
      <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-5">
        <div className="flex items-center gap-2 text-white">
          <Compass className="w-5 h-5 text-cyan-400" />
          <h2 className="font-semibold">平台发现</h2>
          <span className="text-xs text-slate-500">纯榜单 · 无关键词 · Top 5 AI 分析</span>
        </div>

        <div>
          <p className="text-xs text-slate-500 mb-2">选择平台</p>
          <div className="flex flex-wrap gap-2">
            {DISCOVERY_PLATFORM_OPTIONS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setSource(id)}
                className={cn(
                  'px-4 py-2 rounded-xl text-sm border transition-all',
                  source === id
                    ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
                    : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-slate-600 mt-2">
            Google / Bing 等搜索引擎不提供可靠榜单与浏览量，未纳入发现模式。
          </p>
        </div>

        <div>
          <p className="text-xs text-slate-500 mb-2">时间范围</p>
          <div className="flex flex-wrap gap-2">
            {timeOptions.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => setTimeWindow(o.value)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm border',
                  timeWindow === o.value
                    ? 'bg-white/10 border-white/20 text-white'
                    : 'border-white/5 text-slate-500 hover:text-slate-300'
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        {source === 'github' && sortBy === 'updated' && (
          <p className="text-[11px] text-cyan-500/80 px-1">
            「最近更新」按仓库最后推送时间筛选（{timeWindow === 'today' ? '今天' : timeWindow === '7d' ? '近 7 天' : '近 30 天'}内有代码推送），不是 GitHub 文件列表里的单文件修改时间。
          </p>
        )}

        <div>
          <p className="text-xs text-slate-500 mb-2">排序指标（点击切换）</p>
          <div className="flex flex-wrap gap-2">
            {sortOptions.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => {
                  setSortBy(o.value);
                }}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm border transition-all',
                  sortBy === o.value
                    ? 'bg-amber-500/15 border-amber-500/35 text-amber-300'
                    : 'border-white/5 text-slate-500 hover:border-white/15 hover:text-slate-300'
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        <motion.button
          type="button"
          disabled={loading}
          onClick={runDiscover}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-500 text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          刷新榜单
        </motion.button>

        {meta.fetchedAt && (
          <p className="text-[11px] text-slate-600">
            榜单抓取 {formatDateTime(meta.fetchedAt)}
            {meta.cacheHit && ' · 缓存（改排序后请点刷新）'}
            {meta.snapshotId && ` · 快照已保存`}
            {meta.aiAnalyzedCount != null && meta.aiAnalyzedCount > 0 && (
              <span className="text-violet-400/80"> · AI 已分析前 {meta.aiAnalyzedCount} 条</span>
            )}
          </p>
        )}
      </div>

      <DiscoveryInsightPanel
        source={source}
        sortBy={sortBy}
        refreshToken={insightRefresh}
        currentItems={results.map((r) => ({ title: r.title, content: r.content }))}
        activeKeyword={activeKeyword}
        onKeywordClick={setActiveKeyword}
      />

      {trendPoints.length > 1 && (
        <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5">
          <div className="flex items-center gap-2 mb-4 text-sm text-slate-400">
            <TrendingUp className="w-4 h-4 text-cyan-400" />
            近 7 天快照趋势（每次刷新保存一条）
          </div>
          <div className="flex items-end gap-1 h-24">
            {trendPoints.map((p) => (
              <div key={p.date + p.topTitle} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                <div
                  className="w-full bg-cyan-500/40 rounded-t min-h-[4px] transition-all"
                  style={{ height: `${Math.max(8, (p.count / maxTrendCount) * 80)}px` }}
                  title={p.topTitle ? `榜首: ${p.topTitle}` : undefined}
                />
                <span className="text-[9px] text-slate-600 truncate w-full text-center">
                  {p.date.slice(5)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {displayedResults.length > 0 && (
        <div className="flex justify-end items-center gap-3 flex-wrap">
          {activeKeyword && (
            <button
              type="button"
              onClick={() => setActiveKeyword(null)}
              className="text-xs text-slate-500 hover:text-white"
            >
              清除关键词「{activeKeyword}」
            </button>
          )}
          <button
            type="button"
            disabled={saving}
            onClick={() => saveAll(displayedResults)}
            className="px-4 py-2 rounded-xl text-sm bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20 flex items-center gap-2 disabled:opacity-50"
          >
            <BookmarkPlus className="w-4 h-4" />
            {saving ? '入库中…' : `全部入库（${displayedResults.length}）`}
          </button>
        </div>
      )}

      {loading && <LoadingSpinner />}

      {!loading && results.length === 0 && (
        <EmptyState
          icon={Compass}
          title="选择平台后加载榜单"
          description="GitHub / HN / HF 支持日周月；B 站今日热门或综合榜；微博为实时热搜"
        />
      )}

      <div className="space-y-3">
        {!loading &&
          displayedResults.map((item, i) => (
            <DiscoveryResultCard
              key={item.id}
              hotspot={item}
              rank={i + 1}
              index={i}
              aiHighlighted={i < 5}
            />
          ))}
      </div>
    </div>
  );
}
