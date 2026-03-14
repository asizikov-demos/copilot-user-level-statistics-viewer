"use client";

import React from 'react';
import { cn } from '../../utils/cn';
import { COLOR_PALETTE, type AccentColor } from './colorSchemes';
import type { ColorTokens } from './colorSchemes';

export type DashboardStatsCardAccent = Exclude<AccentColor, 'red'>;

interface AccentStyles {
  neutralValue: string;
  neutralIcon: string;
  tint: {
    container: string;
    value: string;
    label: string;
    helper: string;
    icon: string;
  };
}

function deriveAccentStyles(tokens: ColorTokens): AccentStyles {
  return {
    neutralValue: tokens.text600,
    neutralIcon: tokens.text600,
    tint: {
      container: `${tokens.bg50} ${tokens.border200}`,
      value: tokens.text900,
      label: `text-sm font-medium ${tokens.text600}`,
      helper: `text-xs ${tokens.text700}`,
      icon: tokens.text600,
    },
  };
}

const SIZE_CLASSES: Record<'lg' | 'md', string> = {
  lg: 'text-2xl',
  md: 'text-xl'
};

export interface DashboardStatsCardProps {
  label: React.ReactNode;
  value: React.ReactNode | number | string | null | undefined;
  accent?: DashboardStatsCardAccent;
  tone?: 'neutral' | 'tint';
  helperText?: React.ReactNode;
  size?: 'lg' | 'md';
  alignment?: 'left' | 'center';
  icon?: React.ReactNode;
  iconClassName?: string;
  isLoading?: boolean;
  valueFormatter?: (rawValue: unknown) => React.ReactNode;
  className?: string;
  dataTestId?: string;
}

const DEFAULT_NEUTRAL_CONTAINER = 'bg-white border-gray-200';
const DEFAULT_LABEL_CLASS = 'text-sm text-gray-600';
const DEFAULT_HELPER_CLASS = 'text-xs text-gray-500';

const DashboardStatsCard: React.FC<DashboardStatsCardProps> = ({
  label,
  value,
  accent = 'blue',
  tone = 'neutral',
  helperText,
  size = 'lg',
  alignment = 'left',
  icon,
  iconClassName,
  isLoading = false,
  valueFormatter,
  className,
  dataTestId
}) => {
  const accentStyles = deriveAccentStyles(COLOR_PALETTE[accent]);

  const containerClasses = cn(
    'rounded-lg shadow-sm border p-4 transition-colors',
    tone === 'tint' ? accentStyles.tint.container : DEFAULT_NEUTRAL_CONTAINER,
    className
  );

  const valueColor = tone === 'tint' ? accentStyles.tint.value : accentStyles.neutralValue;
  const labelClasses = tone === 'tint' ? accentStyles.tint.label : DEFAULT_LABEL_CLASS;
  const helperClasses = tone === 'tint' ? accentStyles.tint.helper : DEFAULT_HELPER_CLASS;
  const iconColor = tone === 'tint' ? accentStyles.tint.icon : accentStyles.neutralIcon;

  const contentAlignment = (() => {
    if (icon) {
      if (alignment === 'center') {
        return 'flex flex-col items-center text-center gap-3';
      }
      return 'flex items-start gap-3 text-left';
    }
    return alignment === 'center' ? 'text-center' : 'text-left';
  })();

  const formattedValue = React.useMemo(() => {
    if (isLoading) return null;
    if (valueFormatter && value !== null && value !== undefined) {
      try {
        return valueFormatter(value);
      } catch {
        return String(value);
      }
    }
    if (typeof value === 'number') return value.toLocaleString();
    if (typeof value === 'bigint') return value.toString();
    if (value === null || value === undefined || value === '') return '—';
    if (React.isValidElement(value)) return value;
    if (Array.isArray(value)) return value;
    return value as React.ReactNode;
  }, [isLoading, value, valueFormatter]);

  return (
    <div className={containerClasses} data-testid={dataTestId}>
      <div className={contentAlignment}>
        {icon && (
          <div className={cn('flex-shrink-0', iconColor, alignment === 'center' ? 'mx-auto' : '', iconClassName)}>
            {icon}
          </div>
        )}
        <div className={cn('space-y-1', !icon && alignment === 'center' ? 'text-center' : '')}>
          <div className={cn('font-bold leading-tight', SIZE_CLASSES[size], valueColor)}>
            {isLoading ? (
              <span className="inline-block h-6 w-20 rounded bg-gray-200 animate-pulse" />
            ) : (
              formattedValue
            )}
          </div>
          <div className={labelClasses}>{label}</div>
          {helperText && !isLoading && (
            <div className={helperClasses}>{helperText}</div>
          )}
          {helperText && isLoading && (
            <div className="text-xs text-gray-400">
              <span className="inline-block h-3 w-24 rounded bg-gray-200 animate-pulse" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardStatsCard;
