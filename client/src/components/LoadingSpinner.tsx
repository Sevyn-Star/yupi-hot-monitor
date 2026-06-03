import { cn } from '../lib/utils';

interface LoadingSpinnerProps {
  className?: string;
  size?: 'sm' | 'md';
}

export default function LoadingSpinner({ className, size = 'md' }: LoadingSpinnerProps) {
  return (
    <div className={cn('flex items-center justify-center py-16', className)}>
      <div
        className={cn(
          'border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin',
          size === 'sm' ? 'w-4 h-4' : 'w-8 h-8'
        )}
      />
    </div>
  );
}
