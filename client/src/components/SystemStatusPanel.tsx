import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Activity,
  RefreshCw,
  Database,
  Cpu,
  AlertCircle,
  CheckCircle2,
  Play
} from 'lucide-react';
import { healthApi, scanApi, type ScanStatus, type SourcesHealthReport } from '../services/api';
import { useApp } from '../context/AppContext';
import { cn } from '../lib/utils';
import { relativeTime, formatDateTime } from '../utils/relativeTime';
import LoadingSpinner from './LoadingSpinner';
import SettingsSection from './SettingsSection';

interface SystemStatusPanelProps {
  showToast: (message: string, type: 'success' | 'error') => void;
}

export default function SystemStatusPanel({ showToast }: SystemStatusPanelProps) {
  const { handleManualCheck, isChecking, hotspotRefreshToken } = useApp();
  const [scanStatus, setScanStatus] = useState<ScanStatus | null>(null);
  const [sourcesHealth, setSourcesHealth] = useState<SourcesHealthReport | null>(null);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
  const refreshInFlight = useRef(false);

  const refreshStatus = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (refreshInFlight.current) return;
      refreshInFlight.current = true;
      setIsRefreshing(true);
      try {
        const status = await scanApi.getStatus();
        setScanStatus(status);
        if (status.sourcesHealth) {
          setSourcesHealth(status.sourcesHealth);
        }
        setLastRefreshedAt(new Date());
      } catch {
        if (!opts?.silent) {
          showToast('加载系统状态失败', 'error');
        }
      } finally {
        refreshInFlight.current = false;
        setIsRefreshing(false);
        setIsLoading(false);
      }
    },
    [showToast]
  );

  useEffect(() => {
    refreshStatus({ silent: true });
    const id = setInterval(() => refreshStatus({ silent: true }), 8000);
    return () => clearInterval(id);
  }, [refreshStatus]);

  useEffect(() => {
    if (!isChecking) {
      refreshStatus({ silent: true });
    }
  }, [isChecking, hotspotRefreshToken, refreshStatus]);

  const runHealthCheck = async () => {
    setIsCheckingHealth(true);
    try {
      const report = await healthApi.checkSources(true);
      setSourcesHealth(report);
      showToast(
        `检测完成：${report.summary.ok} 个源正常，${report.summary.failed} 个失败`,
        report.summary.failed > 0 ? 'error' : 'success'
      );
    } catch {
      showToast('数据源检测失败', 'error');
    } finally {
      setIsCheckingHealth(false);
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-2xl bg-white/[0.02] border border-white/5 p-8 flex justify-center">
        <LoadingSpinner size="sm" />
      </div>
    );
  }

  const failedSources =
    scanStatus?.lastSourceStats.filter((s) => s.status === 'failed') ?? [];
  const lastRun = scanStatus?.lastRun;
  const filterStats = lastRun?.filterStats;

  return (
    <div className="space-y-4">
      <SettingsSection
        id="scan-status"
        title="扫描任务"
        description={
          scanStatus?.isRunning || isChecking
            ? '正在运行…'
            : lastRun
              ? `上次 ${relativeTime(lastRun.finishedAt)}`
              : '尚未执行过扫描'
        }
        icon={<Activity className="w-4 h-4 text-cyan-400" />}
        defaultOpen
        badge={
          scanStatus?.isRunning || isChecking ? (
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
          ) : lastRun ? (
            <span className="text-[10px] text-emerald-400">+{lastRun.newHotspotsCount}</span>
          ) : null
        }
      >
        <div className="flex items-center justify-between gap-2 -mt-1 mb-2">
          {lastRefreshedAt ? (
            <span className="text-[10px] text-slate-600">
              状态更新 {relativeTime(lastRefreshedAt.toISOString())}
            </span>
          ) : (
            <span />
          )}
          <button
            type="button"
            disabled={isRefreshing}
            onClick={() => refreshStatus()}
            className="text-xs text-slate-500 hover:text-blue-400 flex items-center gap-1 disabled:opacity-50"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', isRefreshing && 'animate-spin')} />
            {isRefreshing ? '刷新中…' : '刷新'}
          </button>
        </div>

        {scanStatus?.isRunning || isChecking ? (
          <p className="text-sm text-blue-400 flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
            正在扫描
            {scanStatus?.currentKeyword ? `：${scanStatus.currentKeyword}` : ''}
          </p>
        ) : lastRun ? (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
            <div>
              <dt className="text-slate-600">触发</dt>
              <dd className="text-slate-300">{lastRun.trigger === 'cron' ? '定时' : '手动'}</dd>
            </div>
            <div>
              <dt className="text-slate-600">耗时</dt>
              <dd className="text-slate-300">{(lastRun.durationMs / 1000).toFixed(1)}s</dd>
            </div>
            <div>
              <dt className="text-slate-600">监控词</dt>
              <dd className="text-slate-300">{lastRun.keywordsChecked}</dd>
            </div>
            <div>
              <dt className="text-slate-600">新增热点</dt>
              <dd className="text-emerald-400 font-medium">{lastRun.newHotspotsCount}</dd>
            </div>
          </dl>
        ) : (
          <div className="space-y-3 py-1">
            <p className="text-sm text-slate-600">尚未执行过扫描，可在此直接启动</p>
            <button
              type="button"
              disabled={isChecking}
              onClick={() => handleManualCheck()}
              className="w-full px-4 py-2.5 rounded-xl text-sm font-medium bg-blue-500/15 text-blue-300 border border-blue-500/30 hover:bg-blue-500/25 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isChecking ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              {isChecking ? '扫描进行中…' : '立即扫描'}
            </button>
          </div>
        )}

        {lastRun?.error && (
          <p className="text-xs text-red-400 flex items-start gap-1 mt-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            {lastRun.error}
          </p>
        )}

        {scanStatus?.aiUsage && (
          <p className="text-[11px] text-slate-600 flex items-center gap-1 pt-3 border-t border-white/5 mt-3">
            <Cpu className="w-3.5 h-3.5" />
            本轮 AI 扩展 {scanStatus.aiUsage.expandCalls} · 分析{' '}
            {scanStatus.aiUsage.analyzeCalls}
          </p>
        )}

        {filterStats && (
          <div className="pt-3 border-t border-white/5 mt-3">
            <p className="text-[10px] text-slate-600 mb-2">上轮过滤</p>
            <div className="flex flex-wrap gap-1.5 text-[10px]">
              <StatChip label="抓取" value={filterStats.rawFetched} />
              <StatChip label="入库" value={filterStats.saved} accent />
              <StatChip label="重复" value={filterStats.skippedDuplicate} />
              <StatChip label="低相关" value={filterStats.skippedLowRelevance} />
            </div>
          </div>
        )}

        {(failedSources.length > 0 || (scanStatus?.lastSourceStats.length ?? 0) > 0) && (
          <div className="pt-3 border-t border-white/5 mt-3">
            <p className="text-[10px] text-slate-600 mb-2">各源结果</p>
            <div className="flex flex-wrap gap-1.5">
              {scanStatus?.lastSourceStats.map((s) => (
                <SourceBadge
                  key={s.source}
                  source={s.source}
                  status={s.status}
                  count={s.count}
                  error={s.error}
                />
              ))}
            </div>
          </div>
        )}
      </SettingsSection>

      <SettingsSection
        id="health"
        title="数据源健康"
        description={
          sourcesHealth
            ? `${sourcesHealth.summary.ok} 正常 · ${sourcesHealth.summary.failed} 失败`
            : '检测各平台连通性'
        }
        icon={<Database className="w-4 h-4 text-blue-400" />}
        defaultOpen={false}
      >
        <button
          type="button"
          onClick={runHealthCheck}
          disabled={isCheckingHealth}
          className="w-full mb-3 px-3 py-2 rounded-xl text-sm bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <RefreshCw className={cn('w-4 h-4', isCheckingHealth && 'animate-spin')} />
          {isCheckingHealth ? '检测中…' : '立即检测'}
        </button>

        {sourcesHealth ? (
          <>
            <p className="text-[10px] text-slate-600 mb-2">
              「{sourcesHealth.query}」· {formatDateTime(sourcesHealth.checkedAt)}
            </p>
            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
              {sourcesHealth.results.map((r) => (
                <div
                  key={r.source}
                  className={cn(
                    'flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg border text-xs',
                    r.status === 'ok' && 'border-emerald-500/20 bg-emerald-500/5',
                    r.status === 'failed' && 'border-red-500/20 bg-red-500/5',
                    r.status === 'skipped' && 'border-white/5 opacity-60'
                  )}
                >
                  <span className="text-slate-300 truncate flex items-center gap-1.5 min-w-0">
                    {r.status === 'ok' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : r.status === 'failed' ? (
                      <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    ) : null}
                    {r.label}
                  </span>
                  <span className="text-slate-600 shrink-0">
                    {r.status === 'ok' ? `${r.count}` : r.status}
                  </span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-xs text-slate-600 text-center py-2">点击上方按钮开始检测</p>
        )}
      </SettingsSection>
    </div>
  );
}

function StatChip({
  label,
  value,
  accent
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <span
      className={cn(
        'px-1.5 py-0.5 rounded border border-white/5',
        accent ? 'text-emerald-400' : 'text-slate-500'
      )}
    >
      {label} {value}
    </span>
  );
}

function SourceBadge({
  source,
  status,
  count,
  error
}: {
  source: string;
  status: string;
  count: number;
  error?: string;
}) {
  return (
    <span
      title={error}
      className={cn(
        'px-1.5 py-0.5 rounded border text-[10px]',
        status === 'ok' && 'border-emerald-500/20 text-emerald-500/80',
        status === 'failed' && 'border-red-500/20 text-red-400',
        status === 'skipped' && 'border-white/5 text-slate-600'
      )}
    >
      {source}: {status === 'ok' ? count : status === 'failed' ? '失败' : status}
    </span>
  );
}
