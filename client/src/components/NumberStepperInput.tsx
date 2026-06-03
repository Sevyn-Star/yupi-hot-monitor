import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '../lib/utils';

interface NumberStepperInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
}

export default function NumberStepperInput({
  value,
  onChange,
  min = 0,
  max = Infinity,
  step = 1,
  className
}: NumberStepperInputProps) {
  const clamp = (n: number) => Math.min(max, Math.max(min, n));

  const adjust = (delta: number) => {
    onChange(clamp(value + delta));
  };

  return (
    <div
      className={cn(
        'flex rounded-xl border border-white/10 bg-white/5 overflow-hidden',
        'focus-within:border-blue-500/50 focus-within:ring-2 focus-within:ring-blue-500/20',
        className
      )}
    >
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => {
          const parsed = Number(e.target.value);
          onChange(clamp(Number.isFinite(parsed) ? parsed : min));
        }}
        className="input-no-spinner flex-1 min-w-0 px-4 py-3 bg-transparent text-white text-sm focus:outline-none"
      />
      <div className="flex flex-col border-l border-white/10 shrink-0">
        <button
          type="button"
          aria-label="增加"
          disabled={value >= max}
          onClick={() => adjust(step)}
          className={cn(
            'flex-1 flex items-center justify-center px-2.5 min-h-[22px]',
            'text-slate-500 hover:text-white hover:bg-white/[0.06] transition-colors',
            'disabled:opacity-30 disabled:pointer-events-none'
          )}
        >
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          aria-label="减少"
          disabled={value <= min}
          onClick={() => adjust(-step)}
          className={cn(
            'flex-1 flex items-center justify-center px-2.5 min-h-[22px] border-t border-white/10',
            'text-slate-500 hover:text-white hover:bg-white/[0.06] transition-colors',
            'disabled:opacity-30 disabled:pointer-events-none'
          )}
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
