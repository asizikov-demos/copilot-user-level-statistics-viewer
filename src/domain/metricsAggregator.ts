import type { CopilotMetrics } from '../types/metrics';
import type { AggregatedMetrics } from '../types/aggregatedMetrics';
import {
  accumulateCopilotAppAggregation,
  createCopilotAppAggregationAccumulator,
  finalizeCopilotAppAggregation,
} from './aggregation/copilotAppAggregation';
import { getIDEMetadata } from '../utils/ideMetadata';
import { resolveCopilotCloudAgentUsage } from './copilotCloudAgentUsage';
import { extractEnterpriseNameFromLogin } from './enterpriseName';
import { computeExecutiveSummary } from './calculators/executiveSummaryCalculator';
import { computeClientReach } from './calculators/clientReachCalculator';
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
  accumulateCustomizationsAggregation,
  createCustomizationsAggregationAccumulator,
  finalizeCustomizationsAggregation,
  type CustomizationsAggregationResult,
} from './aggregation/customizationsAggregation';
import {
  accumulateLanguageAggregation,
  createLanguageAggregationAccumulator,
  finalizeLanguageAggregation,
  type LanguageAggregationResult,
} from './aggregation/languageAggregation';
import {
  accumulateModelAggregation,
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
import {
  accumulateSurfaceProductivityAggregation,
  createSurfaceProductivityAggregationAccumulator,
  finalizeSurfaceProductivityAggregation,
  type SurfaceProductivityAggregationResult,
} from './aggregation/surfaceProductivityAggregation';

interface FinalizedAggregationResults {
  coreStatsAggregation: CoreStatsAggregationResult;
  userSummaryAggregation: UserSummaryAggregationResult;
  engagementAdoptionAggregation: EngagementAdoptionAggregationResult;
  impactAggregation: ImpactAggregationResult;
  languageAggregation: LanguageAggregationResult;
  clientAggregation: ClientAggregationResult;
  modelAggregation: ModelAggregationResult;
  cliAggregation: CliAggregationResult;
  copilotAppAggregation: AggregatedMetrics['copilotApp'];
  customizationsAggregation: CustomizationsAggregationResult;
  aiAggregation: AiAggregationResult;
  surfaceProductivityAggregation: SurfaceProductivityAggregationResult;
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
  copilotAppAggregation,
  customizationsAggregation,
  aiAggregation,
  surfaceProductivityAggregation,
}: FinalizedAggregationResults): AggregatedMetrics {
  return {
    overview: {
      stats: coreStatsAggregation.stats,
      engagementData: engagementAdoptionAggregation.engagementData,
      chatUsersData: engagementAdoptionAggregation.chatUsersData,
      chatRequestsData: engagementAdoptionAggregation.chatRequestsData,
      executiveSummary: computeExecutiveSummary(
        userSummaryAggregation.userSummaries,
        engagementAdoptionAggregation.engagementData
      ),
      clientReachData: computeClientReach(userSummaryAggregation.userSummaries),
      workingPatterns: engagementAdoptionAggregation.workingPatterns,
    },
    users: userSummaryAggregation,
    adoption: {
      vscodeAgentUsage: engagementAdoptionAggregation.vscodeAgentUsage,
      featureAdoptionData: engagementAdoptionAggregation.featureAdoptionData,
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
      localByokUsage: modelAggregation.localByokUsage,
      selectionModeRequests: modelAggregation.selectionModeRequests,
    },
    cli: cliAggregation,
    copilotApp: copilotAppAggregation,
    customizations: customizationsAggregation,
    ai: aiAggregation,
    productivity: surfaceProductivityAggregation,
  };
}

export function createMetricsAggregationAccumulator() {
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
  const copilotAppAccumulator = createCopilotAppAggregationAccumulator();
  const customizationsAggregationAccumulator =
    createCustomizationsAggregationAccumulator();
  const languageAggregationAccumulator = createLanguageAggregationAccumulator();
  const modelAggregationAccumulator = createModelAggregationAccumulator();
  const impactAggregationAccumulator = createImpactAggregationAccumulator();
  const aiAggregationAccumulator = createAiAggregationAccumulator();
  const surfaceProductivityAggregationAccumulator =
    createSurfaceProductivityAggregationAccumulator();
  const userDetailAggregationAccumulator =
    createUserDetailAggregationAccumulator();

  return {
    coreStatsAggregationAccumulator,
    statsAccumulator,
    userSummaryAggregationAccumulator,
    engagementAdoptionAggregationAccumulator,
    clientAggregationAccumulator,
    cliAggregationAccumulator,
    copilotAppAccumulator,
    customizationsAggregationAccumulator,
    languageAggregationAccumulator,
    modelAggregationAccumulator,
    impactAggregationAccumulator,
    aiAggregationAccumulator,
    surfaceProductivityAggregationAccumulator,
    userDetailAggregationAccumulator,
    recordCount: 0,
    enterpriseName: null as string | null,
  };
}

