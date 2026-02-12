export interface CopilotMetrics {
  report_start_day: string;
  report_end_day: string;
  day: string;
  enterprise_id: string;
  user_id: number;
  user_login: string;
  user_initiated_interaction_count: number;
  code_generation_activity_count: number;
  code_acceptance_activity_count: number;
  // New LOC metrics (replacing generated_loc_sum & accepted_loc_sum)
  // loc_added_sum + loc_deleted_sum correspond to previously "accepted" (accepted showed net changes)
  // loc_suggested_to_add_sum + loc_suggested_to_delete_sum correspond to previously "generated" suggestions
  loc_added_sum: number;
  loc_deleted_sum: number;
  loc_suggested_to_add_sum: number;
  loc_suggested_to_delete_sum: number;
  totals_by_ide: Array<{
    ide: string;
    user_initiated_interaction_count: number;
    code_generation_activity_count: number;
    code_acceptance_activity_count: number;
    loc_added_sum: number;
    loc_deleted_sum: number;
    loc_suggested_to_add_sum: number;
    loc_suggested_to_delete_sum: number;
    last_known_plugin_version?: {
      sampled_at: string;
      plugin: string;
      plugin_version: string;
    };
  }>;
  totals_by_feature: Array<{
    feature: string;
    user_initiated_interaction_count: number;
    code_generation_activity_count: number;
    code_acceptance_activity_count: number;
    loc_added_sum: number;
    loc_deleted_sum: number;
    loc_suggested_to_add_sum: number;
    loc_suggested_to_delete_sum: number;
  }>;
  totals_by_language_feature: Array<{
    language: string;
    feature: string;
    code_generation_activity_count: number;
    code_acceptance_activity_count: number;
    loc_added_sum: number;
    loc_deleted_sum: number;
    loc_suggested_to_add_sum: number;
    loc_suggested_to_delete_sum: number;
  }>;
  totals_by_language_model: Array<{
    language: string;
    model: string;
    code_generation_activity_count: number;
    code_acceptance_activity_count: number;
    loc_added_sum: number;
    loc_deleted_sum: number;
    loc_suggested_to_add_sum: number;
    loc_suggested_to_delete_sum: number;
  }>;
  totals_by_model_feature: Array<{
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
  used_agent: boolean;
  used_chat: boolean;
  used_cli: boolean;
}

export interface MetricsStats {
  uniqueUsers: number;
  chatUsers: number;
  agentUsers: number;
  cliUsers: number;
  completionOnlyUsers: number;
  reportStartDay: string;
  reportEndDay: string;
  totalRecords: number;
  topLanguage: { name: string; engagements: number };
  topIde: { name: string; entries: number };
  topModel: { name: string; engagements: number };
}

export interface UserSummary {
  user_login: string;
  user_id: number;
  total_user_initiated_interactions: number;
  total_code_generation_activities: number;
  total_code_acceptance_activities: number;
  total_loc_added: number;
  total_loc_deleted: number;
  total_loc_suggested_to_add: number;
  total_loc_suggested_to_delete: number;
  days_active: number;
  used_agent: boolean;
  used_chat: boolean;
  used_cli: boolean;
}

// ==========================================
// Global aggregated types (pre-computed from raw metrics)
// ==========================================

export interface IDEStatsData {
  ide: string;
  uniqueUsers: number;
  totalEngagements: number;
  totalGenerations: number;
  totalAcceptances: number;
  locAdded: number;
  locDeleted: number;
  locSuggestedToAdd: number;
  locSuggestedToDelete: number;
}

export interface PluginVersionEntry {
  version: string;
  userCount: number;
  usernames: string[];
}

export interface PluginVersionAnalysisData {
  jetbrains: PluginVersionEntry[];
  vscode: PluginVersionEntry[];
  totalUniqueIntellijUsers: number;
  totalUniqueVsCodeUsers: number;
}

export interface LanguageFeatureImpactRow {
  language: string;
  total: number;
  features: Record<string, number>;
}

export interface LanguageFeatureImpactData {
  rows: LanguageFeatureImpactRow[];
  features: string[];
}

export interface DailyLanguageChartData {
  dates: string[];
  languages: string[];
  data: Record<string, Record<string, number>>;
  totals: Record<string, number>;
}

export interface ModelDailyUsageEntry {
  model: string;
  total: number;
  dailyData: Record<string, number>;
}

export interface ModelBreakdownData {
  premiumModels: ModelDailyUsageEntry[];
  standardModels: ModelDailyUsageEntry[];
  dates: string[];
  premiumTotal: number;
  standardTotal: number;
  unknownTotal: number;
}

// ==========================================
// Per-user detailed aggregated types
// ==========================================

export interface UserDayData {
  day: string;
  user_initiated_interaction_count: number;
  code_generation_activity_count: number;
  code_acceptance_activity_count: number;
  loc_added_sum: number;
  loc_deleted_sum: number;
  loc_suggested_to_add_sum: number;
  loc_suggested_to_delete_sum: number;
  totals_by_feature: Array<{
    feature: string;
    user_initiated_interaction_count: number;
    code_generation_activity_count: number;
    code_acceptance_activity_count: number;
    loc_added_sum: number;
    loc_deleted_sum: number;
    loc_suggested_to_add_sum: number;
    loc_suggested_to_delete_sum: number;
  }>;
  totals_by_ide: Array<{
    ide: string;
    user_initiated_interaction_count: number;
    code_generation_activity_count: number;
    code_acceptance_activity_count: number;
    loc_added_sum: number;
    loc_deleted_sum: number;
    loc_suggested_to_add_sum: number;
    loc_suggested_to_delete_sum: number;
    last_known_plugin_version?: {
      sampled_at: string;
      plugin: string;
      plugin_version: string;
    };
  }>;
  totals_by_language_feature: Array<{
    language: string;
    feature: string;
    code_generation_activity_count: number;
    code_acceptance_activity_count: number;
    loc_added_sum: number;
    loc_deleted_sum: number;
    loc_suggested_to_add_sum: number;
    loc_suggested_to_delete_sum: number;
  }>;
  totals_by_language_model: Array<{
    language: string;
    model: string;
    code_generation_activity_count: number;
    code_acceptance_activity_count: number;
    loc_added_sum: number;
    loc_deleted_sum: number;
    loc_suggested_to_add_sum: number;
    loc_suggested_to_delete_sum: number;
  }>;
  totals_by_model_feature: Array<{
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
}
