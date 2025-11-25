import { CopilotMetrics, MetricsStats } from '../../types/metrics';

export interface UserUsageStats {
  userUsageMap: Map<number, { used_chat: boolean; used_agent: boolean }>;
  languageEngagements: Map<string, number>;
  ideUsers: Map<string, Set<number>>;
  modelEngagements: Map<string, number>;
}

export interface StatsAccumulator {
  userUsageMap: Map<number, { used_chat: boolean; used_agent: boolean }>;
  languageEngagements: Map<string, number>;
  ideUsers: Map<string, Set<number>>;
  modelEngagements: Map<string, number>;
}

export function createStatsAccumulator(): StatsAccumulator {
  return {
    userUsageMap: new Map(),
    languageEngagements: new Map(),
    ideUsers: new Map(),
    modelEngagements: new Map(),
  };
}

export function accumulateUserUsage(
  accumulator: StatsAccumulator,
  userId: number,
  usedChat: boolean,
  usedAgent: boolean
): void {
  const existing = accumulator.userUsageMap.get(userId) || { used_chat: false, used_agent: false };
  accumulator.userUsageMap.set(userId, {
    used_chat: existing.used_chat || usedChat,
    used_agent: existing.used_agent || usedAgent,
  });
}

export function accumulateIdeUser(
  accumulator: StatsAccumulator,
  ide: string,
  userId: number
): void {
  if (!accumulator.ideUsers.has(ide)) {
    accumulator.ideUsers.set(ide, new Set());
  }
  accumulator.ideUsers.get(ide)!.add(userId);
}

export function accumulateLanguageEngagement(
  accumulator: StatsAccumulator,
  language: string,
  engagements: number
): void {
  const current = accumulator.languageEngagements.get(language) || 0;
  accumulator.languageEngagements.set(language, current + engagements);
}

export function accumulateModelEngagement(
  accumulator: StatsAccumulator,
  model: string,
  engagements: number
): void {
  const current = accumulator.modelEngagements.get(model) || 0;
  accumulator.modelEngagements.set(model, current + engagements);
}

export function computeStats(
  accumulator: StatsAccumulator,
  filteredMetrics: CopilotMetrics[]
): MetricsStats {
  let chatUsersCount = 0;
  let agentUsersCount = 0;
  let completionOnlyUsersCount = 0;

  for (const usage of accumulator.userUsageMap.values()) {
    if (usage.used_chat) chatUsersCount++;
    if (usage.used_agent) agentUsersCount++;
    if (!usage.used_chat && !usage.used_agent) completionOnlyUsersCount++;
  }

  const topLanguageEntry = Array.from(accumulator.languageEngagements.entries())
    .sort((a, b) => b[1] - a[1])[0];
  const topLanguage = topLanguageEntry
    ? { name: topLanguageEntry[0], engagements: topLanguageEntry[1] }
    : { name: 'N/A', engagements: 0 };

  const topIdeEntry = Array.from(accumulator.ideUsers.entries())
    .map(([ide, userSet]) => [ide, userSet.size] as [string, number])
    .sort((a, b) => b[1] - a[1])[0];
  const topIde = topIdeEntry
    ? { name: topIdeEntry[0], entries: topIdeEntry[1] }
    : { name: 'N/A', entries: 0 };

  const topModelEntry = Array.from(accumulator.modelEngagements.entries())
    .sort((a, b) => b[1] - a[1])[0];
  const topModel = topModelEntry
    ? { name: topModelEntry[0], engagements: topModelEntry[1] }
    : { name: 'N/A', engagements: 0 };

  const firstRecord = filteredMetrics[0];

  return {
    uniqueUsers: accumulator.userUsageMap.size,
    chatUsers: chatUsersCount,
    agentUsers: agentUsersCount,
    completionOnlyUsers: completionOnlyUsersCount,
    reportStartDay: firstRecord?.report_start_day || '',
    reportEndDay: firstRecord?.report_end_day || '',
    totalRecords: filteredMetrics.length,
    topLanguage,
    topIde,
    topModel,
  };
}

export function calculateStatsFromMetrics(
  metrics: CopilotMetrics[],
  options?: { filterLanguage?: (language: string) => boolean }
): MetricsStats {
  if (metrics.length === 0) {
    return {
      uniqueUsers: 0,
      chatUsers: 0,
      agentUsers: 0,
      completionOnlyUsers: 0,
      reportStartDay: '',
      reportEndDay: '',
      totalRecords: 0,
      topLanguage: { name: 'N/A', engagements: 0 },
      topIde: { name: 'N/A', entries: 0 },
      topModel: { name: 'N/A', engagements: 0 },
    };
  }

  const accumulator = createStatsAccumulator();
  const filterLanguage = options?.filterLanguage;

  for (const metric of metrics) {
    accumulateUserUsage(accumulator, metric.user_id, metric.used_chat, metric.used_agent);

    for (const ideTotal of metric.totals_by_ide) {
      accumulateIdeUser(accumulator, ideTotal.ide, metric.user_id);
    }

    for (const langFeature of metric.totals_by_language_feature) {
      if (filterLanguage && filterLanguage(langFeature.language)) {
        continue;
      }
      const engagements = langFeature.code_generation_activity_count + langFeature.code_acceptance_activity_count;
      accumulateLanguageEngagement(accumulator, langFeature.language, engagements);
    }

    for (const modelFeature of metric.totals_by_model_feature) {
      const engagements = modelFeature.code_generation_activity_count + modelFeature.code_acceptance_activity_count;
      accumulateModelEngagement(accumulator, modelFeature.model, engagements);
    }
  }

  return computeStats(accumulator, metrics);
}
