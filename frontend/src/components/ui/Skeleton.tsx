import React from 'react';
import { cn } from '@/lib/utils';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className, ...props }) => {
  return (
    <div
      className={cn('animate-pulse rounded-lg bg-slate-800/80 border border-slate-800/50', className)}
      {...props}
    />
  );
};

export const CardSkeleton: React.FC = () => (
  <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-3">
    <div className="flex justify-between items-center">
      <Skeleton className="h-5 w-1/3" />
      <Skeleton className="h-5 w-16" />
    </div>
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-2/3" />
    <div className="flex justify-between pt-2">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-4 w-16" />
    </div>
  </div>
);

export const MapSkeleton: React.FC = () => (
  <div className="relative w-full h-full min-h-[400px] rounded-xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-center p-6 overflow-hidden">
    <Skeleton className="absolute inset-0 w-full h-full opacity-30" />
    <div className="z-10 flex flex-col items-center space-y-3 text-center">
      <Skeleton className="w-12 h-12 rounded-full" />
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-4 w-32" />
    </div>
  </div>
);
