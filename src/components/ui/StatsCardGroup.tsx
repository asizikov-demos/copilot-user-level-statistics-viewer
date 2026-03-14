"use client";

import React from "react";
import StatsGrid, { type StatsGridColumns } from "./StatsGrid";
import { cn } from '../../utils/cn';

export interface StatsCardGroupProps<T> {
  title?: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  items: readonly T[];
  columns?: StatsGridColumns;
  gapClassName?: string;
  className?: string;
  headerClassName?: string;
  getKey?: (item: T, index: number) => React.Key;
  headingTag?: "h2" | "h3" | "h4";
  renderItem: (item: T, index: number) => React.ReactNode;
}

export default function StatsCardGroup<T>({
  title,
  description,
  actions,
  items,
  columns,
  gapClassName = "gap-6",
  className,
  headerClassName,
  getKey,
  headingTag = "h3",
  renderItem,
}: StatsCardGroupProps<T>) {
  if (items.length === 0) {
    return null;
  }

  const Heading = headingTag;

  return (
    <section className={cn("space-y-4", className)}>
      {(title || description || actions) && (
        <div className={cn("flex flex-wrap items-start justify-between gap-3", headerClassName)}>
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
          <React.Fragment key={getKey ? getKey(item, index) : index}>
            {renderItem(item, index)}
          </React.Fragment>
        ))}
      </StatsGrid>
    </section>
  );
}
