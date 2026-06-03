import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X } from 'lucide-react';
import type { Notification } from '../services/api';
import { cn } from '../lib/utils';

interface NotificationPanelProps {
  notifications: Notification[];
  unreadCount: number;
  open: boolean;
  onToggle: () => void;
  onMarkAllRead: () => void;
  onNotificationClick: (n: Notification) => void;
  onDelete: (e: React.MouseEvent, id: string) => void;
}

export default function NotificationPanel({
  notifications,
  unreadCount,
  open,
  onToggle,
  onMarkAllRead,
  onNotificationClick,
  onDelete
}: NotificationPanelProps) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        className="relative p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all"
      >
        <Bell className="w-5 h-5 text-slate-400" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] font-bold flex items-center justify-center text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            className="absolute right-0 top-14 w-80 bg-[#0a0a1a]/95 backdrop-blur-2xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden z-50"
          >
            <div className="flex items-center justify-between p-4 border-b border-white/5">
              <h3 className="font-medium text-white">通知</h3>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={onMarkAllRead}
                  className="text-xs text-blue-400 hover:text-blue-300"
                >
                  全部已读
                </button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-8">暂无通知</p>
              ) : (
                <div className="divide-y divide-white/5">
                  {notifications.slice(0, 8).map((n) => (
                    <div
                      key={n.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => onNotificationClick(n)}
                      onKeyDown={(e) => e.key === 'Enter' && onNotificationClick(n)}
                      className={cn(
                        'p-4 transition-colors cursor-pointer group',
                        n.isRead ? 'opacity-50' : 'hover:bg-white/5',
                        n.hotspotId && 'hover:bg-blue-500/5'
                      )}
                    >
                      <div className="flex justify-between gap-2">
                        <p className="text-sm font-medium text-white">{n.title}</p>
                        <button
                          type="button"
                          onClick={(e) => onDelete(e, n.id)}
                          className="p-1 rounded opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400"
                          aria-label="删除通知"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{n.content}</p>
                      {n.hotspotId && (
                        <p className="text-[10px] text-blue-400/70 mt-1">点击查看详情 →</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
