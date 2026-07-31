import type {
  DailyLanguageChartData,
  IDEStatsData,
  LanguageFeatureImpactData,
  MetricsStats,
  ModelBreakdownData,
  PluginVersionAnalysisData,
  UserDayData,
  UserSummary,
} from './metrics';
import type {
  DailyModelUsageData,
  DailyEngagementData,
  DailyAdoptionTrend,
  DailyChatUsersData,
  DailyChatRequestsData,
  LanguageStats,
  FeatureAdoptionData,
  AgentImpactData,
  CodeCompletionImpactData,
  ModeImpactData,
  DailyCliSessionData,
  DailyCliTokenData,
  DailyCliAdoptionTrend,
  DailyCloudAgentAdoptionData,
  DailyCodeReviewAdoptionData,
  AiAdoptionPhaseData,
  UsageDistributionBucket,
  DailyAiCreditsData,
} from '../domain/calculators';
import type { SurfaceProductivityMetrics } from './surfaceProductivity';

export interface OverviewMetricsSlice {
  stats: MetricsStats;
  engagementData: DailyEngagementData[];
  chatUsersData: DailyChatUsersData[];
  chatRequestsData: DailyChatRequestsData[];
}

export interface UsersMetricsSlice {
  userSummaries: UserSummary[];
}

export interface AdoptionMetricsSlice {
  featureAdoptionData: FeatureAdoptionData;
  dailyAdoptionTrend: DailyAdoptionTrend[];
  dailyCloudAgentAdoptionData: DailyCloudAgentAdoptionData[];
  dailyCodeReviewAdoptionData: DailyCodeReviewAdoptionData[];
}

export interface ImpactMetricsSlice {
  agentImpactData: AgentImpactData[];
  codeCompletionImpactData: CodeCompletionImpactData[];
  editModeImpactData: ModeImpactData[];
  inlineModeImpactData: ModeImpactData[];
  askModeImpactData: ModeImpactData[];
  copilotAppImpactData: ModeImpactData[];
  cliImpactData: ModeImpactData[];
  joinedImpactData: ModeImpactData[];
}

export interface LanguagesMetricsSlice {
  languageStats: LanguageStats[];
  languageFeatureImpactData: LanguageFeatureImpactData;
  dailyLanguageGenerationsData: DailyLanguageChartData;
  dailyLanguageLocData: DailyLanguageChartData;
}

export interface ClientsMetricsSlice {
  ideStats: IDEStatsData[];
  multiIDEUsersCount: number;
  totalUniqueIDEUsers: number;
  pluginVersionData: PluginVersionAnalysisData;
}

export interface ModelsMetricsSlice {
  modelUsageData: DailyModelUsageData[];
  modelBreakdownData: ModelBreakdownData;
}

export interface CliMetricsSlice {
  dailyCliSessionData: DailyCliSessionData[];
  dailyCliTokenData: DailyCliTokenData[];
  dailyCliAdoptionTrend: DailyCliAdoptionTrend[];
}

export interface AiMetricsSlice {
  aiAdoptionPhaseData: AiAdoptionPhaseData[];
  usageDistributionData: UsageDistributionBucket[];
  dailyAiCreditsData: DailyAiCreditsData[];
}

export interface AggregatedMetrics {
  overview: OverviewMetricsSlice;
  users: UsersMetricsSlice;
  adoption: AdoptionMetricsSlice;
  impact: ImpactMetricsSlice;
  languages: LanguagesMetricsSlice;
  clients: ClientsMetricsSlice;
  models: ModelsMetricsSlice;
  cli: CliMetricsSlice;
  ai: AiMetricsSlice;
  productivity: SurfaceProductivityMetrics;
}

export interface UserDetailedMetrics {
  totalModelRequests: number;
  total_ai_credits_used: number;
  featureAggregates: Array<{
    feature: string;
    user_initiated_interaction_count: number;
    assumed_user_initiated_interaction_count: number;
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
    assumed_user_initiated_interaction_count: number;
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
    assumed_user_initiated_interaction_count: number;
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
  cliVersions: Array<{
    cli_version: string;
    sampled_at: string;
  }>;
  dailyCombinedImpact: ModeImpactData[];
  dailyModelUsage: DailyModelUsageData[];
  dailyAgentImpact: AgentImpactData[];
  dailyAskModeImpact: ModeImpactData[];
  dailyCompletionImpact: CodeCompletionImpactData[];
  dailyCopilotAppImpact: ModeImpactData[];
  dailyCliImpact: ModeImpactData[];
  days: UserDayData[];
  reportStartDay: string;
  reportEndDay: string;
}
