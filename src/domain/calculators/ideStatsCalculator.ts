import type { IDEStatsData } from '../../types/metrics';

interface IDEAccumulatorEntry {
  users: Set<number>;
  totalEngagements: number;
  totalGenerations: number;
  totalAcceptances: number;
  locAdded: number;
  locDeleted: number;
  locSuggestedToAdd: number;
  locSuggestedToDelete: number;
}

export interface IDEStatsAccumulator {
  ideMap: Map<string, IDEAccumulatorEntry>;
  userIDEs: Map<number, Set<string>>;
}

export function createIDEStatsAccumulator(): IDEStatsAccumulator {
  return {
    ideMap: new Map(),
    userIDEs: new Map(),
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
      totalGenerations: 0,
      totalAcceptances: 0,
      locAdded: 0,
      locDeleted: 0,
      locSuggestedToAdd: 0,
      locSuggestedToDelete: 0,
    });
  }

  const entry = accumulator.ideMap.get(ide)!;
  entry.users.add(userId);
  entry.totalEngagements += ideTotal.user_initiated_interaction_count;
  entry.totalGenerations += ideTotal.code_generation_activity_count;
  entry.totalAcceptances += ideTotal.code_acceptance_activity_count;
  entry.locAdded += ideTotal.loc_added_sum;
  entry.locDeleted += ideTotal.loc_deleted_sum;
  entry.locSuggestedToAdd += ideTotal.loc_suggested_to_add_sum;
  entry.locSuggestedToDelete += ideTotal.loc_suggested_to_delete_sum;

  if (!accumulator.userIDEs.has(userId)) {
    accumulator.userIDEs.set(userId, new Set());
  }
  accumulator.userIDEs.get(userId)!.add(ide);
}

export function computeIDEStatsData(
  accumulator: IDEStatsAccumulator
): { ideStats: IDEStatsData[]; multiIDEUsersCount: number; totalUniqueIDEUsers: number } {
  const ideStats: IDEStatsData[] = Array.from(accumulator.ideMap.entries()).map(
    ([ide, entry]) => ({
      ide,
      uniqueUsers: entry.users.size,
      totalEngagements: entry.totalEngagements,
      totalGenerations: entry.totalGenerations,
      totalAcceptances: entry.totalAcceptances,
      locAdded: entry.locAdded,
      locDeleted: entry.locDeleted,
      locSuggestedToAdd: entry.locSuggestedToAdd,
      locSuggestedToDelete: entry.locSuggestedToDelete,
    })
  );

  const multiIDEUsersCount = Array.from(accumulator.userIDEs.values()).filter(
    (ides) => ides.size > 1
  ).length;

  const totalUniqueIDEUsers = accumulator.userIDEs.size;

  return { ideStats, multiIDEUsersCount, totalUniqueIDEUsers };
}
