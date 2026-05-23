"use client";

import React from 'react';
import type { ToggleCallback, VoidCallback } from '../../types/events';
import { cn } from '../../utils/cn';
import {
  useExpandableList,
  type ExpandableLabelResolver,
  type ExpandButtonAlignment,
  EXPAND_BUTTON_ALIGNMENT_CLASS,
  resolveExpandableToggleLabel,
} from '../../hooks/useExpandableList';

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
  buttonCollapsedLabel?: ExpandableLabelResolver;
  buttonExpandedLabel?: ExpandableLabelResolver;
  buttonClassName?: string;
  buttonContainerClassName?: string;
  buttonAlignment?: ExpandButtonAlignment;
  ariaLabel?: string;
  buttonTestId?: string;
  onToggle?: ToggleCallback;
}

const DEFAULT_BUTTON_CLASS =
  'px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 border border-blue-300 hover:border-blue-400 rounded-md transition-colors';

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
  const {
    visibleItems,
    isExpanded,
    canExpand: shouldRenderToggle,
    totalCount: totalItems,
    toggleExpanded: handleToggle,
  } = useExpandableList(items, initialCount, {
    defaultExpanded,
    onToggle,
  });

  const toggleLabel = resolveExpandableToggleLabel(
    isExpanded,
    totalItems,
    buttonCollapsedLabel,
    buttonExpandedLabel
  );

  const containerClassName = cn(
    buttonContainerClassName ?? 'mt-4',
    EXPAND_BUTTON_ALIGNMENT_CLASS[buttonAlignment]
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
