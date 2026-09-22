import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import ModelVendorBreakdown from '../ModelVendorBreakdown';

describe('ModelVendorBreakdown', () => {
  it('renders vendor summaries with exact distinct-user counts', () => {
    const markup = renderToStaticMarkup(
      <ModelVendorBreakdown
        vendorTables={[
          {
            vendor: 'GitHub',
            users: 2,
            interactions: 12,
            sharePercentage: 60,
            rows: [
              {
                model: 'raptor-mini',
                displayName: 'Raptor Mini',
                interactions: 7,
                sharePercentage: 35,
                users: 2,
              },
              {
                model: 'goldeneye',
                displayName: 'Goldeneye',
                interactions: 5,
                sharePercentage: 25,
                users: 1,
              },
            ],
          },
        ]}
      />
    );

    expect(markup).toContain('Models by Vendor');
    expect(markup).toContain('GitHub');
    expect(markup).toContain('2 models');
    expect(markup).toContain('12 interactions');
    expect(markup).toContain('60.0%');
    expect(markup).toContain('2 unique users');
  });

  it('renders nothing without vendor data', () => {
    expect(renderToStaticMarkup(<ModelVendorBreakdown vendorTables={[]} />)).toBe('');
  });
});
