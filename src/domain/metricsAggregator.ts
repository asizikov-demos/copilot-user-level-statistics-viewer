import {
  CopilotMetrics,
  UserSummary,
} from '../types/metrics';
import type { AggregatedMetrics } from '../types/aggregatedMetrics';
import { resolveCopilotCloudAgentUsage } from './copilotCloudAgentUsage';
import {
  accumulateLanguageAggregation,
  createLanguageAggregationAccumulator,
  finalizeLanguageAggregation,
} from './aggregation/languageAggregation';
import {
  accumulateModelAggregation,
  createModelAggregationAccumulator,
  finalizeModelAggregation,
} from './aggregation/modelAggregation';
import {
  createStatsAccumulator,
  accumulateUserUsage,
  accumulateIdeUser,
  computeStats,

  createEngagementAccumulator,
  accumulateEngagement,
  computeEngagementData,
  computeAdoptionTrend,

  createChatAccumulator,
  accumulateChatFeature,
  computeChatUsersData,
  computeChatRequestsData,

  createFeatureAdoptionAccumulator,
  accumulateFeatureAdoption,
  accumulateCliAdoption,
  accumulateCodingAgentAdoption,
  accumulateCodeReviewAdoption,
  computeFeatureAdoptionData,

  type FeatureImpactInput,
  createImpactAccumulator,
  ensureImpactDates,
  createFeatureImpactInput,
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
  markCliUser,
  computeIDEStatsData,

  createPluginVersionAccumulator,
  accumulatePluginVersion,
  computePluginVersionData,

  type UserDetailAccumulator,
  createUserDetailAccumulator,
  accumulateUserDetail,

  createCliUsageAccumulator,
  accumulateCliUsage,
  ensureCliDates,
  computeDailyCliSessionData,
  computeDailyCliTokenData,
  computeCliAdoptionTrend,

  createAdvancedAdoptionAccumulator,
  accumulateCloudAgentAdoption,
  accumulateCodeReviewAdoptionSignal,
  computeDailyCloudAgentAdoptionData,
  computeDailyCodeReviewAdoptionData,

  createAiAdoptionPhaseAccumulator,
  accumulateAiAdoptionPhase,
  computeAiAdoptionPhaseData,

  computeUsageDistributionData,

  createAiCreditsAccumulator,
  accumulateAiCredits,
  computeDailyAiCreditsData,
} from './calculators';
import { isActiveAutoModeFeature } from './autoMode';

interface UserSummaryAccumulator {
  userMap: Map<number, UserSummary>;
  userActiveDays: Map<number, Set<string>>;
  userCloudAgentDays: Map<number, Set<string>>;
  userCodeReviewDays: Map<number, Set<string>>;
  userClientInteractions: Map<number, Map<string, number>>;
  userAiAdoptionPhaseDays: Map<number, string>;
}

function createUserSummaryAccumulator(): UserSummaryAccumulator {
  return {
    userMap: new Map(),
    userActiveDays: new Map(),
    userCloudAgentDays: new Map(),
    userCodeReviewDays: new Map(),
    userClientInteractions: new Map(),
    userAiAdoptionPhaseDays: new Map(),
  };
}

function hasAutoModeActivity(metric: CopilotMetrics): boolean {
  return metric.totals_by_model_feature.some(isActiveAutoModeFeature);
}

function addClientInteractions(
  clientInteractions: Map<string, number>,
  client: string | undefined,
  interactions: number
): void {
  const normalizedClient = client?.trim();
  if (!normalizedClient || interactions <= 0) return;
  clientInteractions.set(
    normalizedClient,
    (clientInteractions.get(normalizedClient) ?? 0) + interactions
  );
}

