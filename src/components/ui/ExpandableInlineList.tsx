"use client";

import { useId } from 'react';
import {
  useExpandableList,
  type ExpandableLabelResolver,
  resolveExpandableToggleLabel,
} from '../../hooks/useExpandableList';

interface ExpandableInlineListProps {
  items: readonly string[];
  initialCount?: number;
  collapsedLabel?: ExpandableLabelResolver;
  expandedLabel?: ExpandableLabelResolver;
  containerClassName?: string;
  textClassName?: string;
  buttonClassName?: string;
  contentId?: string;
}

export function formatExpandableInlineText(
  visibleItems: readonly string[],
  canExpand: boolean,
  isExpanded: boolean
): string {
  if (canExpand && !isExpanded) {
    return `${visibleItems.join(', ')}...`;
  }
  return visibleItems.join(', ');
}

const DEFAULT_TEXT_CLASS = 'text-xs text-gray-600';
const DEFAULT_BUTTON_CLASS = 'ml-2 text-xs text-blue-600 hover:text-blue-800 underline';

export default function ExpandableInlineList({
  items,
  initialCount = 3,
  collapsedLabel = (total) => `Show All ${total}`,
  expandedLabel = 'Show Less',
  containerClassName,
  textClassName,
  buttonClassName,
  contentId,
}: ExpandableInlineListProps) {
  const autoContentId = useId();
  const resolvedContentId = contentId ?? autoContentId;
  const {
    visibleItems,
    isExpanded,
    canExpand,
    totalCount,
    toggleExpanded,
  } = useExpandableList(items, initialCount);

  const displayText = formatExpandableInlineText(visibleItems, canExpand, isExpanded);

  const buttonLabel = resolveExpandableToggleLabel(
    isExpanded,
    totalCount,
    collapsedLabel,
    expandedLabel
  );

  return (
    <div className={containerClassName}>
      <span id={resolvedContentId} className={textClassName ?? DEFAULT_TEXT_CLASS}>
        {displayText}
      </span>
      {canExpand && (
        <button
          type="button"
          onClick={toggleExpanded}
          className={buttonClassName ?? DEFAULT_BUTTON_CLASS}
          aria-expanded={isExpanded}
          aria-controls={resolvedContentId}
        >
          {buttonLabel}
        </button>
      )}
    </div>
  );
}
