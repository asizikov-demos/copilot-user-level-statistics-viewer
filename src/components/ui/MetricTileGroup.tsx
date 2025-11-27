"use client";

import React from "react";
import MetricTile, { type MetricTileProps } from "./MetricTile";
import StatsGrid, { type StatsGridColumns } from "./StatsGrid";

function mergeClassNames(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export interface MetricTileGroupProps {
  title?: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  items: readonly MetricTileProps[];
  columns?: StatsGridColumns;
  gapClassName?: string;
  className?: string;
  headerClassName?: string;
  /**
   * Optional key resolver for tile items when order isn't stable.
   */
  getKey?: (item: MetricTileProps, index: number) => React.Key;
  headingTag?: 'h2' | 'h3' | 'h4';
}

const DEFAULT_COLUMNS: StatsGridColumns = {
  base: 1,
  md: 3,
};

export default function MetricTileGroup({
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
}: MetricTileGroupProps) {
  if (!items || items.length === 0) {
    return null;
  }

  const Heading = headingTag;

  return (
    <section className={mergeClassNames("space-y-4", className)}>
      {(title || description || actions) && (
        <div className={mergeClassNames("flex flex-wrap items-start justify-between gap-3", headerClassName)}>
          <div className="space-y-1">
            {title && <Heading className="text-lg font-medium text-gray-900">{title}</Heading>}
            {description && (
              typeof description === "string" ? (
                <p className="text-sm text-gray-600 max-w-2xl">{description}</p>
              ) : (
                description
              )
            )}
          </div>
          {actions && <div className="flex-shrink-0">{actions}</div>}
        </div>
      )}

      <StatsGrid columns={columns} gapClassName={gapClassName}>
        {items.map((item, index) => (
          <MetricTile key={getKey ? getKey(item, index) : index} {...item} />
        ))}
      </StatsGrid>
    </section>
  );
}
