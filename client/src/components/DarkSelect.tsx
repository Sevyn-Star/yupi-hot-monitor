import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';

export interface DarkSelectOption<T extends string = string> {
  value: T;
  label: string;
}

interface DarkSelectProps<T extends string = string> {
  value: T;
  options: DarkSelectOption<T>[];
  onChange: (value: T) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export default function DarkSelect<T extends string = string>({
  value,
  options,
  onChange,
  placeholder = '请选择',
  className,
  disabled = false
}: DarkSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <div className={cn('relative', className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl',
          'bg-white/5 border border-white/10 text-left transition-all',
          'hover:border-white/20 focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20',
          disabled && 'opacity-50 cursor-not-allowed',
          open && 'border-violet-500/40 ring-2 ring-violet-500/20'
        )}
      >
        <span className={cn('text-sm truncate', selected ? 'text-white' : 'text-slate-500')}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown
          className={cn(
            'w-4 h-4 shrink-0 text-slate-500 transition-transform',
            open && 'rotate-180 text-violet-400'
          )}
        />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <button
              type="button"
              className="fixed inset-0 z-40 cursor-default"
              aria-label="关闭"
              onClick={() => setOpen(false)}
            />
            <motion.ul
              role="listbox"
              initial={{ opacity: 0, y: 6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="absolute left-0 right-0 top-full mt-1.5 z-50 py-1 rounded-xl bg-[#12122a] border border-white/10 shadow-2xl shadow-black/50 overflow-hidden"
            >
              {options.map((option) => {
                const isSelected = option.value === value;
                return (
                  <li key={option.value} role="option" aria-selected={isSelected}>
                    <button
                      type="button"
                      onClick={() => {
                        onChange(option.value);
                        setOpen(false);
                      }}
                      className={cn(
                        'w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-left transition-colors',
                        isSelected
                          ? 'bg-violet-500/15 text-violet-200'
                          : 'text-slate-300 hover:bg-white/[0.06] hover:text-white'
                      )}
                    >
                      <span
                        className={cn(
                          'w-4 h-4 flex items-center justify-center shrink-0',
                          isSelected ? 'text-violet-400' : 'text-transparent'
                        )}
                      >
                        <Check className="w-3.5 h-3.5" />
                      </span>
                      {option.label}
                    </button>
                  </li>
                );
              })}
            </motion.ul>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
