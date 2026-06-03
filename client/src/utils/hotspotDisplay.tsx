import {
  AlertTriangle,
  Flame,
  Zap,
  TrendingUp,
  Twitter,
  Globe,
  Eye,
  Activity,
  Search,
  Github,
  Sparkles
} from 'lucide-react';
import { SOURCE_LABELS } from '../constants/sources';
import type { Hotspot } from '../services/api';

export function calcHeatScore(h: Hotspot): number {
  const likes = h.likeCount ?? 0;
  const retweets = h.retweetCount ?? 0;
  const replies = h.replyCount ?? 0;
  const comments = h.commentCount ?? 0;
  const quotes = h.quoteCount ?? 0;
  const views = h.viewCount ?? 0;
  const raw =
    likes * 2 + retweets * 3 + replies * 1.5 + comments * 1.5 + quotes * 2 + views / 100;
  if (raw <= 0) return 0;
  return Math.min(100, Math.round(Math.log10(raw + 1) * 25));
}

export function getHeatLevel(score: number): { label: string; color: string } {
  if (score >= 80) return { label: '爆', color: 'text-red-400' };
  if (score >= 60) return { label: '热', color: 'text-orange-400' };
  if (score >= 40) return { label: '温', color: 'text-amber-400' };
  if (score >= 20) return { label: '凉', color: 'text-blue-400' };
  return { label: '冷', color: 'text-slate-500' };
}

export function getImportanceIcon(importance: string) {
  switch (importance) {
    case 'urgent':
      return <AlertTriangle className="w-4 h-4" />;
    case 'high':
      return <Flame className="w-4 h-4" />;
    case 'medium':
      return <Zap className="w-4 h-4" />;
    default:
      return <TrendingUp className="w-4 h-4" />;
  }
}

export function getSourceIcon(source: string) {
  switch (source) {
    case 'twitter':
      return <Twitter className="w-4 h-4" />;
    case 'bilibili':
      return <Eye className="w-4 h-4" />;
    case 'weibo':
      return <Activity className="w-4 h-4" />;
    case 'sogou':
      return <Search className="w-4 h-4" />;
    case 'hackernews':
      return <Zap className="w-4 h-4" />;
    case 'github':
      return <Github className="w-4 h-4" />;
    case 'huggingface':
      return <Sparkles className="w-4 h-4" />;
    default:
      return <Globe className="w-4 h-4" />;
  }
}

export function getSourceLabel(source: string): string {
  return SOURCE_LABELS[source] || source;
}
