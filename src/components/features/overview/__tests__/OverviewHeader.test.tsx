import { renderToStaticMarkup } from 'react-dom/server';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { describe, expect, it } from 'vitest';
import type {
  OverviewBillingMonth,
  OverviewHeaderModel,
  OverviewWindowDay,
} from '../../../../read-models/overviewHeader';
import OverviewHeader from '../OverviewHeader';

function makeDay(overrides: Partial<OverviewWindowDay> & Pick<OverviewWindowDay, 'date'>): OverviewWindowDay {
  return { activeUsers: 0, aiCreditsUsed: 0, locAdded: 0, locDeleted: 0, isWeekend: false, isPeak: false, ...overrides };
}

function makeBillingMonth(overrides: Partial<OverviewBillingMonth> & Pick<OverviewBillingMonth, 'key' | 'label' | 'shortLabel'>): OverviewBillingMonth {
  return { daysInWindow: 1, avgDailyActiveUsers: 0, aiCreditsUsed: 0, locAdded: 0, locDeleted: 0, ...overrides };
}

function makeModel(overrides: Partial<OverviewHeaderModel> = {}): OverviewHeaderModel {
  return {
    uniqueUsers: 1,
    enterpriseId: null,
    reportStartDay: '',
    reportEndDay: '',
    days: [],
    billingMonths: [],
    peakDay: null,
    typicalWeekdayActiveUsers: null,
    ...overrides,
  };
}

const peakDay = makeDay({ date: '2026-09-01', activeUsers: 700, aiCreditsUsed: 2500, locAdded: 400, locDeleted: 100, isPeak: true });

const model = makeModel({
  uniqueUsers: 1248,
  enterpriseId: '48213',
  reportStartDay: '2026-08-31',
  reportEndDay: '2026-09-01',
  days: [
    makeDay({ date: '2026-08-31', activeUsers: 600, aiCreditsUsed: 1000, locAdded: 1200, locDeleted: 300 }),
    peakDay,
  ],
  billingMonths: [
    makeBillingMonth({ key: '2026-08', label: 'August 2026', shortLabel: 'Aug', avgDailyActiveUsers: 600, aiCreditsUsed: 1000, locAdded: 1200, locDeleted: 300 }),
    makeBillingMonth({ key: '2026-09', label: 'September 2026', shortLabel: 'Sep', avgDailyActiveUsers: 700, aiCreditsUsed: 2500, locAdded: 400, locDeleted: 100 }),
  ],
  peakDay,
  typicalWeekdayActiveUsers: 650,
});

describe('OverviewHeader', () => {
  it('keeps the accessible daily activity list outside the atomic image role', async () => {
    let renderer: ReactTestRenderer | undefined;
    try {
      await act(async () => {
        renderer = create(<OverviewHeader model={model} enterpriseName="acme" />);
      });

      const image = renderer!.root.findByProps({ role: 'img' });
      const list = renderer!.root.findByProps({ 'aria-label': 'Daily activity' });

      expect(image.props['aria-label']).toContain('Peak of 700');
      expect(list.type).toBe('ul');
      expect(list.props.className).toBe('sr-only');
      expect(list.findAllByType('li')).toHaveLength(model.days.length);
      for (let ancestor = list.parent; ancestor; ancestor = ancestor.parent) {
        expect(ancestor.props.role).not.toBe('img');
      }
    } finally {
      await act(async () => { renderer?.unmount(); });
    }
  });

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
        model={makeModel({
          reportStartDay: '2026-09-01',
          reportEndDay: '2026-09-28',
          days: [makeDay({ date: '2026-09-01' }), makeDay({ date: '2026-09-28' })],
          billingMonths: [makeBillingMonth({ key: '2026-09', label: 'September 2026', shortLabel: 'Sep', daysInWindow: 28 })],
        })}
        enterpriseName={null}
      />
    );

    expect(twoMonths).toContain('md:grid-cols-2');
    expect(oneMonth).not.toContain('md:grid-cols-2');
    expect(oneMonth).not.toContain('billing starts');
  });

  it('includes both years when the window crosses a year boundary', () => {
    const crossYear = makeModel({
      reportStartDay: '2025-12-31',
      reportEndDay: '2026-01-01',
      days: [makeDay({ date: '2025-12-31' }), makeDay({ date: '2026-01-01' })],
    });
    const html = renderToStaticMarkup(<OverviewHeader model={crossYear} enterpriseName={null} />);

    expect(html).toContain('Dec 31, 2025 – Jan 1, 2026 (2 days)');
  });

  it('omits the window strip when the report has no days', () => {
    const empty = makeModel({ uniqueUsers: 0 });
    const html = renderToStaticMarkup(<OverviewHeader model={empty} enterpriseName={null} />);

    expect(html).toContain('>Metrics Overview</h2>');
    expect(html).toContain('No report window');
    expect(html).not.toContain('role="img"');
  });
});
