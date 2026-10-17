'use client';

import React from 'react';
import { Heading } from '@primer/react';
import { cn } from '../../utils/cn';
import styles from './ChartContainer.module.css';

export interface ChartStat {
  label: string;
  value: string | number;
  color?: string;
}

export interface SummaryStatItem {
  value: string | number;
  label: string;
  sublabel?: string;
  colorClass?: string;
}

export interface ChartContainerProps {
  title: string;
  description?: string;
  stats?: ChartStat[];
  summaryStats?: SummaryStatItem[];
  headerActions?: React.ReactNode;
  footer?: React.ReactNode;
  emptyState?: string;
  isEmpty?: boolean;
  children: React.ReactNode;
  className?: string;
  chartHeight?: string;
}

function formatStatValue(value: string | number): string | number {
  return typeof value === 'number' && !Number.isFinite(value) ? 'N/A' : value;
}

export default function ChartContainer({
  title,
  description,
  stats,
  summaryStats,
  headerActions,
  footer,
  emptyState = 'No data available',
  isEmpty = false,
  children,
  className,
  chartHeight = 'h-80',
}: ChartContainerProps) {
  if (isEmpty) {
    return (
      <div className={cn(styles.root, className)} data-component="ChartContainer" data-empty="true">
        <Heading as="h3" variant="small" className={cn(styles.title, styles.emptyTitle)}>
          {title}
        </Heading>
        <div className={styles.empty}>{emptyState}</div>
      </div>
    );
  }

  return (
    <div className={cn(styles.root, className)} data-component="ChartContainer">
      <div className={styles.header}>
        <div className={styles.headerText}>
          <Heading as="h3" variant="small" className={styles.title}>
            {title}
          </Heading>
          {description && <p className={styles.description}>{description}</p>}
        </div>
        <div className={styles.aside}>
          {stats && stats.length > 0 && (
            <div className={styles.stats}>
              {stats.map((stat, index) => (
                <div key={index} className={styles.stat}>
                  <span className={styles.statLabel}>{stat.label}:</span>{' '}
                  <span className={stat.color}>{formatStatValue(stat.value)}</span>
                </div>
              ))}
            </div>
          )}
          {headerActions}
        </div>
      </div>

      {summaryStats && summaryStats.length > 0 && (
        <div className={styles.summary}>
          {summaryStats.map((stat, index) => (
            <div key={index} className={styles.summaryItem}>
              <div className={cn(styles.summaryValue, stat.colorClass)}>{formatStatValue(stat.value)}</div>
              <div className={styles.summaryLabel}>{stat.label}</div>
              {stat.sublabel && <div className={styles.summarySublabel}>{stat.sublabel}</div>}
            </div>
          ))}
        </div>
      )}

      <div className={cn(styles.chart, chartHeight)}>{children}</div>

      {footer && <div className={styles.footer}>{footer}</div>}
    </div>
  );
}
