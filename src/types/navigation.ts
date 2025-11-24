export const VIEW_MODES = {
  OVERVIEW: 'overview',
  USERS: 'users',
  USER_DETAILS: 'userDetails',
  LANGUAGES: 'languages',
  IDES: 'ides',
  DATA_QUALITY: 'dataQuality',
  COPILOT_IMPACT: 'copilotImpact',
  PRU_USAGE: 'pruUsage',
  COPILOT_ADOPTION: 'copilotAdoption',
  MODEL_DETAILS: 'modelDetails',
  CUSTOMER_EMAIL: 'customerEmail',
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
