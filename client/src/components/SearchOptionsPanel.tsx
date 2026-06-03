import { useEffect, useMemo, useState } from 'react';
import { discoverApi, type DiscoveryPlatformInfo } from '../services/api';
import { DATA_SOURCE_OPTIONS } from '../constants/sources';
import { cn } from '../lib/utils';

export interface SearchOptionsState {
  source: string;
  timeWindow: string;
  sortBy: string;
}

export const defaultSearchOptions: SearchOptionsState = {
  source: '',
  timeWindow: '',
  sortBy: ''
};

const TIME_OPTIONS = [
  { value: '', label: '不限时间' },
  { value: 'today', label: '今天' },
  { value: '7d', label: '近 7 天' },
  { value: '30d', label: '近 30 天' }
];

const DEFAULT_SORT_OPTIONS = [
  { value: '', label: '默认（相关性）' },
  { value: 'hot', label: '热度综合' },
  { value: 'views', label: '播放量/浏览' },
  { value: 'stars', label: 'Star 数' },
  { value: 'likes', label: '点赞数' },
  { value: 'comments', label: '评论数' },
  { value: 'publishedAt', label: '最新发布' }
];

interface SearchOptionsPanelProps {
  value: SearchOptionsState;
  onChange: (value: SearchOptionsState) => void;
}

export default function SearchOptionsPanel({ value, onChange }: SearchOptionsPanelProps) {
  const [platforms, setPlatforms] = useState<DiscoveryPlatformInfo[]>([]);

  useEffect(() => {
    discoverApi.getCapabilities().then((r) => setPlatforms(r.platforms)).catch(() => {});
  }, []);

  const sortOptions = useMemo(() => {
    if (!value.source) return DEFAULT_SORT_OPTIONS;
    const platform = platforms.find((p) => p.source === value.source);
    if (!platform) return DEFAULT_SORT_OPTIONS;
    return [
      { value: '', label: '默认（相关性）' },
      ...platform.capabilities.sortMetrics.map((m) => ({
        value: m.value === 'updated' ? 'publishedAt' : m.value,
        label: m.label
      })),
      { value: 'publishedAt', label: '最新发布' }
    ].filter((opt, i, arr) => arr.findIndex((o) => o.value === opt.value) === i);
  }, [value.source, platforms]);

  const timeOptions = useMemo(() => {
    if (!value.source) return TIME_OPTIONS;
    const platform = platforms.find((p) => p.source === value.source);
    if (!platform) return TIME_OPTIONS;
    const allowed = new Set(platform.capabilities.timeWindows);
    return TIME_OPTIONS.filter((o) => !o.value || allowed.has(o.value));
  }, [value.source, platforms]);

  const set = (patch: Partial<SearchOptionsState>) => onChange({ ...value, ...patch });

  return (
    <div className="space-y-4 pt-4 border-t border-white/5">
      <div>
        <p className="text-xs text-slate-500 mb-2">搜索范围</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => set({ source: '' })}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm border',
              !value.source
                ? 'bg-blue-500/15 border-blue-500/35 text-blue-300'
                : 'border-white/5 text-slate-500 hover:text-slate-300'
            )}
          >
            全部已启用源
          </button>
          {DATA_SOURCE_OPTIONS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => set({ source: id, timeWindow: '', sortBy: '' })}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm border',
                value.source === id
                  ? 'bg-blue-500/15 border-blue-500/35 text-blue-300'
                  : 'border-white/5 text-slate-500 hover:text-slate-300'
              )}
            >
              {label.replace(' / X', '')}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs text-slate-500 mb-2">时间范围（下传到数据源 API）</p>
        <div className="flex flex-wrap gap-2">
          {timeOptions.map((o) => (
            <button
              key={o.value || 'all'}
              type="button"
              onClick={() => set({ timeWindow: o.value })}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm border',
                value.timeWindow === o.value
                  ? 'bg-white/10 border-white/20 text-white'
                  : 'border-white/5 text-slate-500 hover:text-slate-300'
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs text-slate-500 mb-2">排序（点击切换，单源时最有效）</p>
        <div className="flex flex-wrap gap-2">
          {sortOptions.map((o) => (
            <button
              key={o.value || 'default'}
              type="button"
              onClick={() => set({ sortBy: o.value })}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm border',
                value.sortBy === o.value
                  ? 'bg-amber-500/15 border-amber-500/35 text-amber-300'
                  : 'border-white/5 text-slate-500 hover:text-slate-300'
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
