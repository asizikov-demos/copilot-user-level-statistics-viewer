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
    const total = 1200;

    expect(resolveExpandableToggleLabel(false, total)).toBe(`Show All ${total.toLocaleString()} Items`);
    expect(resolveExpandableToggleLabel(true, total)).toBe('Show Less');
    expect(resolveExpandableToggleLabel(false, 10, (total) => `More (${total})`)).toBe('More (10)');
    expect(resolveExpandableToggleLabel(true, 10, undefined, 'Collapse')).toBe('Collapse');
  });
});

describe('MetricsTable initialCount opt-in expansion', () => {
  it('shows all rows when initialCount is not provided (resolvedInitialCount defaults to data.length)', () => {
    const items = [1, 2, 3, 4, 5];
    // MetricsTable sets resolvedInitialCount = initialCount ?? data.length
    // When initialCount is omitted, resolvedInitialCount === items.length → no truncation
    const resolvedInitialCount = items.length;
    expect(getExpandableVisibleItems(items, false, resolvedInitialCount)).toBe(items);
  });

  it('limits visible rows when initialCount is less than data.length', () => {
    const items = ['a', 'b', 'c', 'd', 'e'];
    expect(getExpandableVisibleItems(items, false, 3)).toEqual(['a', 'b', 'c']);
  });

  it('shows all rows after expand is toggled', () => {
    const items = ['a', 'b', 'c', 'd', 'e'];
    expect(getExpandableVisibleItems(items, true, 3)).toBe(items);
  });

  it('resolves custom collapsed label with total count', () => {
    expect(resolveExpandableToggleLabel(false, 7, (n) => `Show All ${n} Client Versions`)).toBe(
      'Show All 7 Client Versions',
    );
  });

  it('resolves custom expanded label', () => {
    expect(resolveExpandableToggleLabel(true, 7, undefined, 'Show Less')).toBe('Show Less');
  });
});
