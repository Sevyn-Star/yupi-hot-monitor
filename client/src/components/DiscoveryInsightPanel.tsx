import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Sparkles, RefreshCw, TrendingUp, Tag, ChevronDown } from 'lucide-react';
import { discoverApi, type DiscoveryInsight } from '../services/api';
import { cn } from '../lib/utils';

const PERIOD_OPTIONS = [
  { value: 'today', label: '今日洞察' },
  { value: '7d', label: '近 7 天' },
  { value: '30d', label: '近 30 天' }
] as const;

const KEYWORDS_PREVIEW = 5;

const TREND_LABELS: Record<string, { label: string; className: string }> = {
  new: { label: '新', className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  rising: { label: '升', className: 'bg-orange-500/15 text-orange-400 border-orange-500/30' },
  stable: { label: '稳', className: 'bg-white/5 text-slate-500 border-white/10' }
};

interface DiscoveryInsightPanelProps {
  source: string;
  sortBy: string;
  currentItems?: { title: string; content: string }[];
  refreshToken?: number;
  onKeywordClick?: (term: string | null) => void;
  activeKeyword?: string | null;
}

export default function DiscoveryInsightPanel({
  source,
  sortBy,
  currentItems,
  refreshToken = 0,
  onKeywordClick,
  activeKeyword
}: DiscoveryInsightPanelProps) {
  const [period, setPeriod] = useState<'today' | '7d' | '30d'>('7d');
  const [insight, setInsight] = useState<DiscoveryInsight | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [keywordsExpanded, setKeywordsExpanded] = useState(false);

  const loadInsight = useCallback(
    async (opts?: { force?: boolean }) => {
      setLoading(true);
      setError(null);
      try {
        if (!opts?.force) {
          try {
            const cached = await discoverApi.getInsight({ source, period, sortBy });
            setInsight(cached.insight);
            setLoading(false);
            return;
          } catch {
            /* generate below */
          }
        }
        const res = await discoverApi.generateInsight({
          source,
          period,
          sortBy,
          currentItems,
          force: opts?.force
        });
        setInsight(res.insight);
      } catch (e) {
        setError(e instanceof Error ? e.message : '生成洞察失败');
        setInsight(null);
      } finally {
        setLoading(false);
      }
    },
    [source, period, sortBy, currentItems]
  );

  useEffect(() => {
    loadInsight();
  }, [loadInsight, refreshToken]);

  useEffect(() => {
    setKeywordsExpanded(false);
  }, [period, source, refreshToken]);

  const maxScore = Math.max(...(insight?.topKeywords.map((k) => k.score) ?? [1]), 1);

  const previewKeywords = insight?.topKeywords.slice(0, 5).map((k) => k.term).join('、') ?? '';
  const visibleKeywords = insight
    ? keywordsExpanded
      ? insight.topKeywords
      : insight.topKeywords.slice(0, KEYWORDS_PREVIEW)
    : [];
  const hasMoreKeywords =
    (insight?.topKeywords.length ?? 0) > KEYWORDS_PREVIEW;

  return (
    <div className="rounded-2xl bg-gradient-to-br from-violet-500/5 to-cyan-500/5 border border-violet-500/15 overflow-hidden">
      <div className="p-4 sm:p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setPanelOpen((o) => !o)}
            className="flex items-center gap-2 text-left group min-w-0 flex-1"
            aria-expanded={panelOpen}
          >
            <Sparkles className="w-5 h-5 text-violet-400 shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-white group-hover:text-violet-200 transition-colors">
                  AI 热点洞察
                </h3>
                {insight?.stats.aiEnhanced && (
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-violet-500/20 text-violet-300 border border-violet-500/30">
                    AI 增强
                  </span>
                )}
              </div>
              {!panelOpen && insight && (
                <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                  {previewKeywords || insight.summary}
                </p>
              )}
            </div>
            <ChevronDown
              className={cn(
                'w-4 h-4 text-slate-500 shrink-0 transition-transform',
                panelOpen && 'rotate-180'
              )}
            />
          </button>

          <div className="flex flex-wrap items-center gap-2" onClick={(e) => e.stopPropagation()}>
            {PERIOD_OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => setPeriod(o.value)}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-xs border',
                  period === o.value
                    ? 'bg-violet-500/20 border-violet-500/40 text-violet-200'
                    : 'border-white/10 text-slate-500 hover:text-slate-300'
                )}
              >
                {o.label}
              </button>
            ))}
            <button
              type="button"
              disabled={loading}
              onClick={() => loadInsight({ force: true })}
              className="px-2.5 py-1 rounded-lg text-xs border border-white/10 text-slate-400 hover:text-white flex items-center gap-1 disabled:opacity-50"
            >
              <RefreshCw className={cn('w-3 h-3', loading && 'animate-spin')} />
              重新生成
            </button>
          </div>
        </div>

        {loading && !insight && panelOpen && (
          <p className="text-sm text-slate-500 animate-pulse">正在分析榜单快照与关键词…</p>
        )}

        {error && panelOpen && <p className="text-sm text-red-400/80">{error}</p>}
      </div>

      <AnimatePresence initial={false}>
        {panelOpen && insight && (
          <motion.div
            key="insight-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-0 space-y-4 border-t border-white/5">
              <p className="text-sm text-slate-300 leading-relaxed">{insight.summary}</p>
              {insight.vsLastPeriod && (
                <p className="text-xs text-slate-500 border-l-2 border-violet-500/30 pl-3">
                  <TrendingUp className="w-3 h-3 inline mr-1 text-violet-400" />
                  {insight.vsLastPeriod}
                </p>
              )}

              {insight.themes.length > 0 && (
                <div>
                  <p className="text-xs text-slate-500 mb-2">热门主题</p>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {insight.themes.map((theme) => (
                      <div
                        key={theme.title}
                        className="p-3 rounded-xl bg-white/[0.03] border border-white/5"
                      >
                        <p className="text-sm font-medium text-white mb-1">{theme.title}</p>
                        <p className="text-[11px] text-slate-500 mb-2">{theme.why}</p>
                        <div className="flex flex-wrap gap-1">
                          {theme.keywords.map((kw) => (
                            <button
                              key={kw}
                              type="button"
                              onClick={() => onKeywordClick?.(activeKeyword === kw ? null : kw)}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-300 hover:bg-violet-500/20"
                            >
                              {kw}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {insight.topKeywords.length > 0 && (
                <div>
                  <p className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                    <Tag className="w-3 h-3" />
                    热门关键词（点击筛选下方榜单）
                  </p>
                  <div className="space-y-2">
                    {visibleKeywords.map((kw) => (
                      <button
                        key={kw.term}
                        type="button"
                        onClick={() =>
                          onKeywordClick?.(activeKeyword === kw.term ? null : kw.term)
                        }
                        className={cn(
                          'w-full flex items-center gap-2 text-left rounded-lg px-2 py-1.5 transition-colors',
                          activeKeyword === kw.term
                            ? 'bg-cyan-500/15 ring-1 ring-cyan-500/30'
                            : 'hover:bg-white/5'
                        )}
                      >
                        <span className="text-sm text-white w-28 truncate shrink-0">
                          {kw.term}
                        </span>
                        <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                          <motion.div
                            className="h-full bg-gradient-to-r from-violet-500 to-cyan-500 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${(kw.score / maxScore) * 100}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-slate-500 w-8 text-right">
                          {kw.score}
                        </span>
                        <span
                          className={cn(
                            'text-[9px] px-1 rounded border',
                            TREND_LABELS[kw.trend]?.className ?? TREND_LABELS.stable.className
                          )}
                        >
                          {TREND_LABELS[kw.trend]?.label ?? '稳'}
                        </span>
                      </button>
                    ))}
                  </div>
                  {hasMoreKeywords && (
                    <button
                      type="button"
                      onClick={() => setKeywordsExpanded((e) => !e)}
                      className="mt-2 w-full py-1.5 text-xs text-slate-500 hover:text-violet-300 border border-dashed border-white/10 rounded-lg hover:border-violet-500/30 transition-colors"
                    >
                      {keywordsExpanded
                        ? '收起关键词'
                        : `展开全部 ${insight.topKeywords.length} 个关键词`}
                    </button>
                  )}
                </div>
              )}

              <p className="text-[10px] text-slate-600">
                基于 {insight.stats.snapshotCount} 次快照、{insight.stats.itemCount} 条榜单条目
                {insight.stats.generatedAt &&
                  ` · ${new Date(insight.stats.generatedAt).toLocaleString()}`}
              </p>

              {!loading && insight.stats.snapshotCount < 2 && (
                <p className="text-xs text-amber-500/80">
                  快照较少，多点击「刷新榜单」可提升洞察准确度。
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
