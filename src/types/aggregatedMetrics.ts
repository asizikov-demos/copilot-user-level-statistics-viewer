import type { UserDayData } from './metrics';
import type {
  DailyPRUAnalysisData,
  DailyModelUsageData,
  AgentImpactData,
  CodeCompletionImpactData,
  ModeImpactData,
} from '../domain/calculators/metricCalculators';

export interface UserDetailedMetrics {
  totalStandardModelRequests: number;
  totalPremiumModelRequests: number;
  featureAggregates: Array<{
    feature: string;
    user_initiated_interaction_count: number;
    code_generation_activity_count: number;
    code_acceptance_activity_count: number;
    loc_added_sum: number;
    loc_deleted_sum: number;
    loc_suggested_to_add_sum: number;
    loc_suggested_to_delete_sum: number;
  }>;
  ideAggregates: Array<{
    ide: string;
    user_initiated_interaction_count: number;
    code_generation_activity_count: number;
    code_acceptance_activity_count: number;
    loc_added_sum: number;
    loc_deleted_sum: number;
    loc_suggested_to_add_sum: number;
    loc_suggested_to_delete_sum: number;
  }>;
  languageFeatureAggregates: Array<{
    language: string;
    feature: string;
    code_generation_activity_count: number;
    code_acceptance_activity_count: number;
    loc_added_sum: number;
    loc_deleted_sum: number;
    loc_suggested_to_add_sum: number;
    loc_suggested_to_delete_sum: number;
  }>;
  modelFeatureAggregates: Array<{
    model: string;
    feature: string;
    user_initiated_interaction_count: number;
    code_generation_activity_count: number;
    code_acceptance_activity_count: number;
    loc_added_sum: number;
    loc_deleted_sum: number;
    loc_suggested_to_add_sum: number;
    loc_suggested_to_delete_sum: number;
  }>;
  pluginVersions: Array<{
    plugin: string;
    plugin_version: string;
    sampled_at: string;
  }>;
  dailyPRUAnalysis: DailyPRUAnalysisData[];
  dailyCombinedImpact: ModeImpactData[];
  dailyModelUsage: DailyModelUsageData[];
  dailyAgentImpact: AgentImpactData[];
  dailyAskModeImpact: ModeImpactData[];
  dailyCompletionImpact: CodeCompletionImpactData[];
  dailyCliImpact: ModeImpactData[];
  days: UserDayData[];
  reportStartDay: string;
  reportEndDay: string;
}
