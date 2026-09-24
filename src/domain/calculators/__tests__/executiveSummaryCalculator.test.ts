import { describe, expect, it } from 'vitest';
import { makeUserSummary } from '../../../__tests__/factories/aggregatedMetrics';
import { makeMetric } from '../../../__tests__/factories/metrics';
import { aggregateMetrics } from '../../metricsAggregator';
import { computeExecutiveSummary } from '../executiveSummaryCalculator';
import type { DailyEngagementData } from '../engagementCalculator';

const engagement = (date: string, activeUsers: number): DailyEngagementData => ({
  date, activeUsers, totalUsers: activeUsers, engagementPercentage: 100,
});

describe('computeExecutiveSummary', () => {
  it('keeps unavailable ratios distinct from zero for empty inputs', () => {
    expect(computeExecutiveSummary([], [])).toEqual({
      observedStartDay: '', observedEndDay: '', calendarDays: 0, reportedDays: 0,
      observedUsers: 0, activeUserDays: 0, averageDaysPerUser: null, medianDaysPerUser: null,
      weekdayAverage: null, totalAiCreditsUsed: 0, creditsPerUserDay: null,
      topDecile: null, hasNegativeUserCredits: false, locAdded: 0, locDeleted: 0,
      participation: [], peakDailyUsers: 0,
    });
  });

  it('computes means, medians, exact fractional credits, and signed LOC without mutation', () => {
    const users = [
      makeUserSummary({ days_active: 3, total_ai_credits_used: 0.125, total_loc_added: -20 }),
      makeUserSummary({ days_active: 1, total_ai_credits_used: 0.375, total_loc_deleted: -4 }),
    ];
    const days = [engagement('2026-09-03', 1), engagement('2026-09-01', 2), engagement('2026-09-02', 1)];
    const original = structuredClone({ users, days });
    const summary = computeExecutiveSummary(users, days);
    expect(summary).toMatchObject({
      observedUsers: 2, activeUserDays: 4, averageDaysPerUser: 2, medianDaysPerUser: 2,
      totalAiCreditsUsed: 0.5, creditsPerUserDay: 0.125, locAdded: -20, locDeleted: -4,
      peakDailyUsers: 2, topDecile: { userCount: 1, creditsShare: 75 },
    });
    expect(summary.weekdayAverage).toBeCloseTo(4 / 3);
    expect({ users, days }).toEqual(original);
    expect(computeExecutiveSummary([...users, makeUserSummary({ days_active: 2 })], days).medianDaysPerUser).toBe(2);
  });

  it('uses all observed dates across files, deduplicates user-days, and retains gaps', () => {
    const { aggregated } = aggregateMetrics([
      makeMetric({ day: '2026-09-07', report_start_day: '2026-09-07', report_end_day: '2026-09-07' }),
      makeMetric({ day: '2026-09-01', report_start_day: '2026-09-01', report_end_day: '2026-09-30' }),
      makeMetric({ day: '2026-09-01' }),
    ]);
    expect(aggregated.overview.stats.reportStartDay).toBe('2026-09-07');
    const summary = aggregated.overview.executiveSummary;
    expect(summary).toMatchObject({
      observedStartDay: '2026-09-01', observedEndDay: '2026-09-07',
      calendarDays: 7, reportedDays: 2, observedUsers: 1, activeUserDays: 2,
      weekdayAverage: 1,
    });
    expect(summary.participation).toEqual([
      { date: '2026-09-01', users: 1, dayOffset: 0, isWeekend: false },
      { date: '2026-09-07', users: 1, dayOffset: 6, isWeekend: false },
    ]);
  });

  it('does not invent weekday averages for a weekend-only window', () => {
    const summary = computeExecutiveSummary(
      [makeUserSummary({ days_active: 1 })],
      [engagement('2026-09-06', 1)]
    );
    expect(summary).toMatchObject({ calendarDays: 1, weekdayAverage: null });
    expect(summary.participation[0].isWeekend).toBe(true);
  });

  it('handles leap days using UTC calendar dates', () => {
    const summary = computeExecutiveSummary([], [engagement('2024-02-28', 1), engagement('2024-03-01', 1)]);
    expect(summary.calendarDays).toBe(3);
    expect(summary.participation[1].dayOffset).toBe(2);
  });

  it('rounds the highest-consuming decile up to a whole user', () => {
    const users = Array.from({ length: 11 }, (_, index) => makeUserSummary({
      user_id: index, total_ai_credits_used: index === 0 ? 100 : 10,
    }));
    const concentration = computeExecutiveSummary(users, []).topDecile;
    expect(concentration?.userCount).toBe(2);
    expect(concentration?.creditsShare).toBeCloseTo(55);
  });

  it.each([[0, 0], [-2.5, 0], [-1, 10]])('does not display misleading credit shares for %j', (...credits) => {
    const users = credits.map(total_ai_credits_used => makeUserSummary({ total_ai_credits_used }));
    const summary = computeExecutiveSummary(users, []);
    expect(summary.topDecile).toBeNull();
    expect(summary.totalAiCreditsUsed).toBe(credits[0] + credits[1]);
  });
});
