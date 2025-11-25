import { calculateStatsFromMetrics } from '../domain/calculators/statsCalculator';
import {
  calculateDailyPRUAnalysisFromMetrics,
  calculateDailyModelUsageFromMetrics,
} from '../domain/calculators/modelUsageCalculator';
import {
  calculateJoinedImpactFromMetrics,
  calculateEditModeImpactFromMetrics,
  calculateInlineModeImpactFromMetrics,
  calculateAskModeImpactFromMetrics,
} from '../domain/calculators/impactCalculator';

export type {
  DailyEngagementData,
  DailyChatUsersData,
  DailyChatRequestsData,
  LanguageStats,
  FeatureAdoptionData,
} from '../domain/calculators';

export type {
  DailyModelUsageData,
  DailyPRUAnalysisData,
  AgentModeHeatmapData,
  ModelFeatureDistributionData,
} from '../domain/calculators/modelUsageCalculator';

export type {
  AgentImpactData,
  CodeCompletionImpactData,
  ModeImpactData,
} from '../domain/calculators/impactCalculator';

export const calculateStats = calculateStatsFromMetrics;

export const calculateDailyPRUAnalysis = calculateDailyPRUAnalysisFromMetrics;

export const calculateDailyModelUsage = calculateDailyModelUsageFromMetrics;

export const calculateJoinedImpactData = calculateJoinedImpactFromMetrics;

export const calculateEditModeImpactData = calculateEditModeImpactFromMetrics;

export const calculateInlineModeImpactData = calculateInlineModeImpactFromMetrics;

export const calculateAskModeImpactData = calculateAskModeImpactFromMetrics;
