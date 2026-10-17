import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
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

  it('renders progressive disclosure with a Primer button and chevron', () => {
    const markup = renderToStaticMarkup(
      <MetricsTable
        data={ROWS}
        columns={COLUMNS}
        initialCount={1}
        buttonCollapsedLabel={(total) => `Show All ${total} Rows`}
        buttonAlignment="right"
        buttonTestId="rows-toggle"
      />
    );

    expect(markup.match(/<tr/g)).toHaveLength(2);
    expect(markup).toContain('data-align="right"');
    expect(markup).toContain('aria-expanded="false"');
    expect(markup).toContain('aria-label="Show All 3 Rows"');
    expect(markup).toContain('data-testid="rows-toggle"');
    expect(markup).toContain('octicon-chevron-down');
  });

  it('shows the expanded label and all rows when expanded by default', () => {
    const markup = renderToStaticMarkup(
      <MetricsTable data={ROWS} columns={COLUMNS} initialCount={1} defaultExpanded />
    );

    expect(markup.match(/<tr/g)).toHaveLength(4);
    expect(markup).toContain('aria-expanded="true"');
    expect(markup).toContain('octicon-chevron-up');
  });
});
