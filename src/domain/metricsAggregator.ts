import type { CopilotMetrics } from '../types/metrics';
import type { AggregatedMetrics } from '../types/aggregatedMetrics';
import { resolveCopilotCloudAgentUsage } from './copilotCloudAgentUsage';
import {
  accumulateCoreStatsAggregation,
  createCoreStatsAggregationAccumulator,
  finalizeCoreStatsAggregation,
  getStatsAccumulatorForDimensions,
} from './aggregation/coreStatsAggregation';
import {
  accumulateUserSummaryAggregation,
  createUserSummaryAggregationAccumulator,
  finalizeUserSummaryAggregation,
} from './aggregation/userSummaryAggregation';
import {
  accumulateUserDetailAggregation,
  createUserDetailAggregationAccumulator,
  finalizeUserDetailAggregation,
  type UserDetailAccumulator,
} from './aggregation/userDetailAggregation';
import {
  accumulateClientAggregation,
  createClientAggregationAccumulator,
  finalizeClientAggregation,
} from './aggregation/clientAggregation';
import {
  accumulateCliAggregation,
  createCliAggregationAccumulator,
  finalizeCliAggregation,
  getCliUsageForDownstreamCalculations,
} from './aggregation/cliAggregation';
import {
  accumulateLanguageAggregation,
  createLanguageAggregationAccumulator,
  finalizeLanguageAggregation,
} from './aggregation/languageAggregation';
import {
  accumulateModelAggregation,
  accumulateModelFeatureSignals,
  createModelAggregationAccumulator,
  finalizeModelAggregation,
} from './aggregation/modelAggregation';
import {
  accumulateEngagementAdoptionAggregation,
  createEngagementAdoptionAggregationAccumulator,
  finalizeEngagementAdoptionAggregation,
} from './aggregation/engagementAdoptionAggregation';
import {
  accumulateImpactAggregation,
  createImpactAggregationAccumulator,
  finalizeImpactAggregation,
} from './aggregation/impactAggregation';
import {
  accumulateAiAggregation,
  createAiAggregationAccumulator,
  finalizeAiAggregation,
} from './aggregation/aiAggregation';
export function aggregateMetrics(
  metrics: CopilotMetrics[]
): { aggregated: AggregatedMetrics; userDetailAccumulator: UserDetailAccumulator } {
  const coreStatsAggregationAccumulator =
    createCoreStatsAggregationAccumulator();
  const statsAccumulator = getStatsAccumulatorForDimensions(
    coreStatsAggregationAccumulator
  );
  const userSummaryAggregationAccumulator =
    createUserSummaryAggregationAccumulator();
  const engagementAdoptionAggregationAccumulator =
    createEngagementAdoptionAggregationAccumulator();
  const clientAggregationAccumulator = createClientAggregationAccumulator();
  const cliAggregationAccumulator = createCliAggregationAccumulator();
  const languageAggregationAccumulator = createLanguageAggregationAccumulator();
  const modelAggregationAccumulator = createModelAggregationAccumulator();
  const impactAggregationAccumulator = createImpactAggregationAccumulator();
  const aiAggregationAccumulator = createAiAggregationAccumulator();
  const userDetailAggregationAccumulator =
    createUserDetailAggregationAccumulator();

  for (const metric of metrics) {
    const usedCopilotCloudAgent = resolveCopilotCloudAgentUsage(metric);

    accumulateCoreStatsAggregation(
      coreStatsAggregationAccumulator,
      metric,
      usedCopilotCloudAgent
    );
    accumulateUserSummaryAggregation(
      userSummaryAggregationAccumulator,
      metric,
      usedCopilotCloudAgent
    );
    accumulateUserDetailAggregation(
      userDetailAggregationAccumulator,
      metric,
      usedCopilotCloudAgent
    );
    accumulateAiAggregation(aiAggregationAccumulator, metric);
    accumulateEngagementAdoptionAggregation(
      engagementAdoptionAggregationAccumulator,
      metric,
      usedCopilotCloudAgent
    );
    accumulateImpactAggregation(impactAggregationAccumulator, metric);
    accumulateClientAggregation(
      clientAggregationAccumulator,
      statsAccumulator,
      metric
    );
    accumulateCliAggregation(cliAggregationAccumulator, metric);

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
    accumulateModelFeatureSignals(modelAggregationAccumulator, metric);
  }
  const coreStatsAggregation = finalizeCoreStatsAggregation(
    coreStatsAggregationAccumulator
  );
  const userSummaryAggregation = finalizeUserSummaryAggregation(
    userSummaryAggregationAccumulator
  );
  const userDetailAccumulator = finalizeUserDetailAggregation(
    userDetailAggregationAccumulator
  );
  const languageAggregation = finalizeLanguageAggregation(
    languageAggregationAccumulator
  );
  const modelAggregation = finalizeModelAggregation(modelAggregationAccumulator);
  const clientAggregation = finalizeClientAggregation(
    clientAggregationAccumulator
  );
  const cliAggregation = finalizeCliAggregation(cliAggregationAccumulator);
  const cliUsage = getCliUsageForDownstreamCalculations(
    cliAggregationAccumulator
  );
  const engagementAdoptionAggregation =
    finalizeEngagementAdoptionAggregation(
      engagementAdoptionAggregationAccumulator,
      cliUsage
    );
  const impactAggregation = finalizeImpactAggregation(
    impactAggregationAccumulator
  );
  const aiAggregation = finalizeAiAggregation(aiAggregationAccumulator);

  return {
    aggregated: {
      stats: coreStatsAggregation.stats,
      userSummaries: userSummaryAggregation.userSummaries,
      engagementData: engagementAdoptionAggregation.engagementData,
      chatUsersData: engagementAdoptionAggregation.chatUsersData,
      chatRequestsData: engagementAdoptionAggregation.chatRequestsData,
      languageStats: languageAggregation.languageStats,
      modelUsageData: modelAggregation.modelUsageData,
      featureAdoptionData: engagementAdoptionAggregation.featureAdoptionData,
      agentModeHeatmapData: modelAggregation.agentModeHeatmapData,
      agentImpactData: impactAggregation.agentImpactData,
      codeCompletionImpactData: impactAggregation.codeCompletionImpactData,
      editModeImpactData: impactAggregation.editModeImpactData,
      inlineModeImpactData: impactAggregation.inlineModeImpactData,
      askModeImpactData: impactAggregation.askModeImpactData,
      cliImpactData: impactAggregation.cliImpactData,
      joinedImpactData: impactAggregation.joinedImpactData,
      ideStats: clientAggregation.ideStats,
      multiIDEUsersCount: clientAggregation.multiIDEUsersCount,
      totalUniqueIDEUsers: clientAggregation.totalUniqueIDEUsers,
      pluginVersionData: clientAggregation.pluginVersionData,
      languageFeatureImpactData: languageAggregation.languageFeatureImpactData,
      dailyLanguageGenerationsData:
        languageAggregation.dailyLanguageGenerationsData,
      dailyLanguageLocData: languageAggregation.dailyLanguageLocData,
      modelBreakdownData: modelAggregation.modelBreakdownData,
      dailyCliSessionData: cliAggregation.dailyCliSessionData,
      dailyCliTokenData: cliAggregation.dailyCliTokenData,
      dailyCliAdoptionTrend: cliAggregation.dailyCliAdoptionTrend,
      dailyAdoptionTrend: engagementAdoptionAggregation.dailyAdoptionTrend,
      dailyCloudAgentAdoptionData:
        engagementAdoptionAggregation.dailyCloudAgentAdoptionData,
      dailyCodeReviewAdoptionData:
        engagementAdoptionAggregation.dailyCodeReviewAdoptionData,
      aiAdoptionPhaseData: aiAggregation.aiAdoptionPhaseData,
      usageDistributionData: aiAggregation.usageDistributionData,
      dailyAiCreditsData: aiAggregation.dailyAiCreditsData,
    },
    userDetailAccumulator,
  };
}
