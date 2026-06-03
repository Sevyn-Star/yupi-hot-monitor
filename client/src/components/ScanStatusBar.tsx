import { useEffect, useState } from 'react';
import { Activity, Loader2, AlertCircle } from 'lucide-react';
import { scanApi, type ScanStatus } from '../services/api';
import { relativeTime } from '../utils/relativeTime';
import { cn } from '../lib/utils';

export default function ScanStatusBar() {
  const [status, setStatus] = useState<ScanStatus | null>(null);

  useEffect(() => {
    const fetchStatus = () => {
      scanApi.getStatus().then(setStatus).catch(() => {});
    };
    fetchStatus();
    const id = setInterval(fetchStatus, 5000);
    return () => clearInterval(id);
  }, []);

  if (!status) return null;

  const lastLabel = status.lastRun ? relativeTime(status.lastRun.finishedAt) : '从未';
  const failedCount = status.lastSourceStats.filter((s) => s.status === 'failed').length;

  return (
    <div
      className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 text-xs text-slate-500 max-w-xs"
      title={
        failedCount > 0
          ? status.lastSourceStats
              .filter((s) => s.status === 'failed')
              .map((s) => `${s.source}: ${s.error || '失败'}`)
              .join('\n')
          : status.lastRun
            ? `上次：${status.lastRun.newHotspotsCount} 条新热点 · ${(status.lastRun.durationMs / 1000).toFixed(1)}s`
            : undefined
      }
    >
      {status.isRunning ? (
        <>
          <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin shrink-0" />
          <span className="text-blue-400 truncate">
            扫描中{status.currentKeyword ? ` · ${status.currentKeyword}` : ''}
          </span>
        </>
      ) : (
        <>
          {failedCount > 0 ? (
            <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
          ) : (
            <Activity className="w-3.5 h-3.5 shrink-0" />
          )}
          <span className="truncate">
            每 {status.scanIntervalMinutes} 分钟 · 上次 {lastLabel}
            {failedCount > 0 && (
              <span className="text-red-400 ml-1">· {failedCount} 源失败</span>
            )}
          </span>
          {status.lastRun && status.lastRun.newHotspotsCount > 0 && (
            <span className={cn('text-emerald-500/80 shrink-0')}>
              +{status.lastRun.newHotspotsCount}
            </span>
          )}
        </>
      )}
    </div>
  );
}
