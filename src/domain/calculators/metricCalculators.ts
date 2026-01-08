import { calculateStatsFromMetrics } from './statsCalculator';
import {
  calculateDailyPRUAnalysisFromMetrics,
  calculateDailyModelUsageFromMetrics,
} from './modelUsageCalculator';
import {
  calculateJoinedImpactFromMetrics,
  calculateEditModeImpactFromMetrics,
  calculateInlineModeImpactFromMetrics,
  calculateAskModeImpactFromMetrics,
  calculateAgentImpactFromMetrics,
  calculateCodeCompletionImpactFromMetrics,
} from './impactCalculator';

export type {
  DailyEngagementData,
  DailyChatUsersData,
  DailyChatRequestsData,
  LanguageStats,
  FeatureAdoptionData,
} from './index';

export type {
  DailyModelUsageData,
  DailyPRUAnalysisData,
  AgentModeHeatmapData,
  ModelFeatureDistributionData,
} from './modelUsageCalculator';

export type {
  AgentImpactData,
  CodeCompletionImpactData,
  ModeImpactData,
} from './impactCalculator';

export const calculateStats = calculateStatsFromMetrics;

export const calculateDailyPRUAnalysis = calculateDailyPRUAnalysisFromMetrics;

export const calculateDailyModelUsage = calculateDailyModelUsageFromMetrics;

export const calculateJoinedImpactData = calculateJoinedImpactFromMetrics;

export const calculateEditModeImpactData = calculateEditModeImpactFromMetrics;

export const calculateInlineModeImpactData = calculateInlineModeImpactFromMetrics;

export const calculateAskModeImpactData = calculateAskModeImpactFromMetrics;

export const calculateAgentImpactData = calculateAgentImpactFromMetrics;

export const calculateCodeCompletionImpactData = calculateCodeCompletionImpactFromMetrics;
