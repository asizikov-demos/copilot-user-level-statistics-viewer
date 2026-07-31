import { calculateStatsFromMetrics } from './statsCalculator';
import {
  calculateDailyModelUsageFromMetrics,
} from './modelUsageCalculator';
import {
  calculateJoinedImpactFromMetrics,
  calculateEditModeImpactFromMetrics,
  calculateInlineModeImpactFromMetrics,
  calculateAskModeImpactFromMetrics,
  calculateAgentImpactFromMetrics,
  calculateCodeCompletionImpactFromMetrics,
  calculateCopilotAppImpactFromMetrics,
  calculateCliImpactFromMetrics,
} from './impactCalculator';

export type {
  DailyEngagementData,
  DailyAdoptionTrend,
  DailyChatUsersData,
  DailyChatRequestsData,
  LanguageStats,
  FeatureAdoptionData,
} from './index';

export type { DailyModelUsageData } from './modelUsageCalculator';

export type {
  AgentImpactData,
  CodeCompletionImpactData,
  ModeImpactData,
} from './impactCalculator';

export type {
  DailyCliSessionData,
  DailyCliTokenData,
  DailyCliAdoptionTrend,
} from './cliUsageCalculator';

export type {
  DailyCloudAgentAdoptionData,
  DailyCodeReviewAdoptionData,
} from './advancedAdoptionCalculator';

export type {
  AiAdoptionPhaseData,
  AiAdoptionPhaseTopEntry,
} from './aiAdoptionPhaseCalculator';

export type {
  UsageDistributionBucket,
  UsageDistributionBucketId,
} from './usageDistributionCalculator';

export type {
  DailyAiCreditsData,
} from './aiCreditsCalculator';

export const calculateStats = calculateStatsFromMetrics;

export const calculateDailyModelUsage = calculateDailyModelUsageFromMetrics;

export const calculateJoinedImpactData = calculateJoinedImpactFromMetrics;

export const calculateEditModeImpactData = calculateEditModeImpactFromMetrics;

export const calculateInlineModeImpactData = calculateInlineModeImpactFromMetrics;

export const calculateAskModeImpactData = calculateAskModeImpactFromMetrics;

export const calculateAgentImpactData = calculateAgentImpactFromMetrics;

export const calculateCodeCompletionImpactData = calculateCodeCompletionImpactFromMetrics;

export const calculateCopilotAppImpactData = calculateCopilotAppImpactFromMetrics;

export const calculateCliImpactData = calculateCliImpactFromMetrics;
