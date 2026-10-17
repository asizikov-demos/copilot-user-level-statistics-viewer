"use client";

import { useId } from 'react';
import { Link } from '@primer/react';
import {
  useExpandableList,
  type ExpandableLabelResolver,
  resolveExpandableToggleLabel,
} from '../../hooks/useExpandableList';
import styles from './ExpandableInlineList.module.css';

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
      <span id={resolvedContentId} className={textClassName ?? styles.text}>
        {displayText}
      </span>
      {canExpand && (
        <Link
          as="button"
          type="button"
          onClick={toggleExpanded}
          className={buttonClassName ?? styles.toggle}
          aria-expanded={isExpanded}
          aria-controls={resolvedContentId}
        >
          {buttonLabel}
        </Link>
      )}
    </div>
  );
}
