import { describe, expect, it } from 'vitest';
import { makeUserSummary } from '../../../__tests__/factories/aggregatedMetrics';
import { computeAiCreditsSummary } from '../aiCreditsCalculator';

describe('worker AI credit summary', () => {
  it('preserves fractional/signed totals, stable ties, and positive top-five users', () => {
    const users = [2.5, 0, -0.25, 2.5, 1, 3, 0.125, 4].map((credits, user_id) =>
      makeUserSummary({ user_id, total_ai_credits_used: credits, days_active: 2 }),
    );
    const before = structuredClone(users);
    const summary = computeAiCreditsSummary(users, [
      { date: '2026-02-01', aiCreditsUsed: 2.5, users: 1 },
      { date: '2026-01-30', aiCreditsUsed: -0.25, users: 0 },
      { date: '2026-02-02', aiCreditsUsed: 0.125, users: 1 },
    ]);

    expect(summary.totalAiCreditsUsed).toBe(12.875);
    expect(summary.activeUserDays).toBe(16);
    expect(summary.topUsers.map(user => user.user_id)).toEqual([7, 5, 0, 3, 4]);
    expect(summary.topUsers[0].creditsShare).toBeCloseTo(4 / 12.875 * 100);
    expect(summary.topDecile).toEqual({ userCount: 1, creditsShare: 4 / 12.875 * 100 });
    expect(summary.monthlyCredits).toEqual([
      { key: '2026-01', aiCreditsUsed: -0.25 },
      { key: '2026-02', aiCreditsUsed: 2.625 },
    ]);
    expect(users).toEqual(before);
  });

  it('suppresses concentration and shares for nonpositive totals without discarding positive users', () => {
    const summary = computeAiCreditsSummary([
      makeUserSummary({ total_ai_credits_used: 1.125 }),
      makeUserSummary({ total_ai_credits_used: -4.75 }),
    ], []);
    expect(summary.totalAiCreditsUsed).toBe(-3.625);
    expect(summary.topDecile).toBeNull();
    expect(summary.topUsers).toHaveLength(1);
    expect(summary.topUsers[0].creditsShare).toBe(0);
  });
});
