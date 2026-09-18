import React from 'react';
import { cn } from '@/lib/utils';

export type IncidentStatusType =
  | 'submitted'
  | 'under_review'
  | 'verified'
  | 'rejected'
  | 'assigned'
  | 'investigation_ongoing'
  | 'resolved';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status?: IncidentStatusType;
  variant?: 'default' | 'outline' | 'info' | 'success' | 'warning' | 'danger';
}

const statusConfig: Record<
  IncidentStatusType,
  { label: string; bg: string; text: string; border: string; dot: string }
> = {
  submitted: {
    label: 'Submitted',
    bg: 'bg-slate-800/80',
    text: 'text-slate-300',
    border: 'border-slate-700',
    dot: 'bg-slate-400',
  },
  under_review: {
    label: 'Under Review',
    bg: 'bg-amber-950/40',
    text: 'text-amber-300',
    border: 'border-amber-700/50',
    dot: 'bg-amber-400 animate-pulse',
  },
  verified: {
    label: 'Verified Incident',
    bg: 'bg-indigo-950/40',
    text: 'text-indigo-300',
    border: 'border-indigo-700/50',
    dot: 'bg-indigo-400',
  },
  rejected: {
    label: 'Rejected',
    bg: 'bg-rose-950/40',
    text: 'text-rose-300',
    border: 'border-rose-700/50',
    dot: 'bg-rose-400',
  },
  assigned: {
    label: 'Officer Assigned',
    bg: 'bg-blue-950/40',
    text: 'text-blue-300',
    border: 'border-blue-700/50',
    dot: 'bg-blue-400',
  },
  investigation_ongoing: {
    label: 'Investigation Active',
    bg: 'bg-purple-950/40',
    text: 'text-purple-300',
    border: 'border-purple-700/50',
    dot: 'bg-purple-400',
  },
  resolved: {
    label: 'Resolved',
    bg: 'bg-emerald-950/40',
    text: 'text-emerald-300',
    border: 'border-emerald-700/50',
    dot: 'bg-emerald-400',
  },
};

export function Badge({
  className,
  status,
  variant = 'default',
  children,
  ...props
}: BadgeProps) {
  if (status && statusConfig[status]) {
    const config = statusConfig[status];
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border shadow-sm',
          config.bg,
          config.text,
          config.border,
          className
        )}
        {...props}
      >
        <span className={cn('w-1.5 h-1.5 rounded-full', config.dot)} />
        {children || config.label}
      </span>
    );
  }

  const variants = {
    default: 'bg-slate-800 text-slate-300 border-slate-700',
    outline: 'bg-transparent text-slate-300 border-slate-700',
    info: 'bg-indigo-950/50 text-indigo-300 border-indigo-700/50',
    success: 'bg-emerald-950/50 text-emerald-300 border-emerald-700/50',
    warning: 'bg-amber-950/50 text-amber-300 border-amber-700/50',
    danger: 'bg-rose-950/50 text-rose-300 border-rose-700/50',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
