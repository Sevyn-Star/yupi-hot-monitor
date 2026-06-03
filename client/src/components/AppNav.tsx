import { NavLink } from 'react-router-dom';
import { Activity, Target, Search, Settings, Compass } from 'lucide-react';
import { cn } from '../lib/utils';

const tabs = [
  { to: '/', label: '热点雷达', icon: Activity, end: true as const },
  { to: '/keywords', label: '监控词', icon: Target, end: false as const },
  { to: '/discover', label: '平台发现', icon: Compass, end: false as const },
  { to: '/search', label: '搜索', icon: Search, end: false as const },
  { to: '/settings', label: '设置', icon: Settings, end: false as const }
];

export default function AppNav() {
  return (
    <nav className="flex gap-2 mb-8 flex-wrap">
      {tabs.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            cn(
              'px-5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition-all',
              isActive
                ? 'bg-white/10 text-white border border-white/10'
                : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
            )
          }
        >
          <Icon className="w-4 h-4" />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
