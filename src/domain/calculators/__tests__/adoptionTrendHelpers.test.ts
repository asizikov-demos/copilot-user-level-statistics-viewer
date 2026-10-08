import { describe, it, expect } from 'vitest';
import { computeAdoptionTrendFromUserSets } from '../adoptionTrendHelpers';

describe('computeAdoptionTrendFromUserSets', () => {
  it('returns an empty trend for empty input', () => {
    expect(computeAdoptionTrendFromUserSets([])).toEqual([]);
  });

  it('classifies first-seen users as new and previously seen users as returning', () => {
    const result = computeAdoptionTrendFromUserSets([
      { date: '2024-01-15', users: new Set([1, 2]) },
      { date: '2024-01-16', users: new Set([1, 3]) },
      { date: '2024-01-17', users: new Set([2, 3, 4]) },
    ]);
    expect(result).toEqual([
      { date: '2024-01-15', newUsers: 2, returningUsers: 0, totalActiveUsers: 2, cumulativeUsers: 2 },
      { date: '2024-01-16', newUsers: 1, returningUsers: 1, totalActiveUsers: 2, cumulativeUsers: 3 },
      { date: '2024-01-17', newUsers: 1, returningUsers: 2, totalActiveUsers: 3, cumulativeUsers: 4 },
    ]);
  });

  it.each([
    {
      name: 'the same user returns every day',
      days: [[1], [1], [1]],
      expected: { cumulativeUsers: [1, 1, 1], newUsers: [1, 0, 0], returningUsers: [0, 1, 1] },
    },
    {
      name: 'a different user appears every day',
      days: [[1], [2], [3]],
      expected: { cumulativeUsers: [1, 2, 3], newUsers: [1, 1, 1], returningUsers: [0, 0, 0] },
    },
  ])('tracks cumulative users without double counting when $name', ({ days, expected }) => {
    const result = computeAdoptionTrendFromUserSets(
      days.map((users, i) => ({ date: `2024-01-1${5 + i}`, users: new Set(users) }))
    );
    expect({
      cumulativeUsers: result.map(d => d.cumulativeUsers),
      newUsers: result.map(d => d.newUsers),
      returningUsers: result.map(d => d.returningUsers),
    }).toEqual(expected);
  });

  it('carries cumulative users through a date with no active users', () => {
    const result = computeAdoptionTrendFromUserSets([
      { date: '2024-01-15', users: new Set<number>([1]) },
      { date: '2024-01-16', users: new Set<number>() },
      { date: '2024-01-17', users: new Set<number>([1]) },
    ]);
    expect(result[1]).toEqual({
      date: '2024-01-16',
      newUsers: 0,
      returningUsers: 0,
      totalActiveUsers: 0,
      cumulativeUsers: 1,
    });
    expect(result[2]).toMatchObject({ returningUsers: 1, cumulativeUsers: 1 });
  });
});
