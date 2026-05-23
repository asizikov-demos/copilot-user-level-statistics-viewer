"use client";

import { useState, useMemo } from 'react';
import type { ToggleCallback } from '../types/events';

export type ExpandableLabelResolver = string | ((totalItems: number) => string);
export type ExpandButtonAlignment = 'left' | 'center' | 'right';

export const EXPAND_BUTTON_ALIGNMENT_CLASS: Record<ExpandButtonAlignment, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

export function resolveExpandableLabel(
  label: ExpandableLabelResolver | undefined,
  total: number,
  fallback: string
): string {
  if (!label) return fallback;
  return typeof label === 'function' ? label(total) : label;
}

export function resolveExpandableToggleLabel(
  isExpanded: boolean,
  totalItems: number,
  collapsedLabel?: ExpandableLabelResolver,
  expandedLabel?: ExpandableLabelResolver
): string {
  const resolvedCollapsedLabel = resolveExpandableLabel(
    collapsedLabel,
    totalItems,
    `Show All ${totalItems.toLocaleString()} Items`
  );
  const resolvedExpandedLabel = resolveExpandableLabel(expandedLabel, totalItems, 'Show Less');
  return isExpanded ? resolvedExpandedLabel : resolvedCollapsedLabel;
}

export function getExpandableVisibleItems<T>(
  items: readonly T[],
  isExpanded: boolean,
  initialCount: number
): readonly T[] {
  const canExpand = items.length > initialCount;
  if (isExpanded || !canExpand) {
    return items;
  }
  return items.slice(0, initialCount);
}

export interface ExpandableListResult<T> {
  visibleItems: readonly T[];
  isExpanded: boolean;
  canExpand: boolean;
  totalCount: number;
  toggleExpanded: () => void;
  setExpanded: (expanded: boolean) => void;
}

interface ExpandableListOptions {
  defaultExpanded?: boolean;
  onToggle?: ToggleCallback;
}

export function useExpandableList<T>(
  items: readonly T[],
  initialCount: number,
  options: ExpandableListOptions = {}
): ExpandableListResult<T> {
  const { defaultExpanded = false, onToggle } = options;
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const canExpand = items.length > initialCount;

  const visibleItems = useMemo(() => {
    return getExpandableVisibleItems(items, isExpanded, initialCount);
  }, [items, isExpanded, initialCount]);

  const toggleExpanded = () => {
    setIsExpanded((prev) => {
      const next = !prev;
      onToggle?.(next);
      return next;
    });
  };

  const setExpanded = (expanded: boolean) => {
    setIsExpanded(expanded);
  };

  return {
    visibleItems,
    isExpanded,
    canExpand,
    totalCount: items.length,
    toggleExpanded,
    setExpanded,
  };
}
