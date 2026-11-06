'use client';

import type { ReactNode } from 'react';
import { GraphIcon } from '@primer/octicons-react';
import ChartContainer from '../ui/ChartContainer';
import EmptyState from '../ui/EmptyState';
import CompositionChart, { type CompositionChartProps } from './CompositionChart';
import { hasCompositionData } from './utils/compositionChart';

export interface CompositionChartCardProps extends Omit<CompositionChartProps, 'variant' | 'surface' | 'className'> {
  title: string;
  description?: string;
  headerActions?: ReactNode;
  emptyState?: string;
  className?: string;
  chartClassName?: string;
}

export default function CompositionChartCard({
  title,
  description,
  headerActions,
  emptyState = 'No data available',
  className,
  chartClassName,
  ...chartProps
}: CompositionChartCardProps) {
  return (
    <ChartContainer
      title={title}
      description={description}
      headerActions={headerActions && <div className="flex min-h-8 items-center">{headerActions}</div>}
      className={className}
      chartHeight="h-auto"
    >
      {hasCompositionData(chartProps.entries) ? (
        <CompositionChart {...chartProps} variant="doughnut" surface="default" className={chartClassName} />
      ) : (
        <div className="flex min-h-52 items-center justify-center">
          <div className="w-full max-w-md">
            <EmptyState icon={GraphIcon} heading={emptyState} headingAs="h4" />
          </div>
        </div>
      )}
    </ChartContainer>
  );
}
