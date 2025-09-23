"use client";

import React from 'react';
import Link from 'next/link';
// Simple className combiner (avoids adding a dependency like clsx/twMerge)
function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

// Accent colors that currently exist in the overview dashboard.
export type AccentColor =
  | 'green'
  | 'emerald'
  | 'violet'
  | 'amber'
  | 'blue'
  | 'purple'
  | 'orange'
  | 'indigo';

interface VariantClasses {
  container: string;
  title: string;
  value: string;
  subtitle: string;
  icon: string;
  hover?: string; // only applied for interactive variant
  ring: string; // focus ring color
  arrow: string; // arrow base color
  arrowHover: string; // arrow hover color
}

// Explicit class maps (no string construction) so Tailwind never purges needed classes.
const COLOR_VARIANTS: Record<AccentColor, VariantClasses> = {
  green: {
    container: 'bg-green-50 border-green-200',
    title: 'text-green-600 group-hover:text-green-700',
    value: 'text-green-900',
    subtitle: 'text-green-700',
    icon: 'text-green-600',
    hover: 'hover:bg-green-100',
    ring: 'focus-visible:ring-green-500',
    arrow: 'text-green-500',
    arrowHover: 'group-hover:text-green-600'
  },
  emerald: {
    container: 'bg-emerald-50 border-emerald-200',
    title: 'text-emerald-600 group-hover:text-emerald-700',
    value: 'text-emerald-900',
    subtitle: 'text-emerald-700',
    icon: 'text-emerald-600',
    hover: 'hover:bg-emerald-100',
    ring: 'focus-visible:ring-emerald-500',
    arrow: 'text-emerald-500',
    arrowHover: 'group-hover:text-emerald-600'
  },
  violet: {
    container: 'bg-violet-50 border-violet-200',
    title: 'text-violet-600 group-hover:text-violet-700',
    value: 'text-violet-900',
    subtitle: 'text-violet-700',
    icon: 'text-violet-600',
    hover: 'hover:bg-violet-100',
    ring: 'focus-visible:ring-violet-500',
    arrow: 'text-violet-500',
    arrowHover: 'group-hover:text-violet-600'
  },
  amber: {
    container: 'bg-amber-50 border-amber-200',
    title: 'text-amber-600 group-hover:text-amber-700',
    value: 'text-amber-900',
    subtitle: 'text-amber-700',
    icon: 'text-amber-600',
    hover: 'hover:bg-amber-100',
    ring: 'focus-visible:ring-amber-500',
    arrow: 'text-amber-500',
    arrowHover: 'group-hover:text-amber-600'
  },
  blue: {
    container: 'bg-blue-50 border-blue-200',
    title: 'text-blue-600 group-hover:text-blue-700',
    value: 'text-blue-900',
    subtitle: 'text-blue-700',
    icon: 'text-blue-600',
    hover: 'hover:bg-blue-100',
    ring: 'focus-visible:ring-blue-500',
    arrow: 'text-blue-500',
    arrowHover: 'group-hover:text-blue-600'
  },
  purple: {
    container: 'bg-purple-50 border-purple-200',
    title: 'text-purple-600 group-hover:text-purple-700',
    value: 'text-purple-900',
    subtitle: 'text-purple-700',
    icon: 'text-purple-600',
    hover: 'hover:bg-purple-100',
    ring: 'focus-visible:ring-purple-500',
    arrow: 'text-purple-500',
    arrowHover: 'group-hover:text-purple-600'
  },
  orange: {
    container: 'bg-orange-50 border-orange-200',
    title: 'text-orange-600 group-hover:text-orange-700',
    value: 'text-orange-900',
    subtitle: 'text-orange-700',
    icon: 'text-orange-600',
    hover: 'hover:bg-orange-100',
    ring: 'focus-visible:ring-orange-500',
    arrow: 'text-orange-500',
    arrowHover: 'group-hover:text-orange-600'
  },
  indigo: {
    container: 'bg-indigo-50 border-indigo-200',
    title: 'text-indigo-600 group-hover:text-indigo-700',
    value: 'text-indigo-900',
    subtitle: 'text-indigo-700',
    icon: 'text-indigo-600',
    hover: 'hover:bg-indigo-100',
    ring: 'focus-visible:ring-indigo-500',
    arrow: 'text-indigo-500',
    arrowHover: 'group-hover:text-indigo-600'
  }
};

