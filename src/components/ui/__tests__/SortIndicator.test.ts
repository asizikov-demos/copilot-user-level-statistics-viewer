import { describe, expect, it } from 'vitest';
import { getSortIndicatorAriaSort } from '../SortIndicator';

describe('getSortIndicatorAriaSort', () => {
  it('returns "none" for inactive columns', () => {
    expect(getSortIndicatorAriaSort(false, 'asc')).toBe('none');
    expect(getSortIndicatorAriaSort(false, 'desc')).toBe('none');
  });

  it('returns "ascending" for active ascending column', () => {
    expect(getSortIndicatorAriaSort(true, 'asc')).toBe('ascending');
  });

  it('returns "descending" for active descending column', () => {
    expect(getSortIndicatorAriaSort(true, 'desc')).toBe('descending');
  });
});
