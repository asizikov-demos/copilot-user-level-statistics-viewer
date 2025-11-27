"use client";

import React from "react";
import type { ElementType, ReactNode } from "react";

const BREAKPOINT_CLASS_PREFIX: Record<string, string> = {
  base: "",
  sm: "sm:",
  md: "md:",
  lg: "lg:",
  xl: "xl:",
  "2xl": "2xl:",
};

const ALLOWED_COLUMNS = new Set([1, 2, 3, 4, 5, 6]);

type ColumnCount = 1 | 2 | 3 | 4 | 5 | 6;

export type StatsGridBreakpoint = keyof typeof BREAKPOINT_CLASS_PREFIX;

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

function buildColumnClasses(columns: StatsGridColumns | undefined): string {
  const config = columns ?? DEFAULT_COLUMNS;
  const entries = Object.entries(config).filter(([, value]) => value !== undefined);

  if (entries.length === 0) {
    return "grid";
  }

  const classes = ["grid"];

  for (const [breakpoint, value] of entries) {
    if (!ALLOWED_COLUMNS.has(value as number)) continue;
    const prefix = BREAKPOINT_CLASS_PREFIX[breakpoint] ?? "";
    classes.push(`${prefix}grid-cols-${value}`);
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

  let content: ReactNode = null;

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
