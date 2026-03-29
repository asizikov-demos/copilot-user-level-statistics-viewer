'use client';

import React from 'react';

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
  className = '',
  chartHeight = 'h-80',
}: ChartContainerProps) {
  if (isEmpty) {
    return (
      <div className={`bg-white rounded-md border border-[#d1d9e0] p-6 ${className}`}>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <div className="text-center py-8 text-gray-500">{emptyState}</div>
      </div>
    );
  }

  return (
    <div
      className={`bg-white rounded-md border border-[#d1d9e0] p-6 max-w-full overflow-hidden print:border-gray-300 print:break-inside-avoid print:p-3 ${className}`}
    >
      <div className="flex justify-between items-start mb-6 print:mb-3 print:flex-row print:items-start print:gap-4">
        <div className="print:flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-2 print:text-sm print:mb-1">{title}</h3>
          {description && <p className="text-sm text-gray-600 print:text-xs">{description}</p>}
        </div>
        <div className="flex items-start gap-4 print:flex-shrink-0">
          {stats && stats.length > 0 && (
            <div className="text-right space-y-1 print:space-y-0">
              {stats.map((stat, index) => (
                <div key={index} className="text-sm text-gray-600 print:text-[10px] print:leading-tight">
                  <span className="font-medium">{stat.label}:</span>{' '}
                  <span className={stat.color}>{stat.value}</span>
                </div>
              ))}
            </div>
          )}
          {headerActions}
        </div>
      </div>

      {summaryStats && summaryStats.length > 0 && (
        <div className="flex flex-wrap justify-center gap-4 md:gap-8 mb-6 print:gap-3 print:mb-3">
          {summaryStats.map((stat, index) => (
            <div key={index} className="text-center min-w-[100px] print:min-w-[70px]">
              <div className={`text-2xl font-bold print:text-base ${stat.colorClass || 'text-gray-900'}`}>
                {stat.value}
              </div>
              <div className="text-sm text-gray-600 print:text-[10px]">{stat.label}</div>
              {stat.sublabel && <div className="text-xs text-gray-500 print:text-[9px]">{stat.sublabel}</div>}
            </div>
          ))}
        </div>
      )}

      <div className={`${chartHeight} w-full overflow-hidden print:h-56 print:overflow-visible`}>{children}</div>

      {footer && <div className="mt-4 print:mt-2 print:text-[10px]">{footer}</div>}
    </div>
  );
}
