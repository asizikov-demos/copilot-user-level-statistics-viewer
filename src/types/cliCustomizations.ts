export const CLI_CUSTOMIZATION_CATEGORIES = ['skill', 'custom_agent', 'mcp', 'slash_cmd'] as const;

export type CliCustomizationCategory = typeof CLI_CUSTOMIZATION_CATEGORIES[number];

export interface CliCustomizationCounts {
  interaction_count?: number | null;
  user_initiated_interaction_count?: number | null;
}

export type CliCustomizationFields = {
  [Category in CliCustomizationCategory as `totals_by_${Category}`]?:
    Array<CliCustomizationCounts & Record<Category, string>> | null;
} & {
  [Category in CliCustomizationCategory as `distinct_${Category}_use_count`]?: number | null;
};

export interface CliCustomizationActivity {
  category: CliCustomizationCategory;
  observedInteractions: number | null;
  legacyEntryCount: number;
  items: CliCustomizationItemSummary[];
}

export interface CliCustomizationDaySummary extends CliCustomizationActivity {
  distinctItems: number | null;
}

export interface CliCustomizationSummary extends CliCustomizationActivity {
  recordCount: number;
  entriesReportedRecords: number;
  distinctReportedRecords: number;
  activeRecords: number | null;
  averageDistinctItems: number | null;
  summedDailyDistinctItems: number | null;
}

export interface CliCustomizationItemSummary {
  name: string;
  interactionCount: number;
  daysInvoked: number;
  averagePerDay: number | null;
}
