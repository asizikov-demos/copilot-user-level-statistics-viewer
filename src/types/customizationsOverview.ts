export const CUSTOMIZATION_TYPES = ['skill', 'custom_agent', 'mcp', 'slash_cmd', 'plugin'] as const;

export type CustomizationType = (typeof CUSTOMIZATION_TYPES)[number];

/** Buckets the API reports instead of a name (custom/private items, or names hidden for privacy). */
export const UNNAMED_CUSTOMIZATION_NAMES: ReadonlySet<string> = new Set(['other', 'custom']);

export interface CustomizationItemStats {
  name: string;
  unnamed: boolean;
  totalEvents: number;
  users: number;
  activeDays: number;
  /** Events per day, aligned with `CustomizationsMetricsSlice.dates`. */
  dailyEvents: number[];
  topUsers: Array<{ login: string; events: number }>;
}

export interface CustomizationTypeStats {
  type: CustomizationType;
  totalEvents: number;
  unnamedEvents: number;
  /** Distinct users with any reported event of this type, named or unnamed. */
  users: number;
  /** Sorted by total events, descending. */
  items: CustomizationItemStats[];
}

export interface CustomizationsMetricsSlice {
  dates: string[];
  types: Record<CustomizationType, CustomizationTypeStats>;
}