export type MetricsAggregationAccumulator = ReturnType<typeof createMetricsAggregationAccumulator>;

export function accumulateMetrics(
  accumulator: MetricsAggregationAccumulator,
  rawMetric: CopilotMetrics
): void {
  const {
    coreStatsAggregationAccumulator,
    statsAccumulator,
    userSummaryAggregationAccumulator,
    engagementAdoptionAggregationAccumulator,
    clientAggregationAccumulator,
    cliAggregationAccumulator,
    copilotAppAccumulator,
    customizationsAggregationAccumulator,
    languageAggregationAccumulator,
    modelAggregationAccumulator,
    impactAggregationAccumulator,
    aiAggregationAccumulator,
    surfaceProductivityAggregationAccumulator,
    userDetailAggregationAccumulator,
  } = accumulator;
  accumulator.recordCount++;
  accumulator.enterpriseName ??= extractEnterpriseNameFromLogin(rawMetric.user_login);
  // Normalize the new TablePro aliases before every family consumes them,
  // preserving existing client identities and the uploaded records.
  const hasTableProAlias = rawMetric.totals_by_ide.some(
    total => total.ide !== 'tablepro'
      && getIDEMetadata(total.ide)?.canonicalKey === 'tablepro'
  );
  const metric = hasTableProAlias
    ? {
        ...rawMetric,
        totals_by_ide: rawMetric.totals_by_ide.map(total =>
          getIDEMetadata(total.ide)?.canonicalKey === 'tablepro'
            ? { ...total, ide: 'tablepro' }
            : total
        ),
      }
    : rawMetric;
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
  accumulateSurfaceProductivityAggregation(
    surfaceProductivityAggregationAccumulator,
    metric
  );
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
  accumulateCopilotAppAggregation(copilotAppAccumulator, metric);
  accumulateCustomizationsAggregation(
    customizationsAggregationAccumulator,
    metric
  );

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
}

export function finalizeMetricsAggregation(
  accumulator: MetricsAggregationAccumulator
): {
  aggregated: AggregatedMetrics;
  userDetailAccumulator: UserDetailAccumulator;
  recordCount: number;
  enterpriseName: string | null;
} {
  const {
    coreStatsAggregationAccumulator,
    userSummaryAggregationAccumulator,
    engagementAdoptionAggregationAccumulator,
    clientAggregationAccumulator,
    cliAggregationAccumulator,
    copilotAppAccumulator,
    customizationsAggregationAccumulator,
    languageAggregationAccumulator,
    modelAggregationAccumulator,
    impactAggregationAccumulator,
    aiAggregationAccumulator,
    surfaceProductivityAggregationAccumulator,
    userDetailAggregationAccumulator,
  } = accumulator;
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
  const customizationsAggregation = finalizeCustomizationsAggregation(
    customizationsAggregationAccumulator
  );
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
  const aiAggregation = finalizeAiAggregation(
    aiAggregationAccumulator,
    userSummaryAggregation.userSummaries,
  );
  const surfaceProductivityAggregation =
    finalizeSurfaceProductivityAggregation(
      surfaceProductivityAggregationAccumulator
    );

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
      copilotAppAggregation: finalizeCopilotAppAggregation(copilotAppAccumulator),
      customizationsAggregation,
      aiAggregation,
      surfaceProductivityAggregation,
    }),
    userDetailAccumulator,
    recordCount: accumulator.recordCount,
    enterpriseName: accumulator.enterpriseName,
  };
}

export function aggregateMetrics(
  metrics: CopilotMetrics[]
): { aggregated: AggregatedMetrics; userDetailAccumulator: UserDetailAccumulator } {
  const accumulator = createMetricsAggregationAccumulator();
  for (const metric of metrics) accumulateMetrics(accumulator, metric);
  const { aggregated, userDetailAccumulator } = finalizeMetricsAggregation(accumulator);
  return { aggregated, userDetailAccumulator };
}
