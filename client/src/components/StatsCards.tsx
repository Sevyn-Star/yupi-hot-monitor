import { motion } from 'framer-motion';
import { Activity, Clock, AlertTriangle, Target } from 'lucide-react';
import type { Stats, Keyword } from '../services/api';
import { Meteors } from './ui/meteors';

interface StatsCardsProps {
  stats: Stats;
  keywords: Keyword[];
}

export default function StatsCards({ stats, keywords }: StatsCardsProps) {
  const activeCount = keywords.filter((k) => k.isActive).length;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative group p-5 rounded-2xl bg-gradient-to-br from-blue-500/10 to-transparent border border-blue-500/10 overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="relative">
          <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
            <Activity className="w-4 h-4" />
            总热点
          </div>
          <p className="text-3xl font-bold text-white">{stats.total}</p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="relative group p-5 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-transparent border border-cyan-500/10 overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="relative">
          <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
            <Clock className="w-4 h-4" />
            今日新增
          </div>
          <p className="text-3xl font-bold text-cyan-400">{stats.today}</p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="relative group p-5 rounded-2xl bg-gradient-to-br from-red-500/10 to-transparent border border-red-500/10 overflow-hidden"
      >
        <Meteors number={6} />
        <div className="relative">
          <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
            <AlertTriangle className="w-4 h-4" />
            紧急热点
          </div>
          <p className="text-3xl font-bold text-red-400">{stats.urgent}</p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="relative group p-5 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-500/10 overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="relative">
          <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
            <Target className="w-4 h-4" />
            监控词
          </div>
          <p className="text-3xl font-bold text-emerald-400">{activeCount}</p>
        </div>
      </motion.div>
    </div>
  );
}