function accumulateUserSummary(
  accumulator: UserSummaryAccumulator,
  metric: CopilotMetrics,
  usedCopilotCloudAgent: boolean
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
      total_ai_credits_used: 0,
      net_loc_contribution: 0,
      days_active: 0,
      cloud_agent_days: 0,
      code_review_days: 0,
      top_client: null,
      used_agent: false,
      used_chat: false,
      used_cli: false,
      used_copilot_coding_agent: false,
      used_copilot_code_review_active: false,
      used_copilot_code_review_passive: false,
      used_auto_mode: false,
    });
    accumulator.userActiveDays.set(userId, new Set());
    accumulator.userCloudAgentDays.set(userId, new Set());
    accumulator.userCodeReviewDays.set(userId, new Set());
    accumulator.userClientInteractions.set(userId, new Map());
  }

  const userSummary = accumulator.userMap.get(userId)!;
  userSummary.total_user_initiated_interactions += metric.user_initiated_interaction_count;
  userSummary.total_code_generation_activities += metric.code_generation_activity_count;
  userSummary.total_code_acceptance_activities += metric.code_acceptance_activity_count;
  userSummary.total_loc_added += metric.loc_added_sum;
  userSummary.total_loc_deleted += metric.loc_deleted_sum;
  userSummary.total_loc_suggested_to_add += metric.loc_suggested_to_add_sum;
  userSummary.total_loc_suggested_to_delete += metric.loc_suggested_to_delete_sum;
  userSummary.total_ai_credits_used += metric.ai_credits_used;
  userSummary.used_agent = userSummary.used_agent || metric.used_agent;
  userSummary.used_chat = userSummary.used_chat || metric.used_chat;
  userSummary.used_cli = userSummary.used_cli || metric.used_cli;
  userSummary.used_copilot_coding_agent = userSummary.used_copilot_coding_agent || usedCopilotCloudAgent;
  userSummary.used_copilot_code_review_active = userSummary.used_copilot_code_review_active || (metric.used_copilot_code_review_active ?? false);
  userSummary.used_copilot_code_review_passive = userSummary.used_copilot_code_review_passive || (metric.used_copilot_code_review_passive ?? false);
  userSummary.used_auto_mode = userSummary.used_auto_mode || hasAutoModeActivity(metric);
  if (usedCopilotCloudAgent) {
    accumulator.userCloudAgentDays.get(userId)!.add(date);
  }
  if ((metric.used_copilot_code_review_active ?? false) || (metric.used_copilot_code_review_passive ?? false)) {
    accumulator.userCodeReviewDays.get(userId)!.add(date);
  }
  const userClientInteractions = accumulator.userClientInteractions.get(userId)!;
  for (const ideTotal of metric.totals_by_ide) {
    addClientInteractions(
      userClientInteractions,
      ideTotal.ide,
      ideTotal.user_initiated_interaction_count || 0
    );
  }
  if (metric.totals_by_cli || metric.used_cli) {
    addClientInteractions(
      userClientInteractions,
      'copilot_cli',
      metric.totals_by_cli?.prompt_count ?? (metric.used_cli ? 1 : 0)
    );
  }
  if (metric.ai_adoption_phase) {
    const latestPhaseDay = accumulator.userAiAdoptionPhaseDays.get(userId);
    if (!latestPhaseDay || metric.day >= latestPhaseDay) {
      userSummary.ai_adoption_phase = { ...metric.ai_adoption_phase };
      accumulator.userAiAdoptionPhaseDays.set(userId, metric.day);
    }
  }
  accumulator.userActiveDays.get(userId)!.add(date);
}

function getTopClient(clientInteractions: Map<string, number> | undefined): string | null {
  let topClient: string | null = null;
  let topInteractions = 0;

  for (const [client, interactions] of clientInteractions ?? []) {
    if (
      interactions > topInteractions ||
      (interactions === topInteractions && topClient !== null && client.localeCompare(topClient) < 0)
    ) {
      topClient = client;
      topInteractions = interactions;
    }
  }

  return topClient;
}

function computeUserSummaries(accumulator: UserSummaryAccumulator): UserSummary[] {
  return Array.from(accumulator.userMap.values())
    .map(user => ({
      ...user,
      days_active: accumulator.userActiveDays.get(user.user_id)?.size || 0,
      cloud_agent_days: accumulator.userCloudAgentDays.get(user.user_id)?.size || 0,
      code_review_days: accumulator.userCodeReviewDays.get(user.user_id)?.size || 0,
      top_client: getTopClient(accumulator.userClientInteractions.get(user.user_id)),
      net_loc_contribution: user.total_loc_added - user.total_loc_deleted,
    }))
    .sort((a, b) => b.total_user_initiated_interactions - a.total_user_initiated_interactions);
}

