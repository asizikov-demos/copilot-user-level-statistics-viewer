import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { buildOverviewHeaderModel } from '../../../../read-models/overviewHeader';
import OverviewHeader from '../OverviewHeader';

const model = buildOverviewHeaderModel({
  uniqueUsers: 1248,
  enterpriseId: '48213',
  reportStartDay: '2026-08-31',
  reportEndDay: '2026-09-01',
  engagementData: [
    { date: '2026-08-31', activeUsers: 600, totalUsers: 1248, engagementPercentage: 48 },
    { date: '2026-09-01', activeUsers: 700, totalUsers: 1248, engagementPercentage: 56 },
  ],
  dailyAiCreditsData: [
    { date: '2026-08-31', aiCreditsUsed: 1000, users: 600 },
    { date: '2026-09-01', aiCreditsUsed: 2500, users: 700 },
  ],
  dailyLocData: [
    { date: '2026-08-31', locAdded: 1200, locDeleted: 300, netChange: 900, userCount: 50, totalUniqueUsers: 1248 },
    { date: '2026-09-01', locAdded: 400, locDeleted: 100, netChange: 300, userCount: 40, totalUniqueUsers: 1248 },
  ],
});

describe('OverviewHeader', () => {
  it('shows the enterprise identity, window, users, and billing months', () => {
    const html = renderToStaticMarkup(<OverviewHeader model={model} enterpriseName="acme" />);

    expect(html).toContain('>acme</h2>');
    expect(html).toContain('Enterprise ID <span class="tabular-nums">48213</span>');
    expect(html).toContain('Aug 31 – Sep 1, 2026 (2 days)');
    expect(html).toContain('1,248');
    expect(html).toContain('650</span> on a typical weekday');
    expect(html).toContain('Peak · 700 on Sep 1');
    expect(html).toContain('Sep billing starts');
    expect(html).toContain('August 2026');
    expect(html).toContain('September 2026');
    expect(html).toContain('$25.00');
    expect(html).toContain('Lines changed');
    expect(html).not.toContain('md:grid-cols-3');
    expect(html).toContain('1.5K');
    expect(html).toContain('+1.2K');
    expect(html).toContain('−300');
  });

  it('falls back to the enterprise ID when no name is derived', () => {
    const html = renderToStaticMarkup(<OverviewHeader model={model} enterpriseName={null} />);

    expect(html).toContain('>Enterprise 48213</h2>');
    expect(html).not.toContain('Enterprise ID');
  });

  it('uses equal-width tiles for two billing months and a full-width tile for one', () => {
    const twoMonths = renderToStaticMarkup(<OverviewHeader model={model} enterpriseName="acme" />);
    const oneMonth = renderToStaticMarkup(
      <OverviewHeader
        model={buildOverviewHeaderModel({
          uniqueUsers: 1,
          enterpriseId: null,
          reportStartDay: '2026-09-01',
          reportEndDay: '2026-09-28',
          engagementData: [],
          dailyAiCreditsData: [],
          dailyLocData: [],
        })}
        enterpriseName={null}
      />
    );

    expect(twoMonths).toContain('md:grid-cols-2');
    expect(oneMonth).not.toContain('md:grid-cols-2');
    expect(oneMonth).not.toContain('billing starts');
  });

  it('includes both years when the window crosses a year boundary', () => {
    const crossYear = buildOverviewHeaderModel({
      uniqueUsers: 1,
      enterpriseId: null,
      reportStartDay: '2025-12-31',
      reportEndDay: '2026-01-01',
      engagementData: [],
      dailyAiCreditsData: [],
      dailyLocData: [],
    });
    const html = renderToStaticMarkup(<OverviewHeader model={crossYear} enterpriseName={null} />);

    expect(html).toContain('Dec 31, 2025 – Jan 1, 2026 (2 days)');
  });

  it('omits the window strip when the report has no days', () => {
    const empty = buildOverviewHeaderModel({
      uniqueUsers: 0,
      enterpriseId: null,
      reportStartDay: '',
      reportEndDay: '',
      engagementData: [],
      dailyAiCreditsData: [],
      dailyLocData: [],
    });
    const html = renderToStaticMarkup(<OverviewHeader model={empty} enterpriseName={null} />);

    expect(html).toContain('>Metrics Overview</h2>');
    expect(html).toContain('No report window');
    expect(html).not.toContain('role="img"');
  });
});
