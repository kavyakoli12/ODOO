import React from 'react';

interface TrinetraLogoProps {
  className?: string;
  imageClassName?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  variant?: 'badge' | 'glow' | 'plain';
  showText?: boolean;
  textClassName?: string;
  subtitle?: string;
}

const sizeClasses = {
  xs: 'w-6 h-6',
  sm: 'w-8 h-8',
  md: 'w-9 h-9',
  lg: 'w-12 h-12',
  xl: 'w-16 h-16',
  '2xl': 'w-24 h-24',
};

export function TrinetraLogo({
  className = '',
  imageClassName = '',
  size = 'md',
  variant = 'badge',
  showText = false,
  textClassName = '',
  subtitle,
}: TrinetraLogoProps) {
  const containerSize = sizeClasses[size] || sizeClasses.md;

  const logoImage = (
    <img
      src="/logo.png"
      alt="Trinetra Logo"
      className={`w-full h-full object-contain filter drop-shadow-[0_0_6px_rgba(255,255,255,0.45)] transition-transform duration-200 select-none pointer-events-none ${imageClassName}`}
      loading="eager"
    />
  );

  let iconElement: React.ReactNode;

  if (variant === 'badge') {
    iconElement = (
      <div
        className={`${containerSize} rounded-xl bg-slate-950/90 border border-slate-700/80 shadow-lg shadow-brand-600/20 flex items-center justify-center p-1 overflow-hidden shrink-0 group-hover:border-brand-500/50 group-hover:shadow-brand-500/30 transition-all duration-200 ${className}`}
      >
        {logoImage}
      </div>
    );
  } else if (variant === 'glow') {
    iconElement = (
      <div
        className={`${containerSize} rounded-2xl bg-black border border-white/20 shadow-xl shadow-white/10 flex items-center justify-center p-1.5 shrink-0 ${className}`}
      >
        {logoImage}
      </div>
    );
  } else {
    iconElement = (
      <div className={`${containerSize} flex items-center justify-center shrink-0 ${className}`}>
        {logoImage}
      </div>
    );
  }

  if (!showText) {
    return iconElement;
  }

  return (
    <div className="flex items-center gap-2.5 group">
      {iconElement}
      <div className="flex flex-col justify-center select-none">
        <span
          className={`font-bold tracking-tight text-white leading-tight select-none ${textClassName || 'text-lg'}`}
        >
          Trinetra
        </span>
        {subtitle && (
          <span className="text-[10px] text-slate-400 leading-tight hidden sm:inline select-none">
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
}
