import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '../lib/utils';

interface SettingsSectionProps {
  id: string;
  title: string;
  description?: string;
  icon: ReactNode;
  defaultOpen?: boolean;
  badge?: ReactNode;
  children: ReactNode;
}

export default function SettingsSection({
  title,
  description,
  icon,
  defaultOpen = true,
  badge,
  children
}: SettingsSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="rounded-2xl bg-white/[0.02] border border-white/5 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 p-4 sm:p-5 text-left hover:bg-white/[0.02] transition-colors"
        aria-expanded={open}
      >
        <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/5 border border-white/10 shrink-0">
          {icon}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-sm font-medium text-white">{title}</h2>
            {badge}
          </div>
          {description && (
            <p className="text-xs text-slate-600 mt-0.5 line-clamp-1">{description}</p>
          )}
        </div>
        <ChevronDown
          className={cn(
            'w-4 h-4 text-slate-500 shrink-0 transition-transform',
            open && 'rotate-180'
          )}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-0 border-t border-white/5 space-y-4">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
