import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink, Loader2, Trash2 } from 'lucide-react';
import { hotspotsApi, type Hotspot } from '../services/api';
import { useApp } from '../context/AppContext';
import { cn } from '../lib/utils';
import { formatDateTime, relativeTime } from '../utils/relativeTime';

interface HotspotDetailDrawerProps {
  hotspotId: string | null;
  onClose: () => void;
}

export default function HotspotDetailDrawer({
  hotspotId,
  onClose
}: HotspotDetailDrawerProps) {
  const { showToast, bumpHotspotRefresh } = useApp();
  const [hotspot, setHotspot] = useState<Hotspot | null>(null);
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!hotspotId || !confirm('确定删除这条热点？')) return;
    try {
      await hotspotsApi.delete(hotspotId);
      showToast('已删除', 'success');
      bumpHotspotRefresh();
      onClose();
    } catch {
      showToast('删除失败', 'error');
    }
  };

  useEffect(() => {
    if (!hotspotId) {
      setHotspot(null);
      return;
    }
    setLoading(true);
    hotspotsApi
      .getById(hotspotId)
      .then(setHotspot)
      .catch(() => setHotspot(null))
      .finally(() => setLoading(false));
  }, [hotspotId]);

  return (
    <AnimatePresence>
      {hotspotId && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-[#0a0a1a] border-l border-white/10 shadow-2xl flex flex-col"
          >
            <div className="flex items-center justify-between p-4 border-b border-white/5">
              <h2 className="font-medium text-white">热点详情</h2>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-white/10 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {loading && (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                </div>
              )}
              {!loading && !hotspot && (
                <p className="text-slate-500 text-sm text-center py-12">无法加载热点</p>
              )}
              {hotspot && (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded text-[10px] uppercase font-semibold',
                        hotspot.importance === 'urgent' && 'bg-red-500/15 text-red-400',
                        hotspot.importance === 'high' && 'bg-orange-500/15 text-orange-400',
                        hotspot.importance === 'medium' && 'bg-amber-500/15 text-amber-400',
                        hotspot.importance === 'low' && 'bg-emerald-500/15 text-emerald-400'
                      )}
                    >
                      {hotspot.importance}
                    </span>
                    <span className="text-xs text-slate-500">{hotspot.source}</span>
                    {hotspot.keyword && (
                      <span className="text-xs text-blue-400">{hotspot.keyword.text}</span>
                    )}
                  </div>

                  <h3 className="text-lg font-medium text-white leading-snug">
                    {hotspot.title}
                  </h3>

                  {hotspot.summary && (
                    <div>
                      <p className="text-[10px] text-blue-400/60 mb-1">AI 摘要</p>
                      <p className="text-sm text-slate-400">{hotspot.summary}</p>
                    </div>
                  )}

                  {hotspot.relevanceReason && (
                    <div>
                      <p className="text-[10px] text-blue-400/60 mb-1">AI 分析理由</p>
                      <p className="text-sm text-slate-500">{hotspot.relevanceReason}</p>
                    </div>
                  )}

                  <p className="text-xs text-slate-600">
                    相关性 {hotspot.relevance}% ·{' '}
                    {hotspot.isReal ? '可信' : '可疑'}
                  </p>

                  {hotspot.publishedAt && (
                    <p className="text-xs text-slate-600">
                      发布 {relativeTime(hotspot.publishedAt)}（
                      {formatDateTime(hotspot.publishedAt)}）
                    </p>
                  )}

                  {hotspot.content && (
                    <p className="text-sm text-slate-500 whitespace-pre-wrap border-t border-white/5 pt-4">
                      {hotspot.content}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2 pt-2">
                    <a
                      href={hotspot.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500/15 text-blue-400 text-sm hover:bg-blue-500/25"
                    >
                      <ExternalLink className="w-4 h-4" />
                      查看原文
                    </a>
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-500/20 text-red-400 text-sm hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                      删除
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
