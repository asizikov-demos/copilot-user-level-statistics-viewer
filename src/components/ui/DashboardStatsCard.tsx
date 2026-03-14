"use client";

import React from 'react';
import { cn } from '../../utils/cn';

export type DashboardStatsCardAccent =
  | 'blue'
  | 'green'
  | 'purple'
  | 'orange'
  | 'teal'
  | 'indigo'
  | 'amber'
  | 'rose'
  | 'emerald'
  | 'violet';

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

const ACCENT_STYLES: Record<DashboardStatsCardAccent, AccentStyles> = {
  blue: {
    neutralValue: 'text-blue-600',
    neutralIcon: 'text-blue-600',
    tint: {
      container: 'bg-blue-50 border-blue-200',
      value: 'text-blue-900',
      label: 'text-sm font-medium text-blue-600',
      helper: 'text-xs text-blue-700',
      icon: 'text-blue-600'
    }
  },
  green: {
    neutralValue: 'text-green-600',
    neutralIcon: 'text-green-600',
    tint: {
      container: 'bg-green-50 border-green-200',
      value: 'text-green-900',
      label: 'text-sm font-medium text-green-600',
      helper: 'text-xs text-green-700',
      icon: 'text-green-600'
    }
  },
  purple: {
    neutralValue: 'text-purple-600',
    neutralIcon: 'text-purple-600',
    tint: {
      container: 'bg-purple-50 border-purple-200',
      value: 'text-purple-900',
      label: 'text-sm font-medium text-purple-600',
      helper: 'text-xs text-purple-700',
      icon: 'text-purple-600'
    }
  },
  orange: {
    neutralValue: 'text-orange-600',
    neutralIcon: 'text-orange-600',
    tint: {
      container: 'bg-orange-50 border-orange-200',
      value: 'text-orange-900',
      label: 'text-sm font-medium text-orange-600',
      helper: 'text-xs text-orange-700',
      icon: 'text-orange-600'
    }
  },
  teal: {
    neutralValue: 'text-teal-600',
    neutralIcon: 'text-teal-600',
    tint: {
      container: 'bg-teal-50 border-teal-200',
      value: 'text-teal-900',
      label: 'text-sm font-medium text-teal-600',
      helper: 'text-xs text-teal-700',
      icon: 'text-teal-600'
    }
  },
  indigo: {
    neutralValue: 'text-indigo-600',
    neutralIcon: 'text-indigo-600',
    tint: {
      container: 'bg-indigo-50 border-indigo-200',
      value: 'text-indigo-900',
      label: 'text-sm font-medium text-indigo-600',
      helper: 'text-xs text-indigo-700',
      icon: 'text-indigo-600'
    }
  },
  amber: {
    neutralValue: 'text-amber-600',
    neutralIcon: 'text-amber-600',
    tint: {
      container: 'bg-amber-50 border-amber-200',
      value: 'text-amber-900',
      label: 'text-sm font-medium text-amber-600',
      helper: 'text-xs text-amber-700',
      icon: 'text-amber-600'
    }
  },
  rose: {
    neutralValue: 'text-rose-600',
    neutralIcon: 'text-rose-600',
    tint: {
      container: 'bg-rose-50 border-rose-200',
      value: 'text-rose-900',
      label: 'text-sm font-medium text-rose-600',
      helper: 'text-xs text-rose-700',
      icon: 'text-rose-600'
    }
  },
  emerald: {
    neutralValue: 'text-emerald-600',
    neutralIcon: 'text-emerald-600',
    tint: {
      container: 'bg-emerald-50 border-emerald-200',
      value: 'text-emerald-900',
      label: 'text-sm font-medium text-emerald-600',
      helper: 'text-xs text-emerald-700',
      icon: 'text-emerald-600'
    }
  },
  violet: {
    neutralValue: 'text-violet-600',
    neutralIcon: 'text-violet-600',
    tint: {
      container: 'bg-violet-50 border-violet-200',
      value: 'text-violet-900',
      label: 'text-sm font-medium text-violet-600',
      helper: 'text-xs text-violet-700',
      icon: 'text-violet-600'
    }
  }
};

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
  const accentStyles = ACCENT_STYLES[accent];

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
