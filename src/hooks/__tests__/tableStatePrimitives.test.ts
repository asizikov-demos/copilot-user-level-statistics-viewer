import { describe, expect, it } from 'vitest';
import { getNextSortState } from '../useSortableTable';
import {
  getExpandableVisibleItems,
  resolveExpandableToggleLabel,
} from '../useExpandableList';

describe('table state primitives', () => {
  it('toggles sort direction when sorting the same field', () => {
    expect(getNextSortState('count', 'desc', 'count')).toEqual({
      sortField: 'count',
      sortDirection: 'asc',
    });
    expect(getNextSortState('count', 'asc', 'count')).toEqual({
      sortField: 'count',
      sortDirection: 'desc',
    });
  });

  it('resets sort direction to descending for a newly selected field', () => {
    expect(getNextSortState('count', 'asc', 'name')).toEqual({
      sortField: 'name',
      sortDirection: 'desc',
    });
  });

  it('returns sliced items only when collapsed and expandable', () => {
    const items = [1, 2, 3, 4];

    expect(getExpandableVisibleItems(items, false, 2)).toEqual([1, 2]);
    expect(getExpandableVisibleItems(items, true, 2)).toBe(items);
    expect(getExpandableVisibleItems(items, false, 10)).toBe(items);
  });

  it('resolves default and custom expand button labels', () => {
    expect(resolveExpandableToggleLabel(false, 1200)).toBe('Show All 1,200 Items');
    expect(resolveExpandableToggleLabel(true, 1200)).toBe('Show Less');
    expect(resolveExpandableToggleLabel(false, 10, (total) => `More (${total})`)).toBe('More (10)');
    expect(resolveExpandableToggleLabel(true, 10, undefined, 'Collapse')).toBe('Collapse');
  });
});
