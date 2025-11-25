// Stats Calculator
export {
  type UserUsageStats,
  type StatsAccumulator,
  createStatsAccumulator,
  accumulateUserUsage,
  accumulateIdeUser,
  accumulateLanguageEngagement,
  accumulateModelEngagement,
  computeStats,
  calculateStatsFromMetrics,
} from './statsCalculator';

// Engagement Calculator
export {
  type DailyEngagementData,
  type EngagementAccumulator,
  createEngagementAccumulator,
  accumulateEngagement,
  computeEngagementData,
} from './engagementCalculator';

// Chat Calculator
export {
  type DailyChatUsersData,
  type DailyChatRequestsData,
  type ChatAccumulator,
  createChatAccumulator,
  ensureChatDate,
  accumulateChatFeature,
  computeChatUsersData,
  computeChatRequestsData,
} from './chatCalculator';

// Language Calculator
export {
  type LanguageStats,
  type LanguageAccumulator,
  createLanguageAccumulator,
  accumulateLanguageStats,
  computeLanguageStats,
  shouldFilterLanguage,
} from './languageCalculator';

// Model Usage Calculator
export {
  type DailyModelUsageData,
  type DailyPRUAnalysisData,
  type AgentModeHeatmapData,
  type ModelFeatureDistributionData,
  type ModelUsageAccumulator,
  createModelUsageAccumulator,
  accumulateModelFeature,
  accumulateAgentHeatmapFromFeature,
  computeDailyModelUsageData,
  computePRUAnalysisData,
  computeAgentModeHeatmapData,
  computeModelFeatureDistributionData,
  calculateDailyPRUAnalysisFromMetrics,
  calculateDailyModelUsageFromMetrics,
} from './modelUsageCalculator';

// Feature Adoption Calculator
export {
  type FeatureAdoptionData,
  type FeatureAdoptionAccumulator,
  createFeatureAdoptionAccumulator,
  accumulateFeatureAdoption,
  computeFeatureAdoptionData,
} from './featureAdoptionCalculator';

// Impact Calculator
export {
  type ImpactData,
  type AgentImpactData,
  type CodeCompletionImpactData,
  type ModeImpactData,
  type ImpactAccumulator,
  type FeatureImpactInput,
  createImpactAccumulator,
  ensureImpactDates,
  accumulateFeatureImpacts,
  computeAgentImpactData,
  computeCodeCompletionImpactData,
  computeEditModeImpactData,
  computeInlineModeImpactData,
  computeAskModeImpactData,
  computeJoinedImpactData,
  calculateJoinedImpactFromMetrics,
  calculateEditModeImpactFromMetrics,
  calculateInlineModeImpactFromMetrics,
  calculateAskModeImpactFromMetrics,
} from './impactCalculator';
