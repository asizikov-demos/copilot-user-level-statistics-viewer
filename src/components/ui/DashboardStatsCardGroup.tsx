"use client";

import React from "react";
import DashboardStatsCard, { type DashboardStatsCardProps } from "./DashboardStatsCard";
import StatsGrid, { type StatsGridColumns } from "./StatsGrid";
import { cn } from '../../utils/cn';

export interface DashboardStatsCardGroupProps {
  title?: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  items: readonly DashboardStatsCardProps[];
  columns?: StatsGridColumns;
  gapClassName?: string;
  className?: string;
  headerClassName?: string;
  getKey?: (item: DashboardStatsCardProps, index: number) => React.Key;
  headingTag?: "h2" | "h3" | "h4";
}

const DEFAULT_COLUMNS: StatsGridColumns = {
  base: 1,
  md: 2,
  lg: 4,
};

export default function DashboardStatsCardGroup({
  title,
  description,
  actions,
  items,
  columns = DEFAULT_COLUMNS,
  gapClassName = "gap-6",
  className,
  headerClassName,
  getKey,
  headingTag = "h3",
}: DashboardStatsCardGroupProps) {
  if (!items || items.length === 0) {
    return null;
  }

  const Heading = headingTag;

  return (
    <section className={cn("space-y-4", className)}>
      {(title || description || actions) && (
        <div className={cn("flex flex-wrap items-start justify-between gap-3", headerClassName)}>
          <div className="space-y-1">
            {title && <Heading className="text-lg font-medium text-gray-900">{title}</Heading>}
            {description && (typeof description === "string" ? (
              <p className="text-sm text-gray-600 max-w-2xl">{description}</p>
            ) : (
              description
            ))}
          </div>
          {actions && <div className="flex-shrink-0">{actions}</div>}
        </div>
      )}
      <StatsGrid columns={columns} gapClassName={gapClassName}>
        {items.map((item, index) => (
          <DashboardStatsCard key={getKey ? getKey(item, index) : index} {...item} />
        ))}
      </StatsGrid>
    </section>
  );
}
