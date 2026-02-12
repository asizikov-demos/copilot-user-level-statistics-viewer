import {
  CopilotMetrics,
  MetricsStats,
  UserSummary,
  IDEStatsData,
  PluginVersionAnalysisData,
  LanguageFeatureImpactData,
  DailyLanguageChartData,
  ModelBreakdownData,
} from '../types/metrics';
import type { UserDetailedMetrics } from '../types/aggregatedMetrics';
import {
  createStatsAccumulator,
  accumulateUserUsage,
  accumulateIdeUser,
  accumulateLanguageEngagement,
  accumulateModelEngagement,
  computeStats,

  DailyEngagementData,
  createEngagementAccumulator,
  accumulateEngagement,
  computeEngagementData,

  DailyChatUsersData,
  DailyChatRequestsData,
  createChatAccumulator,
  accumulateChatFeature,
  computeChatUsersData,
  computeChatRequestsData,

  LanguageStats,
  createLanguageAccumulator,
  accumulateLanguageStats,
  computeLanguageStats,

  DailyModelUsageData,
  DailyPRUAnalysisData,
  AgentModeHeatmapData,
  ModelFeatureDistributionData,
  createModelUsageAccumulator,
  accumulateModelFeature,
  accumulateAgentHeatmapFromFeature,
  computeDailyModelUsageData,
  computePRUAnalysisData,
  computeAgentModeHeatmapData,
  computeModelFeatureDistributionData,

  FeatureAdoptionData,
  createFeatureAdoptionAccumulator,
  accumulateFeatureAdoption,
  computeFeatureAdoptionData,

  AgentImpactData,
  CodeCompletionImpactData,
  ModeImpactData,
  createImpactAccumulator,
  ensureImpactDates,
  accumulateFeatureImpacts,
  computeAgentImpactData,
  computeCodeCompletionImpactData,
  computeEditModeImpactData,
  computeInlineModeImpactData,
  computeAskModeImpactData,
  computeCliImpactData,
  computeJoinedImpactData,

  createIDEStatsAccumulator,
  accumulateIDEStats,
  computeIDEStatsData,

  createPluginVersionAccumulator,
  accumulatePluginVersion,
  computePluginVersionData,

  createLanguageFeatureImpactAccumulator,
  accumulateLanguageFeatureImpact,
  accumulateDailyLanguage,
  computeLanguageFeatureImpactData,
  computeDailyLanguageChartData,

  createModelBreakdownAccumulator,
  accumulateModelBreakdown,
  computeModelBreakdownData,

  createUserDetailAccumulator,
  accumulateUserDetail,
  computeUserDetailedMetrics,
} from './calculators';

export interface AggregatedMetrics {
  stats: MetricsStats;
  userSummaries: UserSummary[];
  engagementData: DailyEngagementData[];
  chatUsersData: DailyChatUsersData[];
  chatRequestsData: DailyChatRequestsData[];
  languageStats: LanguageStats[];
  modelUsageData: DailyModelUsageData[];
  featureAdoptionData: FeatureAdoptionData;
  pruAnalysisData: DailyPRUAnalysisData[];
  agentModeHeatmapData: AgentModeHeatmapData[];
  modelFeatureDistributionData: ModelFeatureDistributionData[];
  agentImpactData: AgentImpactData[];
  codeCompletionImpactData: CodeCompletionImpactData[];
  editModeImpactData: ModeImpactData[];
  inlineModeImpactData: ModeImpactData[];
  askModeImpactData: ModeImpactData[];
  cliImpactData: ModeImpactData[];
  joinedImpactData: ModeImpactData[];
  ideStats: IDEStatsData[];
  multiIDEUsersCount: number;
  totalUniqueIDEUsers: number;
  pluginVersionData: PluginVersionAnalysisData;
  languageFeatureImpactData: LanguageFeatureImpactData;
  dailyLanguageGenerationsData: DailyLanguageChartData;
  dailyLanguageLocData: DailyLanguageChartData;
  modelBreakdownData: ModelBreakdownData;
  userDetailedMetrics: Map<number, UserDetailedMetrics>;
}

interface UserSummaryAccumulator {
  userMap: Map<number, UserSummary>;
  userActiveDays: Map<number, Set<string>>;
}

function createUserSummaryAccumulator(): UserSummaryAccumulator {
  return {
    userMap: new Map(),
    userActiveDays: new Map(),
  };
}

