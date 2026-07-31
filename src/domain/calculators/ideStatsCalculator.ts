import type { IDEStatsData } from '../../types/metrics';
import { accumulateAggMetricTotals } from './aggMetricTotals';

interface IDEAccumulatorEntry {
  users: Set<number>;
  totalEngagements: number;
  code_generation_activity_count: number;
  code_acceptance_activity_count: number;
  loc_added_sum: number;
  loc_deleted_sum: number;
  loc_suggested_to_add_sum: number;
  loc_suggested_to_delete_sum: number;
}

export interface IDEStatsAccumulator {
  ideMap: Map<string, IDEAccumulatorEntry>;
  userIDEs: Map<number, Set<string>>;
  cliUserIds: Set<number>;
}

export function createIDEStatsAccumulator(): IDEStatsAccumulator {
  return {
    ideMap: new Map(),
    userIDEs: new Map(),
    cliUserIds: new Set(),
  };
}

export function accumulateIDEStats(
  accumulator: IDEStatsAccumulator,
  userId: number,
  ideTotal: {
    ide: string;
    user_initiated_interaction_count: number;
    code_generation_activity_count: number;
    code_acceptance_activity_count: number;
    loc_added_sum: number;
    loc_deleted_sum: number;
    loc_suggested_to_add_sum: number;
    loc_suggested_to_delete_sum: number;
  }
): void {
  const ide = ideTotal.ide;

  if (!accumulator.ideMap.has(ide)) {
    accumulator.ideMap.set(ide, {
      users: new Set(),
      totalEngagements: 0,
      code_generation_activity_count: 0,
      code_acceptance_activity_count: 0,
      loc_added_sum: 0,
      loc_deleted_sum: 0,
      loc_suggested_to_add_sum: 0,
      loc_suggested_to_delete_sum: 0,
    });
  }

  const entry = accumulator.ideMap.get(ide)!;
  entry.users.add(userId);
  entry.totalEngagements += ideTotal.user_initiated_interaction_count;
  accumulateAggMetricTotals(entry, {
    code_generation_activity_count: ideTotal.code_generation_activity_count,
    code_acceptance_activity_count: ideTotal.code_acceptance_activity_count,
    loc_added_sum: ideTotal.loc_added_sum,
    loc_deleted_sum: ideTotal.loc_deleted_sum,
    loc_suggested_to_add_sum: ideTotal.loc_suggested_to_add_sum,
    loc_suggested_to_delete_sum: ideTotal.loc_suggested_to_delete_sum,
  });

  if (!accumulator.userIDEs.has(userId)) {
    accumulator.userIDEs.set(userId, new Set());
  }
  accumulator.userIDEs.get(userId)!.add(ide);
}

export function markCliUser(accumulator: IDEStatsAccumulator, userId: number): void {
  accumulator.cliUserIds.add(userId);
}

export function computeIDEStatsData(
  accumulator: IDEStatsAccumulator
): { ideStats: IDEStatsData[]; multiIDEUsersCount: number; totalUniqueIDEUsers: number } {
  const ideStats: IDEStatsData[] = Array.from(accumulator.ideMap.entries()).map(
    ([ide, entry]) => {
      let cliOverlapUsers = 0;
      for (const uid of entry.users) {
        if (accumulator.cliUserIds.has(uid)) cliOverlapUsers++;
      }
      return {
        ide,
        uniqueUsers: entry.users.size,
        cliOverlapUsers,
        totalEngagements: entry.totalEngagements,
        totalGenerations: entry.code_generation_activity_count,
        totalAcceptances: entry.code_acceptance_activity_count,
        locAdded: entry.loc_added_sum,
        locDeleted: entry.loc_deleted_sum,
        locSuggestedToAdd: entry.loc_suggested_to_add_sum,
        locSuggestedToDelete: entry.loc_suggested_to_delete_sum,
      };
    }
  );

  const multiIDEUsersCount = Array.from(accumulator.userIDEs.values()).filter(
    (ides) => ides.size > 1
  ).length;

  const totalUniqueIDEUsers = accumulator.userIDEs.size;

  return { ideStats, multiIDEUsersCount, totalUniqueIDEUsers };
}
