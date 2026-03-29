export const VIEW_MODES = {
  OVERVIEW: 'overview',
  EXECUTIVE_SUMMARY: 'executiveSummary',
  USERS: 'users',
  USER_DETAILS: 'userDetails',
  LANGUAGES: 'languages',
  CLIENT_ANALYSIS: 'ides',
  COPILOT_IMPACT: 'copilotImpact',
  COPILOT_ADOPTION: 'copilotAdoption',
  MODEL_DETAILS: 'modelDetails',
  CLI_ADOPTION: 'cliAdoption',
} as const;

export type ViewMode = typeof VIEW_MODES[keyof typeof VIEW_MODES];

export interface SelectedUser {
  login: string;
  id: number;
}

export interface NavigationState {
  currentView: ViewMode;
  selectedUser: SelectedUser | null;
}

export interface NavigationActions {
  navigateTo: (view: ViewMode) => void;
  selectUser: (user: SelectedUser) => void;
  resetNavigation: () => void;
}
