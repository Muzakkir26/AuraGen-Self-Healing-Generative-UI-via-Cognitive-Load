import React, { forwardRef } from 'react';
import { clsx } from 'clsx';
import { AlertCircle, HelpCircle } from 'lucide-react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  tooltip?: string;
  leftAddon?: React.ReactNode;
  rightAddon?: React.ReactNode;
  isStuck?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      label,
      helperText,
      error,
      tooltip,
      leftAddon,
      rightAddon,
      isStuck = false,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || props.name;

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <div className="flex items-center justify-between">
            <label
              htmlFor={inputId}
              className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
            >
              {label}
            </label>
            {tooltip && (
              <span
                className="group relative cursor-pointer text-slate-400 hover:text-slate-600"
                title={tooltip}
                aria-label={tooltip}
              >
                <HelpCircle className="w-3.5 h-3.5" />
              </span>
            )}
          </div>
        )}

        <div className="relative rounded-lg shadow-sm">
          {leftAddon && (
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              {leftAddon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            className={clsx(
              'block w-full rounded-lg border text-sm transition-all py-2.5 px-3 bg-white text-slate-900',
              leftAddon ? 'pl-9' : 'pl-3',
              rightAddon ? 'pr-9' : 'pr-3',
              error
                ? 'border-red-400 focus:border-red-500 focus:ring-red-200'
                : isStuck
                ? 'border-amber-400 ring-2 ring-amber-200 bg-amber-50/30'
                : 'border-slate-300 hover:border-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100',
              'focus:outline-none',
              className
            )}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-desc` : undefined}
            {...props}
          />

          {rightAddon && (
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400">
              {rightAddon}
            </div>
          )}
        </div>

        {error && (
          <p id={`${inputId}-error`} className="flex items-center gap-1 text-xs text-red-600">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{error}</span>
          </p>
        )}

        {!error && helperText && (
          <p id={`${inputId}-desc`} className="text-xs text-slate-500">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

