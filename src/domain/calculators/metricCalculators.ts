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

export type {
  DailyModelUsageData,
  AgentModeHeatmapData,
} from './modelUsageCalculator';

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

export const calculateStats = calculateStatsFromMetrics;

export const calculateDailyModelUsage = calculateDailyModelUsageFromMetrics;

export const calculateJoinedImpactData = calculateJoinedImpactFromMetrics;

export const calculateEditModeImpactData = calculateEditModeImpactFromMetrics;

export const calculateInlineModeImpactData = calculateInlineModeImpactFromMetrics;

export const calculateAskModeImpactData = calculateAskModeImpactFromMetrics;

export const calculateAgentImpactData = calculateAgentImpactFromMetrics;

export const calculateCodeCompletionImpactData = calculateCodeCompletionImpactFromMetrics;

export const calculateCliImpactData = calculateCliImpactFromMetrics;
