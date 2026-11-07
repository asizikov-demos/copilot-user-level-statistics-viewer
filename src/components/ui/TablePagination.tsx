'use client';

import { Pagination } from '@primer/react';

export const TABLE_PAGE_SIZE = 10;

export default function TablePagination({
  itemCount,
  currentPage,
  itemLabel,
  onPageChange,
}: {
  itemCount: number;
  currentPage: number;
  itemLabel: string;
  onPageChange: (page: number) => void;
}) {
  if (itemCount === 0) return null;
  const pageCount = Math.ceil(itemCount / TABLE_PAGE_SIZE);
  const pageStart = (currentPage - 1) * TABLE_PAGE_SIZE;
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between" role="group" aria-label={`Pagination for ${itemLabel}`}>
      <p className="text-sm text-muted">
        Showing {(pageStart + 1).toLocaleString()}-{Math.min(pageStart + TABLE_PAGE_SIZE, itemCount).toLocaleString()} of {itemCount.toLocaleString()} {itemLabel}
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
