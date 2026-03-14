"use client";

import React, { useMemo, useState } from 'react';
import type { ToggleCallback, VoidCallback } from '../../types/events';
import { cn } from '../../utils/cn';

type LabelResolver = string | ((totalItems: number) => string);

export interface ExpandableTableSectionRenderProps<T> {
  visibleItems: readonly T[];
  isExpanded: boolean;
  toggle: VoidCallback;
  totalItems: number;
}

export interface ExpandableTableSectionProps<T> {
  items: readonly T[];
  initialCount?: number;
  defaultExpanded?: boolean;
  children: (props: ExpandableTableSectionRenderProps<T>) => React.ReactNode;
  buttonCollapsedLabel?: LabelResolver;
  buttonExpandedLabel?: LabelResolver;
  buttonClassName?: string;
  buttonContainerClassName?: string;
  buttonAlignment?: 'left' | 'center' | 'right';
  ariaLabel?: string;
  buttonTestId?: string;
  onToggle?: ToggleCallback;
}

const DEFAULT_BUTTON_CLASS =
  'px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 border border-blue-300 hover:border-blue-400 rounded-md transition-colors';

const ALIGNMENT_TO_CLASS: Record<NonNullable<ExpandableTableSectionProps<unknown>['buttonAlignment']>, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right'
};

function resolveLabel(label: LabelResolver | undefined, total: number, fallback: string): string {
  if (!label) return fallback;
  return typeof label === 'function' ? label(total) : label;
}

function ExpandableTableSection<T>({
  items,
  initialCount = 5,
  defaultExpanded = false,
  children,
  buttonCollapsedLabel,
  buttonExpandedLabel,
  buttonClassName,
  buttonContainerClassName,
  buttonAlignment = 'center',
  ariaLabel,
  buttonTestId,
  onToggle
}: ExpandableTableSectionProps<T>) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const totalItems = items.length;
  const shouldRenderToggle = totalItems > initialCount;

  const visibleItems = useMemo(() => {
    if (isExpanded || !shouldRenderToggle) {
      return items;
    }
    return items.slice(0, initialCount);
  }, [items, initialCount, isExpanded, shouldRenderToggle]);

  const handleToggle = () => {
    setIsExpanded((prev) => {
      const next = !prev;
      onToggle?.(next);
      return next;
    });
  };

  const collapsedLabel = resolveLabel(
    buttonCollapsedLabel,
    totalItems,
    `Show All ${totalItems.toLocaleString()} Items`
  );

  const expandedLabel = resolveLabel(buttonExpandedLabel, totalItems, 'Show Less');

  const toggleLabel = isExpanded ? expandedLabel : collapsedLabel;

  const containerClassName = cn(
    buttonContainerClassName ?? 'mt-4',
    ALIGNMENT_TO_CLASS[buttonAlignment]
  );

  return (
    <>
      {children({
        visibleItems,
        isExpanded,
        toggle: handleToggle,
        totalItems
      })}
      {shouldRenderToggle && (
        <div className={containerClassName}>
          <button
            type="button"
            onClick={handleToggle}
            className={buttonClassName ?? DEFAULT_BUTTON_CLASS}
            aria-expanded={isExpanded}
            aria-label={ariaLabel ?? toggleLabel}
            data-testid={buttonTestId}
          >
            {toggleLabel}
          </button>
        </div>
      )}
    </>
  );
}

export default ExpandableTableSection;
