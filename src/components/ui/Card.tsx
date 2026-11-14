import React from 'react';
import { clsx } from 'clsx';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'subtle' | 'elevated' | 'glass';
}

export function Card({ variant = 'default', className, children, ...props }: CardProps) {
  const variants = {
    default: 'bg-white border border-slate-200 shadow-xs',
    subtle: 'bg-slate-50/70 border border-slate-200/80',
    elevated: 'bg-white border border-slate-200 shadow-md',
    glass: 'bg-white/80 backdrop-blur-md border border-white/50 shadow-sm',
  };

  return (
    <div className={clsx('rounded-xl overflow-hidden', variants[variant], className)} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={clsx('px-6 py-4 border-b border-slate-100 flex items-center justify-between', className)} {...props}>
      {children}
    </div>
  );
}

export function CardBody({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={clsx('p-6', className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={clsx('px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between', className)} {...props}>
      {children}
    </div>
  );
}

