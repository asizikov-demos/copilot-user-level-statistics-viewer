import type { CopilotMetrics } from '../types/metrics';
import type { AggregatedMetrics } from '../types/aggregatedMetrics';
import { resolveCopilotCloudAgentUsage } from './copilotCloudAgentUsage';
import {
  accumulateCoreStatsAggregation,
  createCoreStatsAggregationAccumulator,
  finalizeCoreStatsAggregation,
  getStatsAccumulatorForDimensions,
  type CoreStatsAggregationResult,
} from './aggregation/coreStatsAggregation';
import {
  accumulateUserSummaryAggregation,
  createUserSummaryAggregationAccumulator,
  finalizeUserSummaryAggregation,
  type UserSummaryAggregationResult,
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
  type ClientAggregationResult,
} from './aggregation/clientAggregation';
import {
  accumulateCliAggregation,
  createCliAggregationAccumulator,
  finalizeCliAggregation,
  getCliUsageForDownstreamCalculations,
  type CliAggregationResult,
} from './aggregation/cliAggregation';
import {
  accumulateLanguageAggregation,
  createLanguageAggregationAccumulator,
  finalizeLanguageAggregation,
  type LanguageAggregationResult,
} from './aggregation/languageAggregation';
import {
  accumulateModelAggregation,
  accumulateModelFeatureSignals,
  createModelAggregationAccumulator,
  finalizeModelAggregation,
  type ModelAggregationResult,
} from './aggregation/modelAggregation';
import {
  accumulateEngagementAdoptionAggregation,
  createEngagementAdoptionAggregationAccumulator,
  finalizeEngagementAdoptionAggregation,
  type EngagementAdoptionAggregationResult,
} from './aggregation/engagementAdoptionAggregation';
import {
  accumulateImpactAggregation,
  createImpactAggregationAccumulator,
  finalizeImpactAggregation,
  type ImpactAggregationResult,
} from './aggregation/impactAggregation';
import {
  accumulateAiAggregation,
  createAiAggregationAccumulator,
  finalizeAiAggregation,
  type AiAggregationResult,
} from './aggregation/aiAggregation';

interface FinalizedAggregationResults {
  coreStatsAggregation: CoreStatsAggregationResult;
  userSummaryAggregation: UserSummaryAggregationResult;
  engagementAdoptionAggregation: EngagementAdoptionAggregationResult;
  impactAggregation: ImpactAggregationResult;
  languageAggregation: LanguageAggregationResult;
  clientAggregation: ClientAggregationResult;
  modelAggregation: ModelAggregationResult;
  cliAggregation: CliAggregationResult;
  aiAggregation: AiAggregationResult;
}

export function assembleAggregatedMetrics({
  coreStatsAggregation,
  userSummaryAggregation,
  engagementAdoptionAggregation,
  impactAggregation,
  languageAggregation,
  clientAggregation,
  modelAggregation,
  cliAggregation,
  aiAggregation,
}: FinalizedAggregationResults): AggregatedMetrics {
  return {
    overview: {
      stats: coreStatsAggregation.stats,
      engagementData: engagementAdoptionAggregation.engagementData,
      chatUsersData: engagementAdoptionAggregation.chatUsersData,
      chatRequestsData: engagementAdoptionAggregation.chatRequestsData,
    },
    users: userSummaryAggregation,
    adoption: {
      featureAdoptionData: engagementAdoptionAggregation.featureAdoptionData,
      agentModeHeatmapData: modelAggregation.agentModeHeatmapData,
      dailyAdoptionTrend: engagementAdoptionAggregation.dailyAdoptionTrend,
      dailyCloudAgentAdoptionData:
        engagementAdoptionAggregation.dailyCloudAgentAdoptionData,
      dailyCodeReviewAdoptionData:
        engagementAdoptionAggregation.dailyCodeReviewAdoptionData,
    },
    impact: impactAggregation,
    languages: languageAggregation,
    clients: clientAggregation,
    models: {
      modelUsageData: modelAggregation.modelUsageData,
      modelBreakdownData: modelAggregation.modelBreakdownData,
    },
    cli: cliAggregation,
    ai: aiAggregation,
  };
}

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
    aggregated: assembleAggregatedMetrics({
      coreStatsAggregation,
      userSummaryAggregation,
      engagementAdoptionAggregation,
      impactAggregation,
      languageAggregation,
      clientAggregation,
      modelAggregation,
      cliAggregation,
      aiAggregation,
    }),
    userDetailAccumulator,
  };
}