function accumulateUserSummary(
  accumulator: UserSummaryAccumulator,
  metric: CopilotMetrics
): void {
  const userId = metric.user_id;
  const date = metric.day;

  if (!accumulator.userMap.has(userId)) {
    accumulator.userMap.set(userId, {
      user_login: metric.user_login,
      user_id: userId,
      total_user_initiated_interactions: 0,
      total_code_generation_activities: 0,
      total_code_acceptance_activities: 0,
      total_loc_added: 0,
      total_loc_deleted: 0,
      total_loc_suggested_to_add: 0,
      total_loc_suggested_to_delete: 0,
      days_active: 0,
      used_agent: false,
      used_chat: false,
      used_cli: false,
    });
    accumulator.userActiveDays.set(userId, new Set());
  }

  const userSummary = accumulator.userMap.get(userId)!;
  userSummary.total_user_initiated_interactions += metric.user_initiated_interaction_count;
  userSummary.total_code_generation_activities += metric.code_generation_activity_count;
  userSummary.total_code_acceptance_activities += metric.code_acceptance_activity_count;
  userSummary.total_loc_added += metric.loc_added_sum;
  userSummary.total_loc_deleted += metric.loc_deleted_sum;
  userSummary.total_loc_suggested_to_add += metric.loc_suggested_to_add_sum;
  userSummary.total_loc_suggested_to_delete += metric.loc_suggested_to_delete_sum;
  userSummary.used_agent = userSummary.used_agent || metric.used_agent;
  userSummary.used_chat = userSummary.used_chat || metric.used_chat;
  userSummary.used_cli = userSummary.used_cli || metric.used_cli;
  accumulator.userActiveDays.get(userId)!.add(date);
}

function computeUserSummaries(accumulator: UserSummaryAccumulator): UserSummary[] {
  return Array.from(accumulator.userMap.values())
    .map(user => ({
      ...user,
      days_active: accumulator.userActiveDays.get(user.user_id)?.size || 0,
    }))
    .sort((a, b) => b.total_user_initiated_interactions - a.total_user_initiated_interactions);
}

