import React from 'react';
import { clsx } from 'clsx';

export interface ProgressBarProps {
  value: number; // 0 to 100
  max?: number;
  label?: string;
  showValueText?: boolean;
  colorScheme?: 'auto' | 'blue' | 'emerald' | 'amber' | 'rose';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ProgressBar({
  value,
  max = 100,
  label,
  showValueText = true,
  colorScheme = 'auto',
  size = 'md',
  className,
}: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, Math.round((value / max) * 100)));

  // Automatic color based on cognitive friction thresholds
  const getAutoColor = (pct: number) => {
    if (pct < 40) return 'bg-emerald-500';
    if (pct < 70) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  const colorClasses = {
    auto: getAutoColor(percentage),
    blue: 'bg-blue-600',
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    rose: 'bg-rose-500',
  };

  const heights = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  };

  return (
    <div className={clsx('w-full space-y-1', className)}>
      {(label || showValueText) && (
        <div className="flex items-center justify-between text-xs">
          {label && <span className="font-medium text-slate-700">{label}</span>}
          {showValueText && (
            <span
              className={clsx(
                'font-mono font-semibold',
                percentage >= 70 ? 'text-rose-600' : percentage >= 40 ? 'text-amber-600' : 'text-emerald-600'
              )}
            >
              {percentage}%
            </span>
          )}
        </div>
      )}

      <div
        className={clsx('w-full bg-slate-100 rounded-full overflow-hidden', heights[size])}
        role="progressbar"
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={clsx('transition-all duration-300 ease-out rounded-full', heights[size], colorClasses[colorScheme])}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

