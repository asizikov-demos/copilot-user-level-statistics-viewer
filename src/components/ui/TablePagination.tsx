'use client';

import { Pagination } from '@primer/react';

export const TABLE_PAGE_SIZE = 10;

export default function TablePagination({
  itemCount,
  currentPage,
  itemLabel,
  onPageChange,
  pageSize = TABLE_PAGE_SIZE,
}: {
  itemCount: number;
  currentPage: number;
  itemLabel: string;
  onPageChange: (page: number) => void;
  pageSize?: number;
}) {
  if (itemCount === 0) return null;
  const pageCount = Math.ceil(itemCount / pageSize);
  const pageStart = (currentPage - 1) * pageSize;
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between" role="group" aria-label={`Pagination for ${itemLabel}`}>
      <p className="text-sm text-muted">
        Showing {(pageStart + 1).toLocaleString()}-{Math.min(pageStart + pageSize, itemCount).toLocaleString()} of {itemCount.toLocaleString()} {itemLabel}
      </p>
      {pageCount > 1 && (
        <Pagination
          pageCount={pageCount}
          currentPage={currentPage}
          onPageChange={(event, nextPage) => { event.preventDefault(); onPageChange(nextPage); }}
        />
      )}
    </div>
  );
}
