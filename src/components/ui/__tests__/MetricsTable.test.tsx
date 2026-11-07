// @vitest-environment jsdom

import { renderToStaticMarkup } from 'react-dom/server';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import MetricsTable, { type TableColumn } from '../MetricsTable';

interface Row {
  name: string;
  count: number;
}

const ROWS: Row[] = [
  { name: 'alpha', count: 3 },
  { name: 'beta', count: 2 },
  { name: 'gamma', count: 1 },
];

const COLUMNS: TableColumn<Row>[] = [
  { id: 'name', header: 'Name', accessor: 'name', sortable: true },
  { id: 'count', header: 'Count', accessor: 'count', sortable: true, headerClassName: 'px-6 py-3 text-right' },
];

afterEach(cleanup);

describe('MetricsTable', () => {
  it('exposes sort state through aria-sort and aligned sort buttons', () => {
    const markup = renderToStaticMarkup(
      <MetricsTable
        data={ROWS}
        columns={COLUMNS}
        sortState={{ field: 'count', direction: 'desc' }}
        onSortChange={() => undefined}
      />
    );

    expect(markup).toContain('data-component="MetricsTable"');
    expect(markup).toMatch(/<th scope="col" class="px-6 py-3 text-left" aria-sort="none"><button type="button" class="[^"]+" data-align="start">Name/);
    expect(markup).toMatch(/aria-sort="descending"><button type="button" class="[^"]+" data-align="end">Count/);
    expect(markup).toContain('data-direction="desc"');
  });

  it('paginates at the configured size with a partial last page and no show-all action', () => {
    render(<MetricsTable data={ROWS} columns={COLUMNS} pageSize={2} itemLabel="rows" />);
    expect(screen.getAllByRole('row')).toHaveLength(3);
    expect(screen.queryByText('gamma')).toBeNull();
    expect(screen.getByText('Showing 1-2 of 3 rows')).toBeTruthy();
    const pager = screen.getByRole('group', { name: 'Pagination for rows' });
    fireEvent.click(within(pager).getByRole('link', { name: 'Next Page' }));
    expect(screen.getAllByRole('row')).toHaveLength(2);
    expect(screen.getByText('gamma')).toBeTruthy();
    expect(screen.queryByText('alpha')).toBeNull();
    expect(screen.getByText('Showing 3-3 of 3 rows')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /show all/i })).toBeNull();
    fireEvent.click(within(pager).getByRole('link', { name: 'Previous Page' }));
    expect(screen.getByText('alpha')).toBeTruthy();
  });

  it('resets pagination on reordered/replaced data and page-size changes, not column changes', () => {
    const { rerender } = render(<MetricsTable data={ROWS} columns={COLUMNS} pageSize={2} />);
    fireEvent.click(screen.getByRole('link', { name: 'Next Page' }));
    rerender(<MetricsTable data={ROWS} columns={[...COLUMNS]} pageSize={2} />);
    expect(screen.getByText('gamma')).toBeTruthy();
    expect(screen.queryByText('alpha')).toBeNull();
    const reordered = [...ROWS].reverse();
    rerender(<MetricsTable data={reordered} columns={COLUMNS} pageSize={2} />);
    expect(screen.getByText('Showing 1-2 of 3 items')).toBeTruthy();
    expect(screen.getByText('beta')).toBeTruthy();
    fireEvent.click(screen.getByRole('link', { name: 'Next Page' }));
    rerender(<MetricsTable data={reordered} columns={COLUMNS} pageSize={1} />);
    expect(screen.getByText('Showing 1-1 of 3 items')).toBeTruthy();
    rerender(<MetricsTable data={[]} columns={COLUMNS} pageSize={1} emptyState={<p>No rows</p>} />);
    expect(screen.getByText('No rows')).toBeTruthy();
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.queryByRole('group')).toBeNull();
  });

  it('preserves data-relative indexes in cell and row callbacks on later pages', () => {
    const onRowClick = vi.fn();
    render(<MetricsTable
      data={ROWS}
      columns={[{ id: 'rank', header: 'Rank', renderCell: (_, index) => index + 1 }]}
      pageSize={2}
      onRowClick={onRowClick}
    />);
    fireEvent.click(screen.getByRole('link', { name: 'Next Page' }));
    fireEvent.click(screen.getByRole('cell', { name: '3' }));
    expect(onRowClick).toHaveBeenCalledWith(ROWS[2], 2);
  });

  it('preserves unpaginated tables and omits navigation when all rows fit on one page', () => {
    const { rerender } = render(<MetricsTable data={ROWS} columns={COLUMNS} />);
    expect(screen.getAllByRole('row')).toHaveLength(4);
    expect(screen.queryByRole('group')).toBeNull();
    rerender(<MetricsTable data={ROWS} columns={COLUMNS} pageSize={5} />);
    expect(screen.getAllByRole('row')).toHaveLength(4);
    expect(screen.getByText('Showing 1-3 of 3 items')).toBeTruthy();
    expect(screen.queryByRole('navigation')).toBeNull();
  });
});
