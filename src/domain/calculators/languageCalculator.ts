import { type AggMetricTotals, accumulateAggMetricTotals } from './aggMetricTotals';

export interface LanguageStats {
  language: string;
  totalGenerations: number;
  totalAcceptances: number;
  totalEngagements: number;
  uniqueUsers: number;
  locAdded: number;
  locDeleted: number;
  locSuggestedToAdd: number;
  locSuggestedToDelete: number;
}

interface LanguageAccumulatorEntry extends AggMetricTotals {
  users: Set<number>;
}

export interface LanguageAccumulator {
  languageStatsMap: Map<string, LanguageAccumulatorEntry>;
}

export function createLanguageAccumulator(): LanguageAccumulator {
  return {
    languageStatsMap: new Map(),
  };
}

export function accumulateLanguageStats(
  accumulator: LanguageAccumulator,
  userId: number,
  language: string,
  generations: number,
  acceptances: number,
  locAdded: number,
  locDeleted: number,
  locSuggestedToAdd: number,
  locSuggestedToDelete: number
): void {
  if (!accumulator.languageStatsMap.has(language)) {
    accumulator.languageStatsMap.set(language, {
      code_generation_activity_count: 0,
      code_acceptance_activity_count: 0,
      loc_added_sum: 0,
      loc_deleted_sum: 0,
      loc_suggested_to_add_sum: 0,
      loc_suggested_to_delete_sum: 0,
      users: new Set(),
    });
  }

  const stats = accumulator.languageStatsMap.get(language)!;
  accumulateAggMetricTotals(stats, {
    code_generation_activity_count: generations,
    code_acceptance_activity_count: acceptances,
    loc_added_sum: locAdded,
    loc_deleted_sum: locDeleted,
    loc_suggested_to_add_sum: locSuggestedToAdd,
    loc_suggested_to_delete_sum: locSuggestedToDelete,
  });
  stats.users.add(userId);
}

export function computeLanguageStats(accumulator: LanguageAccumulator): LanguageStats[] {
  return Array.from(accumulator.languageStatsMap.entries())
    .map(([language, stats]) => ({
      language,
      totalGenerations: stats.code_generation_activity_count,
      totalAcceptances: stats.code_acceptance_activity_count,
      totalEngagements: stats.code_generation_activity_count + stats.code_acceptance_activity_count,
      uniqueUsers: stats.users.size,
      locAdded: stats.loc_added_sum,
      locDeleted: stats.loc_deleted_sum,
      locSuggestedToAdd: stats.loc_suggested_to_add_sum,
      locSuggestedToDelete: stats.loc_suggested_to_delete_sum,
    }))
    .sort((a, b) => b.totalEngagements - a.totalEngagements);
}
