"use client";

import React from 'react';
import { cn } from '../../utils/cn';
import { resolveCardRole, type AccentColor } from './semanticRoles';
import roleStyles from './semanticRoles.module.css';
import SkeletonText from './SkeletonText';
import styles from './DashboardStatsCard.module.css';

export type DashboardStatsCardAccent = Exclude<AccentColor, 'red'>;

export interface DashboardStatsCardProps {
  label: React.ReactNode;
  value: React.ReactNode | number | string | null | undefined;
  /** Legacy accent name; decorative accents render neutral, status accents keep their semantic role. */
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
    <div
      className={cn(roleStyles.role, styles.card, className)}
      data-component="DashboardStatsCard"
      data-role={resolveCardRole(accent)}
      data-tone={tone}
      data-size={size}
      data-alignment={alignment}
      data-testid={dataTestId}
    >
      <div className={styles.content} data-has-icon={icon ? 'true' : undefined}>
        {icon && (
          <div className={cn(styles.icon, iconClassName)}>
            {icon}
          </div>
        )}
        <div className={styles.body}>
          <div className={styles.value}>
            {isLoading ? (
              <SkeletonText size={size === 'md' ? 'titleSmall' : 'titleMedium'} maxWidth="5rem" />
            ) : (
              formattedValue
            )}
          </div>
          <div className={styles.label}>{label}</div>
          {helperText && !isLoading && (
            <div className={styles.helper}>{helperText}</div>
          )}
          {helperText && isLoading && (
            <div className={styles.helper}>
              <SkeletonText size="bodySmall" maxWidth="6rem" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardStatsCard;
