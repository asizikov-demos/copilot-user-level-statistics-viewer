import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import ModelVendorDistributionChart from '../ModelVendorDistributionChart';

const { bar } = vi.hoisted(() => ({ bar: vi.fn() }));
vi.mock('react-chartjs-2', () => ({
  Bar: (props: Record<string, unknown>) => {
    bar(props);
    return <div>Vendor distribution chart</div>;
  },
}));

describe('ModelVendorDistributionChart', () => {
  it('renders stacked daily vendor datasets and attribution summary', () => {
    const markup = renderToStaticMarkup(
      <ModelVendorDistributionChart
        entries={[
          {
            vendor: 'OpenAI',
            total: 8,
            dailyData: { '2026-01-15': 5, '2026-01-16': 3 },
            users: 2,
          },
          {
            vendor: 'Unattributed',
            total: 2,
            dailyData: { '2026-01-16': 2 },
            users: 1,
          },
        ]}
        dates={['2026-01-15', '2026-01-16']}
        totalInteractions={10}
      />
    );

    expect(bar).toHaveBeenLastCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        datasets: [
          expect.objectContaining({ label: 'OpenAI', data: [5, 3], stack: 'model-vendors' }),
          expect.objectContaining({ label: 'Unattributed', data: [0, 2], stack: 'model-vendors' }),
        ],
      }),
    }));
    expect(markup).toContain('Model Vendor Distribution');
    expect(markup).toContain('Vendors Used');
    expect(markup).toContain('80%');
    expect(markup).toContain('Usage Attributed');
  });
});
