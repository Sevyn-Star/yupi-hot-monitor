import { motion } from 'framer-motion';
import { ExternalLink, Sparkles } from 'lucide-react';
import type { DiscoverHotspot } from '../services/api';
import { cn } from '../lib/utils';
import { getSourceIcon, getSourceLabel } from '../utils/hotspotDisplay';
import { formatDateTime } from '../utils/relativeTime';

interface DiscoveryResultCardProps {
  hotspot: DiscoverHotspot;
  rank: number;
  index?: number;
  aiHighlighted?: boolean;
}

export default function DiscoveryResultCard({
  hotspot,
  rank,
  index = 0,
  aiHighlighted = false
}: DiscoveryResultCardProps) {
  const ml = hotspot.metricLabels;
  const sourceIcon = getSourceIcon(hotspot.source);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all"
    >
      <div className="flex items-start gap-4">
        <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-sm font-bold text-slate-400">
          {rank}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-white/5 text-slate-400 border border-white/10">
              {sourceIcon}
              {getSourceLabel(hotspot.source)}
            </span>
            {aiHighlighted && (
              <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-violet-500/10 text-violet-300 border border-violet-500/20">
                <Sparkles className="w-3 h-3" />
                AI 已分析
              </span>
            )}
          </div>

          <a
            href={hotspot.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-white hover:text-blue-400 transition-colors line-clamp-2 flex items-start gap-2"
          >
            {hotspot.title}
            <ExternalLink className="w-3.5 h-3.5 flex-shrink-0 mt-1 opacity-40" />
          </a>

          <p className="text-sm text-slate-500 mt-1 line-clamp-2">{hotspot.content}</p>
          {hotspot.publishedAt && (
            <p className="text-[11px] text-cyan-500/70 mt-1">
              最近推送 {formatDateTime(hotspot.publishedAt)}
            </p>
          )}

          {hotspot.summary && aiHighlighted && (
            <p className="text-xs text-violet-300/80 mt-2 border-l-2 border-violet-500/30 pl-2">
              {hotspot.summary}
            </p>
          )}

          <div className="flex flex-wrap gap-2 mt-3">
            {ml ? (
              <>
                <MetricChip label={ml.primary} value={ml.primaryValue} accent />
                {ml.secondary != null && ml.secondaryValue != null && (
                  <MetricChip label={ml.secondary} value={ml.secondaryValue} />
                )}
              </>
            ) : (
              <>
                {hotspot.score != null && (
                  <MetricChip label="热度" value={hotspot.score} accent />
                )}
                {hotspot.viewCount != null && hotspot.viewCount > 0 && (
                  <MetricChip label="热度值" value={hotspot.viewCount} accent />
                )}
                {hotspot.likeCount != null && hotspot.likeCount > 0 && (
                  <MetricChip label="Fork 数" value={hotspot.likeCount} />
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function MetricChip({
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
        'text-xs px-2.5 py-1 rounded-lg border tabular-nums',
        accent
          ? 'bg-cyan-500/10 border-cyan-500/25 text-cyan-300'
          : 'bg-white/5 border-white/10 text-slate-400'
      )}
    >
      <span className="text-slate-500 mr-1">{label}</span>
      {value.toLocaleString()}
    </span>
  );
}
