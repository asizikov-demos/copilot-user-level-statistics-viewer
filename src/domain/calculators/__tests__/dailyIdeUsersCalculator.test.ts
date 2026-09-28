import { describe, expect, it } from 'vitest';
import { makeMetric } from '../../../__tests__/factories/metrics';
import {
  accumulateDailyIdeUsers,
  computeDailyIdeUsersData,
  createDailyIdeUsersAccumulator,
} from '../dailyIdeUsersCalculator';

function makeIdeTotal(ide: string) {
  return {
    ide,
    user_initiated_interaction_count: 1,
    code_generation_activity_count: 0,
    code_acceptance_activity_count: 0,
    loc_added_sum: 0,
    loc_deleted_sum: 0,
    loc_suggested_to_add_sum: 0,
    loc_suggested_to_delete_sum: 0,
  };
}

describe('daily IDE users calculator', () => {
  it('returns no entries without data', () => {
    expect(computeDailyIdeUsersData(createDailyIdeUsersAccumulator())).toEqual([]);
  });

  it('counts unique users per client per day and orders clients by total reach', () => {
    const accumulator = createDailyIdeUsersAccumulator();

    accumulateDailyIdeUsers(accumulator, makeMetric({
      user_id: 1,
      day: '2024-01-15',
      totals_by_ide: [makeIdeTotal('vscode'), makeIdeTotal('copilot_app')],
    }));
    accumulateDailyIdeUsers(accumulator, makeMetric({
      user_id: 2,
      day: '2024-01-15',
      totals_by_ide: [makeIdeTotal('vscode')],
    }));
    accumulateDailyIdeUsers(accumulator, makeMetric({
      user_id: 1,
      day: '2024-01-16',
      totals_by_ide: [makeIdeTotal('vscode'), makeIdeTotal('vscode')],
    }));

    expect(computeDailyIdeUsersData(accumulator)).toEqual([
      {
        ide: 'vscode',
        totalUniqueUsers: 2,
        daily: [
          { date: '2024-01-15', uniqueUsers: 2 },
          { date: '2024-01-16', uniqueUsers: 1 },
        ],
      },
      {
        ide: 'copilot_app',
        totalUniqueUsers: 1,
        daily: [{ date: '2024-01-15', uniqueUsers: 1 }],
      },
    ]);
  });

  it('treats Copilot CLI usage as its own client', () => {
    const accumulator = createDailyIdeUsersAccumulator();

    accumulateDailyIdeUsers(accumulator, makeMetric({
      user_id: 1,
      day: '2024-01-15',
      used_cli: true,
      totals_by_ide: [makeIdeTotal('vscode')],
    }));
    accumulateDailyIdeUsers(accumulator, makeMetric({
      user_id: 2,
      day: '2024-01-16',
      used_cli: true,
      totals_by_ide: [],
    }));

    expect(computeDailyIdeUsersData(accumulator)).toEqual([
      {
        ide: 'copilot_cli',
        totalUniqueUsers: 2,
        daily: [
          { date: '2024-01-15', uniqueUsers: 1 },
          { date: '2024-01-16', uniqueUsers: 1 },
        ],
      },
      {
        ide: 'vscode',
        totalUniqueUsers: 1,
        daily: [{ date: '2024-01-15', uniqueUsers: 1 }],
      },
    ]);
  });

  it('breaks reach ties by client key so ordering stays stable', () => {
    const accumulator = createDailyIdeUsersAccumulator();

    accumulateDailyIdeUsers(accumulator, makeMetric({
      user_id: 1,
      day: '2024-01-15',
      totals_by_ide: [makeIdeTotal('zed'), makeIdeTotal('eclipse')],
    }));

    expect(computeDailyIdeUsersData(accumulator).map(entry => entry.ide)).toEqual([
      'eclipse',
      'zed',
    ]);
  });
});
