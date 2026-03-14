import { describe, it, expect } from 'vitest';
import {
  createIDEStatsAccumulator,
  accumulateIDEStats,
  markCliUser,
  computeIDEStatsData,
} from '../ideStatsCalculator';

function makeIDETotal(ide: string, overrides: Partial<{
  user_initiated_interaction_count: number;
  code_generation_activity_count: number;
  code_acceptance_activity_count: number;
  loc_added_sum: number;
  loc_deleted_sum: number;
  loc_suggested_to_add_sum: number;
  loc_suggested_to_delete_sum: number;
}> = {}) {
  return {
    ide,
    user_initiated_interaction_count: overrides.user_initiated_interaction_count ?? 10,
    code_generation_activity_count: overrides.code_generation_activity_count ?? 5,
    code_acceptance_activity_count: overrides.code_acceptance_activity_count ?? 3,
    loc_added_sum: overrides.loc_added_sum ?? 100,
    loc_deleted_sum: overrides.loc_deleted_sum ?? 20,
    loc_suggested_to_add_sum: overrides.loc_suggested_to_add_sum ?? 50,
    loc_suggested_to_delete_sum: overrides.loc_suggested_to_delete_sum ?? 10,
  };
}

describe('ideStatsCalculator', () => {
  describe('basic accumulation', () => {
    it('accumulates stats for a single IDE and user', () => {
      const acc = createIDEStatsAccumulator();
      accumulateIDEStats(acc, 1, makeIDETotal('vscode'));
      const { ideStats } = computeIDEStatsData(acc);

      expect(ideStats).toHaveLength(1);
      expect(ideStats[0].ide).toBe('vscode');
      expect(ideStats[0].uniqueUsers).toBe(1);
      expect(ideStats[0].totalEngagements).toBe(10);
    });

    it('deduplicates users within the same IDE', () => {
      const acc = createIDEStatsAccumulator();
      accumulateIDEStats(acc, 1, makeIDETotal('vscode'));
      accumulateIDEStats(acc, 1, makeIDETotal('vscode'));
      const { ideStats } = computeIDEStatsData(acc);

      expect(ideStats[0].uniqueUsers).toBe(1);
      expect(ideStats[0].totalEngagements).toBe(20);
    });

    it('counts multi-IDE users', () => {
      const acc = createIDEStatsAccumulator();
      accumulateIDEStats(acc, 1, makeIDETotal('vscode'));
      accumulateIDEStats(acc, 1, makeIDETotal('jetbrains'));
      const { multiIDEUsersCount, totalUniqueIDEUsers } = computeIDEStatsData(acc);

      expect(multiIDEUsersCount).toBe(1);
      expect(totalUniqueIDEUsers).toBe(1);
    });
  });

  describe('CLI overlap via markCliUser', () => {
    it('counts overlap when user uses both IDE and CLI', () => {
      const acc = createIDEStatsAccumulator();
      accumulateIDEStats(acc, 1, makeIDETotal('vscode'));
      markCliUser(acc, 1);
      const { ideStats } = computeIDEStatsData(acc);

      expect(ideStats[0].cliOverlapUsers).toBe(1);
    });

    it('does not affect IDE overlap when CLI-only user has no IDE data', () => {
      const acc = createIDEStatsAccumulator();
      accumulateIDEStats(acc, 1, makeIDETotal('vscode'));
      markCliUser(acc, 99); // CLI-only user, no IDE rows
      const { ideStats } = computeIDEStatsData(acc);

      expect(ideStats[0].cliOverlapUsers).toBe(0);
    });

    it('computes overlap per IDE when user uses multiple IDEs and CLI', () => {
      const acc = createIDEStatsAccumulator();
      accumulateIDEStats(acc, 1, makeIDETotal('vscode'));
      accumulateIDEStats(acc, 1, makeIDETotal('jetbrains'));
      markCliUser(acc, 1);
      const { ideStats } = computeIDEStatsData(acc);

      const vscode = ideStats.find(s => s.ide === 'vscode')!;
      const jetbrains = ideStats.find(s => s.ide === 'jetbrains')!;
      expect(vscode.cliOverlapUsers).toBe(1);
      expect(jetbrains.cliOverlapUsers).toBe(1);
    });

    it('handles mixed users — some with CLI, some without', () => {
      const acc = createIDEStatsAccumulator();
      accumulateIDEStats(acc, 1, makeIDETotal('vscode'));
      accumulateIDEStats(acc, 2, makeIDETotal('vscode'));
      accumulateIDEStats(acc, 3, makeIDETotal('vscode'));
      markCliUser(acc, 1);
      markCliUser(acc, 3);
      const { ideStats } = computeIDEStatsData(acc);

      expect(ideStats[0].uniqueUsers).toBe(3);
      expect(ideStats[0].cliOverlapUsers).toBe(2);
    });

    it('returns zero overlap when no CLI users are marked', () => {
      const acc = createIDEStatsAccumulator();
      accumulateIDEStats(acc, 1, makeIDETotal('vscode'));
      accumulateIDEStats(acc, 2, makeIDETotal('jetbrains'));
      const { ideStats } = computeIDEStatsData(acc);

      expect(ideStats.every(s => s.cliOverlapUsers === 0)).toBe(true);
    });

    it('is idempotent — marking same user twice does not double count', () => {
      const acc = createIDEStatsAccumulator();
      accumulateIDEStats(acc, 1, makeIDETotal('vscode'));
      markCliUser(acc, 1);
      markCliUser(acc, 1);
      const { ideStats } = computeIDEStatsData(acc);

      expect(ideStats[0].cliOverlapUsers).toBe(1);
    });
  });
});
