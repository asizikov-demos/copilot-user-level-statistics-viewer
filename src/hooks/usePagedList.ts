'use client';

import { useState } from 'react';

export function usePagedList<T>(items: readonly T[], pageSize: number) {
  const [pagination, setPagination] = useState({ items, pageSize, page: 1 });
  if (!Number.isSafeInteger(pageSize) || pageSize < 1) {
    throw new Error('Table page size must be a positive safe integer.');
  }
  const dataChanged = pagination.items !== items || pagination.pageSize !== pageSize;
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = dataChanged ? 1 : Math.max(1, Math.min(pagination.page, pageCount));
  if (dataChanged || currentPage !== pagination.page) {
    setPagination({ items, pageSize, page: currentPage });
  }

  return {
    currentPage,
    pageCount,
    pagedItems: items.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    setPage: (page: number) => setPagination({ items, pageSize, page }),
  };
}
