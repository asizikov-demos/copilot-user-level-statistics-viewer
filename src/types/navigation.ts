import type { MetricsStats, UserSummary, IDEStatsData, PluginVersionAnalysisData, LanguageFeatureImpactData, DailyLanguageChartData, ModelBreakdownData } from './metrics';
import type { UserDetailedMetrics } from '../types/aggregatedMetrics';
import type {
  DailyEngagementData,
  DailyChatUsersData,
  DailyChatRequestsData,
  LanguageStats,
  DailyModelUsageData,
  FeatureAdoptionData,
  DailyPRUAnalysisData,
  AgentModeHeatmapData,
  ModelFeatureDistributionData,
  AgentImpactData,
  CodeCompletionImpactData,
  ModeImpactData,
} from '../domain/calculators/metricCalculators';
import type { VoidCallback, ValueCallback } from './events';

export const VIEW_MODES = {
  OVERVIEW: 'overview',
  EXECUTIVE_SUMMARY: 'executiveSummary',
  USERS: 'users',
  USER_DETAILS: 'userDetails',
  LANGUAGES: 'languages',
  IDES: 'ides',
  COPILOT_IMPACT: 'copilotImpact',
  PRU_USAGE: 'pruUsage',
  COPILOT_ADOPTION: 'copilotAdoption',
  MODEL_DETAILS: 'modelDetails',
} as const;

export type ViewMode = typeof VIEW_MODES[keyof typeof VIEW_MODES];

export interface SelectedUser {
  login: string;
  id: number;
}

export interface NavigationState {
  currentView: ViewMode;
  selectedUser: SelectedUser | null;
  selectedModel: string | null;
}

export interface NavigationActions {
  navigateTo: (view: ViewMode) => void;
  selectUser: (user: SelectedUser) => void;
  selectModel: (model: string) => void;
  clearSelectedUser: () => void;
  clearSelectedModel: () => void;
  resetNavigation: () => void;
}

/**
 * Base interface for all view props that require back navigation
 */
export interface BackNavigableViewProps {
  onBack: VoidCallback;
}

/**
 * Discriminated union types for view props.
 * These ensure type-safe prop passing when rendering different views.
 */

export interface OverviewViewProps extends BackNavigableViewProps {
  view: typeof VIEW_MODES.OVERVIEW;
  stats: MetricsStats;
  enterpriseName: string | null;
  engagementData: DailyEngagementData[];
  chatUsersData: DailyChatUsersData[];
  chatRequestsData: DailyChatRequestsData[];
  onNavigate: ValueCallback<ViewMode>;
  onModelSelect: ValueCallback<string>;
  onReset: VoidCallback;
}

export interface UsersViewProps extends BackNavigableViewProps {
  view: typeof VIEW_MODES.USERS;
  users: UserSummary[];
  onUserClick: (userLogin: string, userId: number) => void;
}

export interface ExecutiveSummaryViewProps extends BackNavigableViewProps {
  view: typeof VIEW_MODES.EXECUTIVE_SUMMARY;
  stats: MetricsStats;
  joinedImpactData: ModeImpactData[];
  enterpriseName: string | null;
  modelUsageData: DailyModelUsageData[];
  agentImpactData: AgentImpactData[];
  codeCompletionImpactData: CodeCompletionImpactData[];
  featureAdoptionData: FeatureAdoptionData;
}

export interface UserDetailsViewProps extends BackNavigableViewProps {
  view: typeof VIEW_MODES.USER_DETAILS;
  userDetails: UserDetailedMetrics;
  userSummary: UserSummary;
  userLogin: string;
  userId: number;
}

export interface LanguagesViewProps extends BackNavigableViewProps {
  view: typeof VIEW_MODES.LANGUAGES;
  languages: LanguageStats[];
  languageFeatureImpactData: LanguageFeatureImpactData;
  dailyLanguageGenerationsData: DailyLanguageChartData;
  dailyLanguageLocData: DailyLanguageChartData;
}

export interface IDEsViewProps extends BackNavigableViewProps {
  view: typeof VIEW_MODES.IDES;
  ideStats: IDEStatsData[];
  multiIDEUsersCount: number;
  totalUniqueIDEUsers: number;
}

export interface CopilotImpactViewProps extends BackNavigableViewProps {
  view: typeof VIEW_MODES.COPILOT_IMPACT;
  agentImpactData: AgentImpactData[];
  codeCompletionImpactData: CodeCompletionImpactData[];
  editModeImpactData: ModeImpactData[];
  inlineModeImpactData: ModeImpactData[];
  askModeImpactData: ModeImpactData[];
  cliImpactData: ModeImpactData[];
  joinedImpactData: ModeImpactData[];
}

export interface PRUUsageViewProps extends BackNavigableViewProps {
  view: typeof VIEW_MODES.PRU_USAGE;
  modelUsageData: DailyModelUsageData[];
  pruAnalysisData: DailyPRUAnalysisData[];
  modelFeatureDistributionData: ModelFeatureDistributionData[];
}

export interface CopilotAdoptionViewProps extends BackNavigableViewProps {
  view: typeof VIEW_MODES.COPILOT_ADOPTION;
  featureAdoptionData: FeatureAdoptionData;
  agentModeHeatmapData: AgentModeHeatmapData[];
  stats: MetricsStats;
  pluginVersionData: PluginVersionAnalysisData;
}

export interface ModelDetailsViewProps extends BackNavigableViewProps {
  view: typeof VIEW_MODES.MODEL_DETAILS;
  modelBreakdownData: ModelBreakdownData;
}

/**
 * Discriminated union of all view props.
 * Use this type when you need to pass props to a dynamic view router.
 */
export type ViewProps =
  | OverviewViewProps
  | ExecutiveSummaryViewProps
  | UsersViewProps
  | UserDetailsViewProps
  | LanguagesViewProps
  | IDEsViewProps
  | CopilotImpactViewProps
  | PRUUsageViewProps
  | CopilotAdoptionViewProps
  | ModelDetailsViewProps;

/**
 * Type guard to check if props are for a specific view
 */
export function isViewProps<T extends ViewProps['view']>(
  props: ViewProps,
  view: T
): props is Extract<ViewProps, { view: T }> {
  return props.view === view;
}
