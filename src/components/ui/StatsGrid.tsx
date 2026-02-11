"use client";

import React from "react";
import type { ElementType, ReactNode } from "react";

type ColumnCount = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export type StatsGridBreakpoint = "base" | "sm" | "md" | "lg" | "xl" | "2xl";

export type StatsGridColumns = Partial<Record<StatsGridBreakpoint, ColumnCount>>;

export interface StatsGridProps<T = unknown> {
  /** Optional data-driven items. */
  items?: readonly T[];
  /** Render function for data-driven items. */
  renderItem?: (item: T, index: number) => React.ReactNode;
  /**
   * Optional key extractor when using `items`.
   * Falls back to the item index when omitted.
   */
  getKey?: (item: T, index: number) => React.Key;
  /**
   * Child nodes can be provided directly instead of `items`.
   */
  children?: ReactNode;
  /**
   * Responsive column configuration. Defaults to 1/2/4 across breakpoints.
   */
  columns?: StatsGridColumns;
  /** Additional class names applied to the grid container. */
  className?: string;
  /** Tailwind gap utility (defaults to `gap-6`). */
  gapClassName?: string;
  /**
   * Optional wrapper element type. Defaults to `div`.
   */
  as?: ElementType;
  /**
   * Set to `false` to skip wrapping children in a grid when providing raw nodes.
   */
  wrapChildren?: boolean;
}

const DEFAULT_COLUMNS: StatsGridColumns = {
  base: 1,
  md: 2,
  lg: 4,
};

const GRID_COL_CLASSES: Record<StatsGridBreakpoint, Record<ColumnCount, string>> = {
  base: {
    1: "grid-cols-1",
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-4",
    5: "grid-cols-5",
    6: "grid-cols-6",
    7: "grid-cols-7",
    8: "grid-cols-8",
    9: "grid-cols-9",
    10: "grid-cols-10",
    11: "grid-cols-11",
    12: "grid-cols-12",
  },
  sm: {
    1: "sm:grid-cols-1",
    2: "sm:grid-cols-2",
    3: "sm:grid-cols-3",
    4: "sm:grid-cols-4",
    5: "sm:grid-cols-5",
    6: "sm:grid-cols-6",
    7: "sm:grid-cols-7",
    8: "sm:grid-cols-8",
    9: "sm:grid-cols-9",
    10: "sm:grid-cols-10",
    11: "sm:grid-cols-11",
    12: "sm:grid-cols-12",
  },
  md: {
    1: "md:grid-cols-1",
    2: "md:grid-cols-2",
    3: "md:grid-cols-3",
    4: "md:grid-cols-4",
    5: "md:grid-cols-5",
    6: "md:grid-cols-6",
    7: "md:grid-cols-7",
    8: "md:grid-cols-8",
    9: "md:grid-cols-9",
    10: "md:grid-cols-10",
    11: "md:grid-cols-11",
    12: "md:grid-cols-12",
  },
  lg: {
    1: "lg:grid-cols-1",
    2: "lg:grid-cols-2",
    3: "lg:grid-cols-3",
    4: "lg:grid-cols-4",
    5: "lg:grid-cols-5",
    6: "lg:grid-cols-6",
    7: "lg:grid-cols-7",
    8: "lg:grid-cols-8",
    9: "lg:grid-cols-9",
    10: "lg:grid-cols-10",
    11: "lg:grid-cols-11",
    12: "lg:grid-cols-12",
  },
  xl: {
    1: "xl:grid-cols-1",
    2: "xl:grid-cols-2",
    3: "xl:grid-cols-3",
    4: "xl:grid-cols-4",
    5: "xl:grid-cols-5",
    6: "xl:grid-cols-6",
    7: "xl:grid-cols-7",
    8: "xl:grid-cols-8",
    9: "xl:grid-cols-9",
    10: "xl:grid-cols-10",
    11: "xl:grid-cols-11",
    12: "xl:grid-cols-12",
  },
  "2xl": {
    1: "2xl:grid-cols-1",
    2: "2xl:grid-cols-2",
    3: "2xl:grid-cols-3",
    4: "2xl:grid-cols-4",
    5: "2xl:grid-cols-5",
    6: "2xl:grid-cols-6",
    7: "2xl:grid-cols-7",
    8: "2xl:grid-cols-8",
    9: "2xl:grid-cols-9",
    10: "2xl:grid-cols-10",
    11: "2xl:grid-cols-11",
    12: "2xl:grid-cols-12",
  },
};

function buildColumnClasses(columns: StatsGridColumns | undefined): string {
  const config = columns ?? DEFAULT_COLUMNS;
  const entries = Object.entries(config).filter(([, value]) => value !== undefined);

  if (entries.length === 0) {
    return "grid";
  }

  const classes = ["grid"];

  for (const [breakpoint, value] of entries) {
    const typedBreakpoint = breakpoint as StatsGridBreakpoint;
    const columnCount = value as ColumnCount;
    const className = GRID_COL_CLASSES[typedBreakpoint]?.[columnCount];
    if (!className) continue;
    classes.push(className);
  }

  return classes.join(" ");
}

function mergeClassNames(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export default function StatsGrid<T>({
  items,
  renderItem,
  getKey,
  children,
  columns,
  className,
  gapClassName = "gap-6",
  as: Component = "div",
  wrapChildren = true,
}: StatsGridProps<T>) {
  const gridClassName = buildColumnClasses(columns);
  const mergedClassName = mergeClassNames(gridClassName, gapClassName, className);

  let content: ReactNode;

  if (items && renderItem) {
    content = items.map((item, index) => (
      <React.Fragment key={getKey ? getKey(item, index) : index}>
        {renderItem(item, index)}
      </React.Fragment>
    ));
  } else {
    content = children;
  }

  const ComponentToRender = Component;

  if (!wrapChildren) {
    return <ComponentToRender className={className}>{content}</ComponentToRender>;
  }

  return <ComponentToRender className={mergedClassName}>{content}</ComponentToRender>;
}
