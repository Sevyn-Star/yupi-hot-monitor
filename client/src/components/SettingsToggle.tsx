import { cn } from '../lib/utils';

interface SettingsToggleProps {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  accent?: 'blue' | 'violet';
}

export default function SettingsToggle({
  checked,
  onChange,
  disabled,
  accent = 'blue'
}: SettingsToggleProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onChange}
      className={cn(
        'w-11 h-6 rounded-full transition-all relative shrink-0',
        checked && !disabled && (accent === 'violet' ? 'bg-violet-500' : 'bg-blue-500'),
        (!checked || disabled) && 'bg-slate-700',
        disabled && 'opacity-40 cursor-not-allowed'
      )}
    >
      <span
        className={cn(
          'absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all',
          checked ? 'left-6' : 'left-1'
        )}
      />
    </button>
  );
}