export function aggregateMetrics(
  metrics: CopilotMetrics[]
): { aggregated: AggregatedMetrics; userDetailAccumulator: UserDetailAccumulator } {
  let filteredMetricsCount = 0;

  const statsAccumulator = createStatsAccumulator();
  const userSummaryAccumulator = createUserSummaryAccumulator();
  const engagementAccumulator = createEngagementAccumulator();
  const chatAccumulator = createChatAccumulator();
  const languageAggregationAccumulator = createLanguageAggregationAccumulator();
  const modelAggregationAccumulator = createModelAggregationAccumulator();
  const featureAdoptionAccumulator = createFeatureAdoptionAccumulator();
  const impactAccumulator = createImpactAccumulator();
  const ideStatsAccumulator = createIDEStatsAccumulator();
  const pluginVersionAccumulator = createPluginVersionAccumulator();
  const cliUsageAccumulator = createCliUsageAccumulator();
  const advancedAdoptionAccumulator = createAdvancedAdoptionAccumulator();
  const aiAdoptionPhaseAccumulator = createAiAdoptionPhaseAccumulator();
  const aiCreditsAccumulator = createAiCreditsAccumulator();
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
    const usedCopilotCloudAgent = resolveCopilotCloudAgentUsage(metric);

    accumulateUserSummary(userSummaryAccumulator, metric, usedCopilotCloudAgent);
    accumulateAiAdoptionPhase(aiAdoptionPhaseAccumulator, metric);
    accumulateAiCredits(aiCreditsAccumulator, metric);
    accumulateUserDetail(userDetailAccumulator, metric);

    accumulateUserUsage(statsAccumulator, userId, metric.used_chat, metric.used_agent, metric.used_cli, usedCopilotCloudAgent);

    accumulateEngagement(engagementAccumulator, date, userId);

    ensureImpactDates(impactAccumulator, date);
    ensureCliDates(cliUsageAccumulator, date);

    for (const ideTotal of metric.totals_by_ide) {
      accumulateIdeUser(statsAccumulator, ideTotal.ide, userId);
      accumulateIDEStats(ideStatsAccumulator, userId, ideTotal);
      accumulatePluginVersion(pluginVersionAccumulator, metric.user_login, ideTotal);
    }

    if (metric.used_cli) {
      markCliUser(ideStatsAccumulator, userId);
    }

    accumulateLanguageAggregation(
      languageAggregationAccumulator,
      statsAccumulator,
      metric
    );
    accumulateModelAggregation(
      modelAggregationAccumulator,
      statsAccumulator,
      metric
    );

    const featureImpacts: FeatureImpactInput[] = [];

    accumulateCliAdoption(featureAdoptionAccumulator, userId, metric.used_cli);
    accumulateCodingAgentAdoption(featureAdoptionAccumulator, userId, usedCopilotCloudAgent);
    accumulateCodeReviewAdoption(
      featureAdoptionAccumulator,
      userId,
      (metric.used_copilot_code_review_active ?? false) || (metric.used_copilot_code_review_passive ?? false)
    );
    accumulateCloudAgentAdoption(advancedAdoptionAccumulator, date, userId, usedCopilotCloudAgent);
    accumulateCodeReviewAdoptionSignal(
      advancedAdoptionAccumulator,
      date,
      userId,
      metric.used_copilot_code_review_active ?? false,
      metric.used_copilot_code_review_passive ?? false
    );
    accumulateCliUsage(cliUsageAccumulator, date, userId, metric);

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

      featureImpacts.push(createFeatureImpactInput(feature));
    }

    accumulateFeatureImpacts(impactAccumulator, date, userId, featureImpacts);
  }
  const userSummaries = computeUserSummaries(userSummaryAccumulator);
  const languageAggregation = finalizeLanguageAggregation(
    languageAggregationAccumulator
  );
  const modelAggregation = finalizeModelAggregation(modelAggregationAccumulator);

  return {
    aggregated: {
      stats: computeStats(statsAccumulator, filteredMetricsCount),
      userSummaries,
      engagementData: computeEngagementData(engagementAccumulator, cliUsageAccumulator),
      chatUsersData: computeChatUsersData(chatAccumulator, cliUsageAccumulator),
      chatRequestsData: computeChatRequestsData(chatAccumulator, cliUsageAccumulator),
      languageStats: languageAggregation.languageStats,
      modelUsageData: modelAggregation.modelUsageData,
      featureAdoptionData: computeFeatureAdoptionData(featureAdoptionAccumulator),
      agentModeHeatmapData: modelAggregation.agentModeHeatmapData,
      agentImpactData: computeAgentImpactData(impactAccumulator),
      codeCompletionImpactData: computeCodeCompletionImpactData(impactAccumulator),
      editModeImpactData: computeEditModeImpactData(impactAccumulator),
      inlineModeImpactData: computeInlineModeImpactData(impactAccumulator),
      askModeImpactData: computeAskModeImpactData(impactAccumulator),
      cliImpactData: computeCliImpactData(impactAccumulator),
      joinedImpactData: computeJoinedImpactData(impactAccumulator),
      ...computeIDEStatsData(ideStatsAccumulator),
      pluginVersionData: computePluginVersionData(pluginVersionAccumulator),
      languageFeatureImpactData: languageAggregation.languageFeatureImpactData,
      dailyLanguageGenerationsData:
        languageAggregation.dailyLanguageGenerationsData,
      dailyLanguageLocData: languageAggregation.dailyLanguageLocData,
      modelBreakdownData: modelAggregation.modelBreakdownData,
      dailyCliSessionData: computeDailyCliSessionData(cliUsageAccumulator),
      dailyCliTokenData: computeDailyCliTokenData(cliUsageAccumulator),
      dailyCliAdoptionTrend: computeCliAdoptionTrend(cliUsageAccumulator),
      dailyAdoptionTrend: computeAdoptionTrend(engagementAccumulator, cliUsageAccumulator),
      dailyCloudAgentAdoptionData: computeDailyCloudAgentAdoptionData(advancedAdoptionAccumulator),
      dailyCodeReviewAdoptionData: computeDailyCodeReviewAdoptionData(advancedAdoptionAccumulator),
      aiAdoptionPhaseData: computeAiAdoptionPhaseData(aiAdoptionPhaseAccumulator),
      usageDistributionData: computeUsageDistributionData(aiAdoptionPhaseAccumulator),
      dailyAiCreditsData: computeDailyAiCreditsData(aiCreditsAccumulator),
    },
    userDetailAccumulator,
  };
}
