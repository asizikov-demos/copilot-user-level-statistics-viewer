import { describe, it, expect } from 'vitest';
import { computeAdoptionTrendFromUserSets } from '../adoptionTrendHelpers';

describe('computeAdoptionTrendFromUserSets', () => {
  it('should return empty array for empty input', () => {
    expect(computeAdoptionTrendFromUserSets([])).toEqual([]);
  });

  it('should classify all users as new on a single date', () => {
    const input = [{ date: '2024-01-15', users: new Set([1, 2, 3]) }];
    const result = computeAdoptionTrendFromUserSets(input);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      date: '2024-01-15',
      newUsers: 3,
      returningUsers: 0,
      totalActiveUsers: 3,
      cumulativeUsers: 3,
    });
  });

  it('should classify returning users on subsequent dates', () => {
    const input = [
      { date: '2024-01-15', users: new Set([1, 2]) },
      { date: '2024-01-16', users: new Set([1, 3]) },
    ];
    const result = computeAdoptionTrendFromUserSets(input);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      date: '2024-01-15',
      newUsers: 2,
      returningUsers: 0,
      totalActiveUsers: 2,
      cumulativeUsers: 2,
    });
    expect(result[1]).toEqual({
      date: '2024-01-16',
      newUsers: 1,
      returningUsers: 1,
      totalActiveUsers: 2,
      cumulativeUsers: 3,
    });
  });

  it('should not double-count cumulative users when they return', () => {
    const input = [
      { date: '2024-01-15', users: new Set([1]) },
      { date: '2024-01-16', users: new Set([1]) },
      { date: '2024-01-17', users: new Set([1]) },
    ];
    const result = computeAdoptionTrendFromUserSets(input);
    expect(result.map(d => d.cumulativeUsers)).toEqual([1, 1, 1]);
    expect(result.map(d => d.newUsers)).toEqual([1, 0, 0]);
    expect(result.map(d => d.returningUsers)).toEqual([0, 1, 1]);
  });

  it('should track cumulative growth correctly over multiple dates', () => {
    const input = [
      { date: '2024-01-15', users: new Set([1]) },
      { date: '2024-01-16', users: new Set([2]) },
      { date: '2024-01-17', users: new Set([3]) },
    ];
    const result = computeAdoptionTrendFromUserSets(input);
    expect(result.map(d => d.cumulativeUsers)).toEqual([1, 2, 3]);
    expect(result.map(d => d.newUsers)).toEqual([1, 1, 1]);
    expect(result.map(d => d.returningUsers)).toEqual([0, 0, 0]);
  });

  it('should handle empty user sets', () => {
    const input = [
      { date: '2024-01-15', users: new Set<number>([1]) },
      { date: '2024-01-16', users: new Set<number>() },
      { date: '2024-01-17', users: new Set<number>([1]) },
    ];
    const result = computeAdoptionTrendFromUserSets(input);
    expect(result).toHaveLength(3);
    expect(result[1]).toEqual({
      date: '2024-01-16',
      newUsers: 0,
      returningUsers: 0,
      totalActiveUsers: 0,
      cumulativeUsers: 1,
    });
    expect(result[2]).toMatchObject({ returningUsers: 1, cumulativeUsers: 1 });
  });

  it('should handle mixed new and returning users across dates', () => {
    const input = [
      { date: '2024-01-15', users: new Set([1, 2]) },
      { date: '2024-01-16', users: new Set([1, 3]) },
      { date: '2024-01-17', users: new Set([2, 3, 4]) },
    ];
    const result = computeAdoptionTrendFromUserSets(input);
    expect(result[0]).toMatchObject({ newUsers: 2, returningUsers: 0, cumulativeUsers: 2 });
    expect(result[1]).toMatchObject({ newUsers: 1, returningUsers: 1, cumulativeUsers: 3 });
    expect(result[2]).toMatchObject({ newUsers: 1, returningUsers: 2, cumulativeUsers: 4 });
  });
});
