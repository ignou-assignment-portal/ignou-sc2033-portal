import React from 'react';

export interface InstitutionalSealProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;
  ariaLabel?: string;
}

const sizeMap: Record<string, string> = {
  xs: 'w-6 h-6',
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-14 h-14',
  xl: 'w-20 h-20',
};

export const InstitutionalSeal: React.FC<InstitutionalSealProps> = ({
  className = '',
  size = 'md',
  ariaLabel = 'IGNOU Study Centre 2033 Official Logo',
}) => {
  const sizeClass = typeof size === 'string' ? sizeMap[size] || sizeMap.md : '';
  const inlineStyle = typeof size === 'number' ? { width: `${size}px`, height: `${size}px` } : undefined;

  return (
    <div
      className={`inline-flex items-center justify-center shrink-0 select-none ${sizeClass} ${className}`}
      style={inlineStyle}
      role="img"
      aria-label={ariaLabel}
      title={ariaLabel}
    >
      <img
        src="/assets/ignou_sc2033_logo.png"
        alt={ariaLabel}
        className="w-full h-full object-contain filter drop-shadow-2xs dark:brightness-110 dark:contrast-105"
        loading="eager"
        decoding="async"
        onError={(e) => {
          // Fallback to icon.svg if PNG load ever fails
          const target = e.currentTarget as HTMLImageElement;
          if (target && !target.src.includes('icon.svg')) {
            target.src = '/icon.svg';
          }
        }}
      />
    </div>
  );
};
