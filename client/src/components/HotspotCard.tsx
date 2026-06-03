import { motion, AnimatePresence } from 'framer-motion';
import {
  ExternalLink,
  Target,
  Zap,
  Eye,
  MessageCircle,
  Repeat2,
  Quote,
  User,
  Shield,
  ShieldAlert,
  ThermometerSun,
  FileText,
  ChevronDown,
  ChevronUp,
  Clock,
  Activity,
  Trash2,
  BookmarkPlus
} from 'lucide-react';
import type { Hotspot } from '../services/api';
import { cn } from '../lib/utils';
import {
  calcHeatScore,
  getHeatLevel,
  getImportanceIcon,
  getSourceIcon,
  getSourceLabel
} from '../utils/hotspotDisplay';
import { relativeTime, formatDateTime } from '../utils/relativeTime';

export interface HotspotCardProps {
  hotspot: Hotspot;
  index?: number;
  variant?: 'full' | 'compact';
  showKeyword?: boolean;
  expandedReason?: boolean;
  expandedContent?: boolean;
  onToggleReason?: () => void;
  onToggleContent?: () => void;
  onTitleClick?: () => void;
  onDelete?: () => void;
  onSaveToDb?: () => void;
  isSearchResult?: boolean;
}

export default function HotspotCard({
  hotspot,
  index = 0,
  variant = 'full',
  showKeyword = true,
  expandedReason = false,
  expandedContent = false,
  onToggleReason,
  onToggleContent,
  onTitleClick,
  onDelete,
  onSaveToDb,
  isSearchResult = false
}: HotspotCardProps) {
  const heatScore = calcHeatScore(hotspot);
  const heat = getHeatLevel(heatScore);
  const isFull = variant === 'full';

  return (
    <motion.div
      initial={{ opacity: 0, x: isFull ? -10 : 0, y: isFull ? 0 : 10 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className="group p-5 rounded-2xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 hover:border-white/10 transition-all"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {(onDelete || onSaveToDb) && (
            <div className="flex justify-end gap-1 mb-2 opacity-0 group-hover:opacity-100 transition-opacity">
              {onSaveToDb && isSearchResult && (
                <button
                  type="button"
                  onClick={onSaveToDb}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10"
                  title="保存到库"
                >
                  <BookmarkPlus className="w-4 h-4" />
                </button>
              )}
              {onDelete && !isSearchResult && (
                <button
                  type="button"
                  onClick={onDelete}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10"
                  title="删除"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span
              className={cn(
                'px-2.5 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-wider flex items-center',
                hotspot.importance === 'urgent' && 'bg-red-500/15 text-red-400 border border-red-500/20',
                hotspot.importance === 'high' && 'bg-orange-500/15 text-orange-400 border border-orange-500/20',
                hotspot.importance === 'medium' && 'bg-amber-500/15 text-amber-400 border border-amber-500/20',
                hotspot.importance === 'low' && 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
              )}
            >
              {getImportanceIcon(hotspot.importance)}
              <span className="ml-1">{hotspot.importance}</span>
            </span>
            <span className="flex items-center gap-1 text-xs text-slate-600">
              {getSourceIcon(hotspot.source)}
              {getSourceLabel(hotspot.source)}
            </span>
            {showKeyword && hotspot.keyword && (
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20">
                {hotspot.keyword.text}
              </span>
            )}
            {!hotspot.isReal && (
              <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-red-500/10 text-red-400 border border-red-500/20">
                <ShieldAlert className="w-3 h-3" />
                可疑
              </span>
            )}
            {hotspot.isReal && hotspot.relevance >= 80 && isFull && (
              <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Shield className="w-3 h-3" />
                可信
              </span>
            )}
            {isFull && hotspot.keywordMentioned === true && (
              <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <Target className="w-3 h-3" />
                直接提及
              </span>
            )}
            {isFull && hotspot.keywordMentioned === false && (
              <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
                <Target className="w-3 h-3" />
                间接相关
              </span>
            )}
            <span
              className={cn(
                'flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-white/5 border border-white/10 font-medium',
                heat.color
              )}
            >
              <ThermometerSun className="w-3 h-3" />
              {heat.label} {heatScore}
            </span>
          </div>

          <h3
            className={cn(
              'font-medium text-white mb-2 line-clamp-2 group-hover:text-blue-400 transition-colors',
              onTitleClick && 'cursor-pointer'
            )}
            onClick={onTitleClick}
          >
            {hotspot.title}
          </h3>

          {hotspot.summary && (
            <div className="mb-3">
              <span className="text-[10px] text-blue-400/60 font-medium mr-1.5">AI 摘要</span>
              <span className="text-sm text-slate-500">{hotspot.summary}</span>
            </div>
          )}

          {isFull && hotspot.authorName && (
            <div className="flex items-center gap-2 mb-3">
              {hotspot.authorAvatar ? (
                <img src={hotspot.authorAvatar} alt="" className="w-5 h-5 rounded-full object-cover" />
              ) : (
                <User className="w-4 h-4 text-slate-600" />
              )}
              <span className="text-xs text-slate-400">
                {hotspot.authorName}
                {hotspot.authorUsername && (
                  <span className="text-slate-600 ml-1">@{hotspot.authorUsername}</span>
                )}
              </span>
              {hotspot.authorVerified && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400">
                  ✓ 认证
                </span>
              )}
              {hotspot.authorFollowers != null && hotspot.authorFollowers > 0 && (
                <span className="text-[10px] text-slate-600">
                  {hotspot.authorFollowers.toLocaleString()} 粉丝
                </span>
              )}
            </div>
          )}

          {!isFull && hotspot.authorName && (
            <div className="flex items-center gap-2 mb-2">
              <User className="w-4 h-4 text-slate-600" />
              <span className="text-xs text-slate-400">{hotspot.authorName}</span>
              {hotspot.authorVerified && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400">
                  ✓ 认证
                </span>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 mb-2">
            <span className="flex items-center gap-1">
              <Target className="w-3.5 h-3.5" />
              相关性 {hotspot.relevance}%
            </span>
            {hotspot.likeCount != null && hotspot.likeCount > 0 && (
              <span className="flex items-center gap-1" title="点赞">
                <Zap className="w-3.5 h-3.5" />
                {hotspot.likeCount.toLocaleString()}
              </span>
            )}
            {isFull && hotspot.retweetCount != null && hotspot.retweetCount > 0 && (
              <span className="flex items-center gap-1" title="转发">
                <Repeat2 className="w-3.5 h-3.5" />
                {hotspot.retweetCount.toLocaleString()}
              </span>
            )}
            {isFull && hotspot.replyCount != null && hotspot.replyCount > 0 && (
              <span className="flex items-center gap-1" title="回复">
                <MessageCircle className="w-3.5 h-3.5" />
                {hotspot.replyCount.toLocaleString()}
              </span>
            )}
            {isFull && hotspot.commentCount != null && hotspot.commentCount > 0 && (
              <span className="flex items-center gap-1" title="评论">
                <MessageCircle className="w-3.5 h-3.5" />
                {hotspot.commentCount.toLocaleString()}
              </span>
            )}
            {isFull && hotspot.quoteCount != null && hotspot.quoteCount > 0 && (
              <span className="flex items-center gap-1" title="引用">
                <Quote className="w-3.5 h-3.5" />
                {hotspot.quoteCount.toLocaleString()}
              </span>
            )}
            {hotspot.viewCount != null && hotspot.viewCount > 0 && (
              <span className="flex items-center gap-1" title="浏览量">
                <Eye className="w-3.5 h-3.5" />
                {hotspot.viewCount.toLocaleString()}
              </span>
            )}
            {isFull && hotspot.danmakuCount != null && hotspot.danmakuCount > 0 && (
              <span className="flex items-center gap-1" title="弹幕">
                💬 {hotspot.danmakuCount.toLocaleString()}
              </span>
            )}
          </div>

          {isFull ? (
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600">
              {hotspot.publishedAt && (
                <span
                  className="flex items-center gap-1"
                  title={`发布于 ${formatDateTime(hotspot.publishedAt)}`}
                >
                  <Clock className="w-3 h-3" />
                  发布 {relativeTime(hotspot.publishedAt)}
                </span>
              )}
              <span
                className="flex items-center gap-1"
                title={`抓取于 ${formatDateTime(hotspot.createdAt)}`}
              >
                <Activity className="w-3 h-3" />
                抓取 {relativeTime(hotspot.createdAt)}
              </span>
            </div>
          ) : (
            hotspot.publishedAt && (
              <div
                className="flex items-center gap-1 text-[11px] text-slate-600 mt-1"
                title={formatDateTime(hotspot.publishedAt)}
              >
                <Clock className="w-3 h-3" />
                发布 {relativeTime(hotspot.publishedAt)}
              </div>
            )
          )}

          {isFull && hotspot.relevanceReason && onToggleReason && (
            <div className="mt-2">
              <button
                type="button"
                onClick={onToggleReason}
                className="flex items-center gap-1 text-[11px] text-blue-400/70 hover:text-blue-400 transition-colors"
              >
                {expandedReason ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                AI 分析理由
              </button>
              <AnimatePresence>
                {expandedReason && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <p className="text-xs text-slate-500 mt-1 pl-4 border-l-2 border-blue-500/20">
                      {hotspot.relevanceReason}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {isFull && hotspot.content && hotspot.content !== hotspot.summary && onToggleContent && (
            <div className="mt-2">
              <button
                type="button"
                onClick={onToggleContent}
                className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-300 transition-colors"
              >
                {expandedContent ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                <FileText className="w-3 h-3" />
                原始内容
              </button>
              <AnimatePresence>
                {expandedContent && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <p className="text-xs text-slate-500 mt-1 pl-4 border-l-2 border-white/10 whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
                      {hotspot.content}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {isFull ? (
          <a
            href={hotspot.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-blue-500/20 text-slate-500 hover:text-blue-400 transition-all opacity-0 group-hover:opacity-100"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        ) : (
          <a
            href={hotspot.url}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 px-4 py-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-sm font-medium transition-all"
          >
            查看
          </a>
        )}
      </div>
    </motion.div>
  );
}
