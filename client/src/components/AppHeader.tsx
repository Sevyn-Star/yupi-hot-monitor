import { motion } from 'framer-motion';
import { Flame, RefreshCw } from 'lucide-react';
import { cn } from '../lib/utils';
import ScanStatusBar from './ScanStatusBar';
import NotificationPanel from './NotificationPanel';
import { useApp } from '../context/AppContext';

export default function AppHeader() {
  const {
    notifications,
    unreadCount,
    isChecking,
    showNotifications,
    setShowNotifications,
    handleManualCheck,
    handleNotificationClick,
    handleDeleteNotification,
    handleMarkAllRead
  } = useApp();

  return (
    <header className="sticky top-0 z-40 backdrop-blur-2xl bg-[#050510]/70 border-b border-white/5">
      <div className="max-w-6xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Flame className="w-5 h-5 text-white" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-[#050510] animate-pulse" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white tracking-tight">HotPulse</h1>
              <p className="text-xs text-slate-500">AI 热点雷达</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ScanStatusBar />
            <motion.button
              type="button"
              onClick={handleManualCheck}
              disabled={isChecking}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                'px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition-all',
                isChecking
                  ? 'bg-blue-500/20 text-blue-400 cursor-wait'
                  : 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40'
              )}
            >
              <RefreshCw className={cn('w-4 h-4', isChecking && 'animate-spin')} />
              {isChecking ? '扫描中' : '立即扫描'}
            </motion.button>

            <NotificationPanel
              notifications={notifications}
              unreadCount={unreadCount}
              open={showNotifications}
              onToggle={() => setShowNotifications(!showNotifications)}
              onMarkAllRead={handleMarkAllRead}
              onNotificationClick={handleNotificationClick}
              onDelete={handleDeleteNotification}
            />
          </div>
        </div>
      </div>
    </header>
  );
}
