import { describe, expect, it } from 'vitest';
import { makeUserSummary } from '../../__tests__/factories/aggregatedMetrics';
import { buildAiCreditsStatement } from '../aiCreditsStatement';

function user(id: number, credits: number, days: number, phase?: number) {
  return makeUserSummary({
    user_id: id,
    user_login: `user${id}`,
    total_ai_credits_used: credits,
    days_active: days,
    ai_adoption_phase: phase === undefined ? undefined : { phase_number: phase, phase: `Phase ${phase}`, version: '1' },
  });
}

describe('buildAiCreditsStatement', () => {
  const users = [
    user(1, 600, 10, 3),
    user(2, 200, 5, 1),
    ...Array.from({ length: 9 }, (_, index) => user(index + 3, 25, 5, 0)),
  ];
  const statement = buildAiCreditsStatement(users, [
    { date: '2026-08-31', aiCreditsUsed: 400, users: 3 },
    { date: '2026-09-01', aiCreditsUsed: 625, users: 11 },
  ]);

  it('summarises users, user-days, and credits', () => {
    expect(statement.activeUsers).toBe(11);
    expect(statement.usersInPhase).toBe(2);
    expect(statement.activeUserDays).toBe(60);
    expect(statement.avgDaysPerUser).toBeCloseTo(60 / 11);
    expect(statement.totalAiCreditsUsed).toBe(1025);
    expect(statement.creditsPerUserDay).toBeCloseTo(1025 / 60);
    expect(statement.creditsPerActiveUser).toBeCloseTo(1025 / 11);
  });

  it('splits credits by calendar month', () => {
    expect(statement.monthlyCredits).toEqual([
      { key: '2026-08', shortLabel: 'Aug', aiCreditsUsed: 400 },
      { key: '2026-09', shortLabel: 'Sep', aiCreditsUsed: 625 },
    ]);
  });

  it('measures the share consumed by the top 10% of users', () => {
    expect(statement.topDecile?.userCount).toBe(2);
    expect(statement.topDecile?.creditsShare).toBeCloseTo((800 / 1025) * 100);
  });

  it('handles an empty upload', () => {
    const empty = buildAiCreditsStatement([], []);

    expect(empty).toMatchObject({ activeUsers: 0, activeUserDays: 0, avgDaysPerUser: 0, creditsPerActiveUser: 0 });
    expect(empty.monthlyCredits).toEqual([]);
    expect(empty.topDecile).toBeNull();
  });
});
