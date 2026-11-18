// @vitest-environment jsdom

import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { usePagedList } from '../usePagedList';

afterEach(cleanup);

describe('usePagedList', () => {
  it('paginates readonly items with a partial last page and preserves the page on rerender', () => {
    const items = Object.freeze([1, 2, 3, 4, 5]);
    const { result, rerender } = renderHook(() => usePagedList(items, 2));

    expect(result.current.currentPage).toBe(1);
    expect(result.current.pageCount).toBe(3);
    expect(result.current.pagedItems).toEqual([1, 2]);
    act(() => result.current.setPage(3));
    rerender();
    expect(result.current.currentPage).toBe(3);
    expect(result.current.pagedItems).toEqual([5]);
    expect(items).toEqual([1, 2, 3, 4, 5]);
  });

  it('resets for a new array reference even when its contents and length are unchanged', () => {
    const items = [1, 2, 3];
    const { result, rerender } = renderHook(
      ({ items }) => usePagedList(items, 2),
      { initialProps: { items } },
    );

    act(() => result.current.setPage(2));
    rerender({ items: [...items] });
    expect(result.current.currentPage).toBe(1);
    expect(result.current.pagedItems).toEqual([1, 2]);

    act(() => result.current.setPage(2));
    rerender({ items: [3, 2, 1] });
    expect(result.current.currentPage).toBe(1);
    expect(result.current.pagedItems).toEqual([3, 2]);
  });

  it('resets when the page size changes in either direction', () => {
    const items = [1, 2, 3, 4, 5];
    const { result, rerender } = renderHook(
      ({ pageSize }) => usePagedList(items, pageSize),
      { initialProps: { pageSize: 2 } },
    );

    act(() => result.current.setPage(2));
    rerender({ pageSize: 1 });
    expect(result.current.currentPage).toBe(1);
    expect(result.current.pageCount).toBe(5);
    expect(result.current.pagedItems).toEqual([1]);

    act(() => result.current.setPage(2));
    rerender({ pageSize: 3 });
    expect(result.current.currentPage).toBe(1);
    expect(result.current.pageCount).toBe(2);
    expect(result.current.pagedItems).toEqual([1, 2, 3]);
  });

  it('clamps down when the same array shrinks without restoring the old page when it grows', () => {
    const items = [1, 2, 3, 4, 5];
    const { result, rerender } = renderHook(() => usePagedList(items, 2));

    act(() => result.current.setPage(3));
    items.splice(3);
    rerender();
    expect(result.current.currentPage).toBe(2);
    expect(result.current.pageCount).toBe(2);
    expect(result.current.pagedItems).toEqual([3]);

    items.push(4, 5);
    rerender();
    expect(result.current.currentPage).toBe(2);
    expect(result.current.pagedItems).toEqual([3, 4]);

    items.splice(0);
    rerender();
    expect(result.current.currentPage).toBe(1);
    expect(result.current.pageCount).toBe(1);
    expect(result.current.pagedItems).toEqual([]);
  });

  it('keeps requested pages within the available range', () => {
    const items = [1, 2, 3];
    const { result } = renderHook(() => usePagedList(items, 2));

    act(() => result.current.setPage(99));
    expect(result.current.currentPage).toBe(2);
    expect(result.current.pagedItems).toEqual([3]);
    act(() => result.current.setPage(0));
    expect(result.current.currentPage).toBe(1);
    expect(result.current.pagedItems).toEqual([1, 2]);
  });

  it('returns one empty page for an initially empty list', () => {
    const items: number[] = [];
    const { result } = renderHook(() => usePagedList(items, 10));

    expect(result.current.currentPage).toBe(1);
    expect(result.current.pageCount).toBe(1);
    expect(result.current.pagedItems).toEqual([]);
  });

  it.each([0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])('rejects invalid page size %s', pageSize => {
    expect(() => renderHook(() => usePagedList([], pageSize)))
      .toThrow('Table page size must be a positive safe integer.');
  });
});
