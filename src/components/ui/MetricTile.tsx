"use client";

import React from 'react';
import Link from 'next/link';
import { ChevronRightIcon } from '@primer/octicons-react';
import type { VoidCallback } from '../../types/events';
import { cn } from '../../utils/cn';
import { resolveCardRole, type AccentColor } from './semanticRoles';
import roleStyles from './semanticRoles.module.css';
import SkeletonText from './SkeletonText';
import styles from './MetricTile.module.css';

export type { AccentColor };

export interface MetricTileProps {
  title: string;
  value: React.ReactNode | null | undefined;
  subtitle?: string | null;
  icon: React.ReactNode;
  /** Legacy accent name; decorative accents render neutral, status accents keep their semantic role. */
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
  const role = resolveCardRole(accent);
  const isLink = typeof href === 'string' && href.length > 0;
  const isButton = !isLink && (interactive || !!onClick);
  const isInteractive = interactive || isLink || isButton;
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

  const rootProps = {
    className: cn(roleStyles.role, styles.tile, className),
    'data-component': 'MetricTile',
    'data-role': role,
    'data-size': size,
    'data-interactive': isInteractive ? 'true' : undefined,
    'data-disabled': disabled ? 'true' : undefined,
    'data-testid': dataTestId,
  };

  const content = (
    <span className={styles.layout}>
      <span className={styles.main}>
        <span className={styles.icon} aria-hidden="true">
          {icon}
        </span>
        <span className={styles.text}>
          <span className={styles.title}>{title}</span>
          <span className={styles.value}>
            {isLoading ? (
              <SkeletonText size={size === 'md' ? 'titleSmall' : 'titleMedium'} maxWidth="5rem" />
            ) : (
              displayValue
            )}
          </span>
          {subtitle && !isLoading && (
            <span className={styles.subtitle}>{subtitle}</span>
          )}
          {isLoading && (
            <span className={styles.subtitle}>
              <SkeletonText size="bodySmall" maxWidth="7rem" />
            </span>
          )}
        </span>
      </span>
      {arrow && (
        <span className={styles.arrow} aria-hidden="true">
          <ChevronRightIcon size={24} />
        </span>
      )}
    </span>
  );

  if (isLink) {
    // Future-proof; not used yet.
    return (
      <Link href={href as string} aria-label={ariaLabel} {...rootProps}>
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
        {...rootProps}
      >
        {content}
      </button>
    );
  }

  return (
    <div role="group" aria-label={ariaLabel || title} {...rootProps}>
      {content}
    </div>
  );
};

export default MetricTile;
