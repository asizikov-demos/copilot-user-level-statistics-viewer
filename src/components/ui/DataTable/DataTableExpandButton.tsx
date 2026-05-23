'use client';

import React from 'react';
import { useDataTableContext } from './DataTableContext';
import {
  type ExpandableLabelResolver,
  type ExpandButtonAlignment,
  EXPAND_BUTTON_ALIGNMENT_CLASS,
  resolveExpandableToggleLabel,
} from '../../../hooks/useExpandableList';

export interface DataTableExpandButtonProps {
  collapsedLabel?: ExpandableLabelResolver;
  expandedLabel?: ExpandableLabelResolver;
  className?: string;
  containerClassName?: string;
  alignment?: ExpandButtonAlignment;
}

const DEFAULT_BUTTON_CLASS =
  'px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 border border-blue-300 hover:border-blue-400 rounded-md transition-colors';

export function DataTableExpandButton({
  collapsedLabel,
  expandedLabel,
  className,
  containerClassName,
  alignment = 'center',
}: DataTableExpandButtonProps) {
  const { isExpanded, canExpand, toggleExpanded, totalCount } = useDataTableContext();

  if (!canExpand) {
    return null;
  }

  const buttonLabel = resolveExpandableToggleLabel(
    isExpanded,
    totalCount,
    collapsedLabel,
    expandedLabel
  );

  const containerClass = `${containerClassName ?? 'mt-4'} ${EXPAND_BUTTON_ALIGNMENT_CLASS[alignment]}`;

  return (
    <div className={containerClass}>
      <button
        type="button"
        onClick={toggleExpanded}
        className={className ?? DEFAULT_BUTTON_CLASS}
        aria-expanded={isExpanded}
        aria-label={buttonLabel}
      >
        {buttonLabel}
      </button>
    </div>
  );
}