export function aggregateMetrics(
  metrics: CopilotMetrics[]
): AggregatedMetrics {
  let filteredMetricsCount = 0;

  const statsAccumulator = createStatsAccumulator();
  const userSummaryAccumulator = createUserSummaryAccumulator();
  const engagementAccumulator = createEngagementAccumulator();
  const chatAccumulator = createChatAccumulator();
  const languageAccumulator = createLanguageAccumulator();
  const modelUsageAccumulator = createModelUsageAccumulator();
  const featureAdoptionAccumulator = createFeatureAdoptionAccumulator();
  const impactAccumulator = createImpactAccumulator();
  const ideStatsAccumulator = createIDEStatsAccumulator();
  const pluginVersionAccumulator = createPluginVersionAccumulator();
  const languageFeatureImpactAccumulator = createLanguageFeatureImpactAccumulator();
  const modelBreakdownAccumulator = createModelBreakdownAccumulator();
  const userDetailAccumulator = createUserDetailAccumulator();

  for (const metric of metrics) {
    filteredMetricsCount++;

    if (filteredMetricsCount === 1) {
      statsAccumulator.reportStartDay = metric.report_start_day;
      statsAccumulator.reportEndDay = metric.report_end_day;
      userDetailAccumulator.reportStartDay = metric.report_start_day;
      userDetailAccumulator.reportEndDay = metric.report_end_day;
    }

    const date = metric.day;
    const userId = metric.user_id;

    accumulateUserSummary(userSummaryAccumulator, metric);
    accumulateUserDetail(userDetailAccumulator, metric);

    accumulateUserUsage(statsAccumulator, userId, metric.used_chat, metric.used_agent, metric.used_cli);

    accumulateEngagement(engagementAccumulator, date, userId);

    ensureImpactDates(impactAccumulator, date);

    for (const ideTotal of metric.totals_by_ide) {
      accumulateIdeUser(statsAccumulator, ideTotal.ide, userId);
      accumulateIDEStats(ideStatsAccumulator, userId, ideTotal);
      accumulatePluginVersion(pluginVersionAccumulator, metric.user_login, ideTotal);
    }

    for (const langFeature of metric.totals_by_language_feature) {
      const engagements = langFeature.code_generation_activity_count + langFeature.code_acceptance_activity_count;
      accumulateLanguageEngagement(statsAccumulator, langFeature.language, engagements);

      accumulateLanguageStats(
        languageAccumulator,
        userId,
        langFeature.language,
        langFeature.code_generation_activity_count,
        langFeature.code_acceptance_activity_count,
        langFeature.loc_added_sum,
        langFeature.loc_deleted_sum,
        langFeature.loc_suggested_to_add_sum,
        langFeature.loc_suggested_to_delete_sum
      );

      accumulateLanguageFeatureImpact(languageFeatureImpactAccumulator, langFeature);
      accumulateDailyLanguage(languageFeatureImpactAccumulator, date, langFeature);
    }

    for (const modelFeature of metric.totals_by_model_feature) {
      const engagements = modelFeature.code_generation_activity_count + modelFeature.code_acceptance_activity_count;
      accumulateModelEngagement(statsAccumulator, modelFeature.model, engagements);

      accumulateModelFeature(
        modelUsageAccumulator,
        date,
        userId,
        modelFeature.model,
        modelFeature.feature,
        modelFeature.user_initiated_interaction_count
      );

      accumulateModelBreakdown(modelBreakdownAccumulator, date, modelFeature);
    }

    const featureImpacts: Array<{ feature: string; locAdded: number; locDeleted: number }> = [];

    for (const feature of metric.totals_by_feature) {
      accumulateFeatureAdoption(
        featureAdoptionAccumulator,
        userId,
        feature.feature,
        feature.user_initiated_interaction_count,
        feature.code_generation_activity_count
      );

      accumulateChatFeature(
        chatAccumulator,
        date,
        userId,
        feature.feature,
        feature.user_initiated_interaction_count
      );

      accumulateAgentHeatmapFromFeature(
        modelUsageAccumulator,
        date,
        userId,
        feature.feature,
        feature.user_initiated_interaction_count
      );

      featureImpacts.push({
        feature: feature.feature,
        locAdded: feature.loc_added_sum || 0,
        locDeleted: feature.loc_deleted_sum || 0,
      });
    }

    accumulateFeatureImpacts(impactAccumulator, date, userId, featureImpacts);
  }

  return {
    stats: computeStats(statsAccumulator, filteredMetricsCount),
    userSummaries: computeUserSummaries(userSummaryAccumulator),
    engagementData: computeEngagementData(engagementAccumulator),
    chatUsersData: computeChatUsersData(chatAccumulator),
    chatRequestsData: computeChatRequestsData(chatAccumulator),
    languageStats: computeLanguageStats(languageAccumulator),
    modelUsageData: computeDailyModelUsageData(modelUsageAccumulator),
    featureAdoptionData: computeFeatureAdoptionData(featureAdoptionAccumulator),
    pruAnalysisData: computePRUAnalysisData(modelUsageAccumulator),
    agentModeHeatmapData: computeAgentModeHeatmapData(modelUsageAccumulator),
    modelFeatureDistributionData: computeModelFeatureDistributionData(modelUsageAccumulator),
    agentImpactData: computeAgentImpactData(impactAccumulator),
    codeCompletionImpactData: computeCodeCompletionImpactData(impactAccumulator),
    editModeImpactData: computeEditModeImpactData(impactAccumulator),
    inlineModeImpactData: computeInlineModeImpactData(impactAccumulator),
    askModeImpactData: computeAskModeImpactData(impactAccumulator),
    cliImpactData: computeCliImpactData(impactAccumulator),
    joinedImpactData: computeJoinedImpactData(impactAccumulator),
    ...computeIDEStatsData(ideStatsAccumulator),
    pluginVersionData: computePluginVersionData(pluginVersionAccumulator),
    languageFeatureImpactData: computeLanguageFeatureImpactData(languageFeatureImpactAccumulator),
    dailyLanguageGenerationsData: computeDailyLanguageChartData(languageFeatureImpactAccumulator, 'generations'),
    dailyLanguageLocData: computeDailyLanguageChartData(languageFeatureImpactAccumulator, 'loc'),
    modelBreakdownData: computeModelBreakdownData(modelBreakdownAccumulator),
    userDetailedMetrics: computeUserDetailedMetrics(userDetailAccumulator),
  };
}
