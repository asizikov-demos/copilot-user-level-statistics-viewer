export interface LanguageStats {
  language: string;
  totalGenerations: number;
  totalAcceptances: number;
  totalEngagements: number;
  uniqueUsers: number;
  generationsPerUser: number | null;
  generationShare: number | null;
  locAdded: number;
  locDeleted: number;
  locSuggestedToAdd: number;
  locSuggestedToDelete: number;
}

export interface LanguageAccumulator {
  languageStatsMap: Map<string, {
    totalGenerations: number;
    totalAcceptances: number;
    locAdded: number;
    locDeleted: number;
    locSuggestedToAdd: number;
    locSuggestedToDelete: number;
    users: Set<number>;
  }>;
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
      totalGenerations: 0,
      totalAcceptances: 0,
      locAdded: 0,
      locDeleted: 0,
      locSuggestedToAdd: 0,
      locSuggestedToDelete: 0,
      users: new Set(),
    });
  }

  const stats = accumulator.languageStatsMap.get(language)!;
  stats.totalGenerations += generations;
  stats.totalAcceptances += acceptances;
  stats.locAdded += locAdded;
  stats.locDeleted += locDeleted;
  stats.locSuggestedToAdd += locSuggestedToAdd;
  stats.locSuggestedToDelete += locSuggestedToDelete;
  stats.users.add(userId);
}

export function computeLanguageStats(accumulator: LanguageAccumulator): LanguageStats[] {
  const totalLanguageGenerations = Array.from(accumulator.languageStatsMap.values())
    .reduce((total, stats) => total + stats.totalGenerations, 0);

  return Array.from(accumulator.languageStatsMap.entries())
    .map(([language, stats]) => ({
      language,
      totalGenerations: stats.totalGenerations,
      totalAcceptances: stats.totalAcceptances,
      totalEngagements: stats.totalGenerations + stats.totalAcceptances,
      uniqueUsers: stats.users.size,
      generationsPerUser: stats.users.size > 0 ? stats.totalGenerations / stats.users.size : null,
      generationShare: totalLanguageGenerations > 0 ? stats.totalGenerations / totalLanguageGenerations : null,
      locAdded: stats.locAdded,
      locDeleted: stats.locDeleted,
      locSuggestedToAdd: stats.locSuggestedToAdd,
      locSuggestedToDelete: stats.locSuggestedToDelete,
    }))
    .sort((a, b) => b.totalEngagements - a.totalEngagements);
}
