import { ArrowSwitchIcon, TriangleDownIcon, TriangleUpIcon } from '@primer/octicons-react';
import type { SortDirection } from '../../types/sort';
import styles from './SortIndicator.module.css';

export function getSortIndicatorAriaSort(
  isActive: boolean,
  direction: SortDirection
): 'ascending' | 'descending' | 'none' {
  if (!isActive) return 'none';
  return direction === 'asc' ? 'ascending' : 'descending';
}

export function SortIndicator({ active, direction }: { active: boolean; direction: SortDirection }) {
  const Icon = !active ? ArrowSwitchIcon : direction === 'asc' ? TriangleUpIcon : TriangleDownIcon;

  return (
    <span
      className={styles.icon}
      data-component="SortIndicator"
      data-active={active ? 'true' : 'false'}
      data-direction={active ? direction : 'none'}
      aria-hidden="true"
    >
      <Icon size={16} />
    </span>
  );
}
