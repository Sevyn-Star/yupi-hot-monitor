import { useEffect, useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { hotspotsApi, type HotspotTrends } from '../services/api';
import { getSourceLabel } from '../utils/hotspotDisplay';
import { cn } from '../lib/utils';

export default function TrendPanel() {
  const [trends, setTrends] = useState<HotspotTrends | null>(null);

  useEffect(() => {
    hotspotsApi.getTrends(7).then(setTrends).catch(() => setTrends(null));
  }, []);

  if (!trends || trends.total === 0) return null;

  const maxDay = Math.max(...trends.byDay.map((d) => d.count), 1);
  const maxSource = Math.max(...trends.bySource.map((s) => s.count), 1);

  return (
    <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-4">
      <h2 className="text-sm font-medium text-white flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-cyan-400" />
        近 7 天趋势
        <span className="text-xs text-slate-600 font-normal">共 {trends.total} 条</span>
      </h2>

      <div>
        <p className="text-[11px] text-slate-600 mb-2">按日入库</p>
        <div className="flex items-end gap-1.5 h-20">
          {trends.byDay.map((d) => (
            <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full rounded-t bg-gradient-to-t from-blue-600/80 to-cyan-500/60 min-h-[4px] transition-all"
                style={{ height: `${Math.max(8, (d.count / maxDay) * 72)}px` }}
                title={`${d.date}: ${d.count}`}
              />
              <span className="text-[9px] text-slate-600">{d.date.slice(5)}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="text-[11px] text-slate-600 mb-2">按来源</p>
        <div className="space-y-1.5">
          {trends.bySource.slice(0, 6).map((s) => (
            <div key={s.source} className="flex items-center gap-2 text-xs">
              <span className="w-24 truncate text-slate-400">{getSourceLabel(s.source)}</span>
              <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                <div
                  className={cn('h-full rounded-full bg-blue-500/70')}
                  style={{ width: `${(s.count / maxSource) * 100}%` }}
                />
              </div>
              <span className="text-slate-500 w-6 text-right">{s.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
