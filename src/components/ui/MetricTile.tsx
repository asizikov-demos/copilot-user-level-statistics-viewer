"use client";

import React from 'react';
import Link from 'next/link';
import type { VoidCallback } from '../../types/events';
import { cn } from '../../utils/cn';
import { COLOR_PALETTE, type AccentColor } from './colorSchemes';
import type { ColorTokens } from './colorSchemes';

export type { AccentColor };

interface VariantClasses {
  container: string;
  title: string;
  value: string;
  subtitle: string;
  icon: string;
  hover?: string;
  ring: string;
  arrow: string;
  arrowHover: string;
}

function deriveVariantClasses(tokens: ColorTokens): VariantClasses {
  return {
    container: `${tokens.bg50} ${tokens.border200}`,
    title: `${tokens.text600} ${tokens.groupHoverText700}`,
    value: tokens.text900,
    subtitle: tokens.text700,
    icon: tokens.text600,
    hover: tokens.hoverBg100,
    ring: tokens.ring500,
    arrow: tokens.text500,
    arrowHover: tokens.groupHoverText600,
  };
}

export interface MetricTileProps {
  title: string;
  value: React.ReactNode | null | undefined;
  subtitle?: string | null;
  icon: React.ReactNode;
  accent: AccentColor;
  interactive?: boolean;
  onClick?: VoidCallback;
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
  const variant = deriveVariantClasses(COLOR_PALETTE[accent]);
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
