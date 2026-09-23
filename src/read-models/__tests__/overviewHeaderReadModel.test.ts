import { describe, expect, it } from 'vitest';
import { buildOverviewHeaderModel } from '../overviewHeader';

function loc(date: string, locAdded: number, locDeleted: number) {
  return { date, locAdded, locDeleted, netChange: locAdded - locDeleted, userCount: 1, totalUniqueUsers: 10 };
}

function engagement(date: string, activeUsers: number) {
  return { date, activeUsers, totalUsers: 10, engagementPercentage: activeUsers * 10 };
}

describe('buildOverviewHeaderModel', () => {
  const model = buildOverviewHeaderModel({
    uniqueUsers: 10,
    enterpriseId: '48213',
    reportStartDay: '2026-08-29',
    reportEndDay: '2026-09-03',
    engagementData: [
      engagement('2026-08-29', 2),
      engagement('2026-08-31', 6),
      engagement('2026-09-01', 8),
      engagement('2026-09-02', 4),
    ],
    dailyAiCreditsData: [
      { date: '2026-08-31', aiCreditsUsed: 300, users: 6 },
      { date: '2026-09-01', aiCreditsUsed: 500, users: 8 },
      { date: '2026-09-03', aiCreditsUsed: 100, users: 1 },
    ],
    dailyLocData: [
      loc('2026-08-31', 120, 30),
      loc('2026-09-01', 200, 50),
      loc('2026-09-02', 80, 20),
    ],
  });

  it('fills every day of the report window and flags weekends', () => {
    expect(model.days.map(day => day.date)).toEqual([
      '2026-08-29',
      '2026-08-30',
      '2026-08-31',
      '2026-09-01',
      '2026-09-02',
      '2026-09-03',
    ]);
    expect(model.days.map(day => day.isWeekend)).toEqual([true, true, false, false, false, false]);
    expect(model.days[1]).toMatchObject({ activeUsers: 0, aiCreditsUsed: 0 });
    expect(model.days[5]).toMatchObject({ activeUsers: 0, aiCreditsUsed: 100 });
  });

  it('marks the peak day', () => {
    expect(model.peakDay?.date).toBe('2026-09-01');
    expect(model.days.filter(day => day.isPeak)).toHaveLength(1);
  });

  it('averages weekday actives over days with activity only', () => {
    expect(model.typicalWeekdayActiveUsers).toBe(6);
  });

  it('splits the window into calendar billing months', () => {
    expect(model.billingMonths).toEqual([
      {
        key: '2026-08',
        label: 'August 2026',
        shortLabel: 'Aug',
        daysInWindow: 3,
        avgDailyActiveUsers: 4,
        aiCreditsUsed: 300,
        locAdded: 120,
        locDeleted: 30,
      },
      {
        key: '2026-09',
        label: 'September 2026',
        shortLabel: 'Sep',
        daysInWindow: 3,
        avgDailyActiveUsers: 6,
        aiCreditsUsed: 600,
        locAdded: 280,
        locDeleted: 70,
      },
    ]);
  });

  it('extends the window to observed dates outside the report metadata', () => {
    const extended = buildOverviewHeaderModel({
      uniqueUsers: 3,
      enterpriseId: null,
      reportStartDay: '2026-09-02',
      reportEndDay: '2026-09-03',
      engagementData: [engagement('2026-09-01', 1), engagement('2026-09-03', 2)],
      dailyAiCreditsData: [{ date: '2026-09-04', aiCreditsUsed: 10, users: 1 }],
      dailyLocData: [],
    });

    expect(extended.reportStartDay).toBe('2026-09-01');
    expect(extended.reportEndDay).toBe('2026-09-04');
    expect(extended.days).toHaveLength(4);
    expect(extended.billingMonths[0].aiCreditsUsed).toBe(10);
  });

  it('handles an empty report', () => {
    const empty = buildOverviewHeaderModel({
      uniqueUsers: 0,
      enterpriseId: null,
      reportStartDay: '',
      reportEndDay: '',
      engagementData: [],
      dailyAiCreditsData: [],
      dailyLocData: [],
    });

    expect(empty.days).toEqual([]);
    expect(empty.billingMonths).toEqual([]);
    expect(empty.peakDay).toBeNull();
    expect(empty.typicalWeekdayActiveUsers).toBeNull();
  });
});
