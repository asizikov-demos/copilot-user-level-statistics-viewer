import { renderToStaticMarkup } from 'react-dom/server';
import type { ChartData } from 'chart.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ModelVendorUsageEntry } from '../../../types/metrics';
import ModelVendorDistributionChart from '../ModelVendorDistributionChart';

const { bar } = vi.hoisted(() => ({ bar: vi.fn<(props: { data: ChartData<'bar'> }) => void>() }));
vi.mock('react-chartjs-2', () => ({
  Bar: (props: { data: ChartData<'bar'> }) => {
    bar(props);
    return <div>Vendor distribution chart</div>;
  },
}));

const entries: ModelVendorUsageEntry[] = [
  { vendor: 'OpenAI', total: 8, dailyData: { '2026-01-15': 5, '2026-01-16': 3 }, users: 2 },
  { vendor: 'Unattributed', total: 2, dailyData: { '2026-01-16': 2 }, users: 1 },
];
const dates = ['2026-01-15', '2026-01-16'];

describe('ModelVendorDistributionChart', () => {
  beforeEach(() => bar.mockClear());

  it('renders the attribution summary excluding unattributed usage', () => {
    const markup = renderToStaticMarkup(
      <ModelVendorDistributionChart entries={entries} dates={dates} totalInteractions={10} />,
    );

    expect(markup).toContain('Model Vendor Distribution');
    expect(markup).toContain('Vendors Used');
    expect(markup).toContain('80%');
    expect(markup).toContain('Usage Attributed');
  });

  it('renders one series per vendor with zero for days without vendor usage', () => {
    renderToStaticMarkup(<ModelVendorDistributionChart entries={entries} dates={dates} totalInteractions={10} />);

    expect(bar.mock.lastCall![0].data.datasets.map(({ label, data }) => ({ label, data }))).toEqual([
      { label: 'OpenAI', data: [5, 3] },
      { label: 'Unattributed', data: [0, 2] },
    ]);
  });

  it('renders the empty state without vendor data', () => {
    const markup = renderToStaticMarkup(
      <ModelVendorDistributionChart entries={[]} dates={dates} totalInteractions={0} />,
    );

    expect(markup).toContain('No model vendor usage data available');
    expect(bar).not.toHaveBeenCalled();
  });
});