export interface MetricTileProps {
  title: string;
  value: React.ReactNode | null | undefined;
  subtitle?: string | null;
  icon: React.ReactNode;
  accent: AccentColor;
  interactive?: boolean;
  onClick?: () => void;
  href?: string; // future usage
  size?: 'lg' | 'md';
  showArrow?: boolean; // defaults to true when interactive
  isLoading?: boolean;
  ariaLabel?: string;
  valueFormatter?: (raw: unknown) => string;
  disabled?: boolean;
  className?: string;
  dataTestId?: string;
}

export const MetricTile: React.FC<MetricTileProps> = ({
  title,
  value,
  subtitle,
  icon,
  accent,
  interactive = false,
  onClick,
  href,
  size = 'lg',
  showArrow,
  isLoading = false,
  ariaLabel,
  valueFormatter,
  disabled = false,
  className,
  dataTestId
}) => {
  const variant = COLOR_VARIANTS[accent];
  const isLink = typeof href === 'string' && href.length > 0;
  const isButton = !isLink && (interactive || !!onClick);
  const arrow = showArrow ?? interactive;

  const displayValue = (() => {
    if (isLoading) return null;
    if (valueFormatter && value !== null && value !== undefined) {
      try {
        return valueFormatter(value);
      } catch {
        return String(value);
      }
    }
    if (value === null || value === undefined || value === '') return 'N/A';
    if (typeof value === 'number') return value.toLocaleString();
    return value;
  })();

  const commonClasses = cn(
    'rounded-lg p-4 border transition-colors relative',
    variant.container,
    !disabled && (interactive || isLink || isButton) && variant.hover,
    (interactive || isLink || isButton) && 'cursor-pointer text-left group focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
    (interactive || isLink || isButton) && variant.ring,
    disabled && 'opacity-60 cursor-not-allowed',
    className
  );

  const content = (
    <div className={cn('flex items-center', arrow ? 'justify-between' : '')}>
      <div className="flex items-center">
        <div className={cn('flex-shrink-0', variant.icon)} aria-hidden="true">
          {/* Icon wrapper */}
          {icon}
        </div>
        <div className="ml-4">
          <p className={cn('text-sm font-medium', variant.title)}>{title}</p>
          <p className={cn('font-bold', size === 'lg' ? 'text-2xl' : 'text-lg', variant.value)}>
            {isLoading ? (
              <span className="inline-block h-6 w-20 bg-white/50 rounded animate-pulse" />
            ) : (
              displayValue
            )}
          </p>
          {subtitle && !isLoading && (
            <p className={cn('text-xs', variant.subtitle)}>{subtitle}</p>
          )}
          {isLoading && (
            <p className="text-xs text-gray-400">
              <span className="inline-block h-3 w-28 bg-white/40 rounded animate-pulse" />
            </p>
          )}
        </div>
      </div>
      {arrow && (
        <div className={cn('flex-shrink-0', variant.arrow, variant.arrowHover)} aria-hidden="true">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      )}
    </div>
  );

  if (isLink) {
    // Future-proof; not used yet.
    return (
      <Link
        href={href as string}
        aria-label={ariaLabel}
        className={commonClasses}
        data-testid={dataTestId}
      >
        {content}
      </Link>
    );
  }

  if (isButton) {
    return (
      <button
        type="button"
        onClick={disabled ? undefined : onClick}
        aria-label={ariaLabel}
        aria-disabled={disabled || undefined}
        className={commonClasses}
        data-testid={dataTestId}
      >
        {content}
      </button>
    );
  }

  return (
    <div
      role="group"
      aria-label={ariaLabel || title}
      className={commonClasses}
      data-testid={dataTestId}
    >
      {content}
    </div>
  );
};

export default MetricTile;
