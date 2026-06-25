import { VIEW_MODES, type ViewMode } from '../../types/navigation';
import { OVERVIEW_SECTIONS } from '../features/overview/overviewSections';

export interface ContextSection {
  id: string;
  label: string;
}

export const COPILOT_IMPACT_SECTIONS: ContextSection[] = [
  { id: 'impact-combined', label: 'Combined' },
  { id: 'impact-agent', label: 'Agent Mode' },
  { id: 'impact-cli', label: 'CLI' },
  { id: 'impact-code-completion', label: 'Code Completion' },
  { id: 'impact-ask', label: 'Ask Mode' },
  { id: 'impact-inline', label: 'Inline Mode' },
  { id: 'impact-edit', label: 'Edit Mode' },
];

export const CLI_ADOPTION_SECTIONS: ContextSection[] = [
  { id: 'cli-adoption-trend', label: 'CLI Adoption Trend' },
  { id: 'cli-daily-users', label: 'Daily CLI Users' },
  { id: 'cli-daily-sessions', label: 'Daily CLI Sessions' },
  { id: 'cli-daily-tokens', label: 'Daily CLI Token Usage' },
  { id: 'cli-models-usage', label: 'CLI Models Daily Usage' },
];

export const CLIENT_ANALYSIS_SECTIONS: ContextSection[] = [
  { id: 'client-distribution', label: 'Client Distribution' },
  { id: 'client-insights', label: 'Insights' },
  { id: 'clients-by-users', label: 'Clients by Users' },
  { id: 'clients-by-engagements', label: 'Clients by Engagements' },
];

export const COPILOT_ADOPTION_SECTIONS: ContextSection[] = [
  { id: 'copilot-feature-adoption', label: 'Feature Adoption' },
  { id: 'copilot-agent-mode-heatmap', label: 'Agent Mode Heatmap' },
  { id: 'copilot-adoption-trend', label: 'Adoption Trend' },
];

export const AI_ADOPTION_PHASE_SECTIONS: ContextSection[] = [
  { id: 'ai-adoption-phase-comparison', label: 'Phase Comparison' },
  { id: 'ai-adoption-phase-assignment', label: 'How Phases Are Assigned' },
];

export const LANGUAGES_SECTIONS: ContextSection[] = [
  { id: 'languages-summary', label: 'Summary' },
  { id: 'languages-daily-charts', label: 'Daily Language Charts' },
  { id: 'languages-top-lists', label: 'Top Language Lists' },
  { id: 'languages-net-impact', label: 'Net Productivity Impact' },
  { id: 'languages-complete-breakdown', label: 'Complete Breakdown' },
];

export const CLIENT_VERSIONS_SECTIONS: ContextSection[] = [
  { id: 'client-versions-jetbrains', label: 'JetBrains' },
  { id: 'client-versions-vscode', label: 'Visual Studio Code' },
];

export const USER_DETAILS_SECTIONS: ContextSection[] = [
  { id: 'user-details-overview', label: 'Activity Overview' },
  { id: 'user-details-ai-credits', label: 'AI Credits' },
  { id: 'user-details-combined-impact', label: 'Combined Impact' },
  { id: 'user-details-impact-breakdown', label: 'Impact Breakdown' },
  { id: 'user-details-summary', label: 'Usage Summary' },
  { id: 'user-details-client-activity', label: 'Client Activity' },
  { id: 'user-details-feature-activity', label: 'Activity by Feature' },
  { id: 'user-details-language-activity', label: 'Language Activity' },
  { id: 'user-details-model-activity', label: 'Model Activity' },
];

export const MODEL_DETAILS_SECTIONS: ContextSection[] = [
  { id: 'model-usage-all', label: 'All Models' },
  { id: 'model-usage-auto', label: 'Auto Models' },
  { id: 'model-auto-adoption', label: 'Auto Adoption' },
];

export const AI_CREDITS_SECTIONS: ContextSection[] = [
  { id: 'ai-credits-daily-consumption', label: 'Daily Consumption' },
  { id: 'ai-credits-top-users', label: 'Top Users' },
  { id: 'ai-credits-usage-distribution', label: 'Usage Distribution' },
];

export const CONTEXT_SECTIONS: Partial<Record<ViewMode, ContextSection[]>> = {
  [VIEW_MODES.OVERVIEW]: OVERVIEW_SECTIONS,
  [VIEW_MODES.AI_CREDITS]: AI_CREDITS_SECTIONS,
  [VIEW_MODES.CLIENT_ANALYSIS]: CLIENT_ANALYSIS_SECTIONS,
  [VIEW_MODES.COPILOT_IMPACT]: COPILOT_IMPACT_SECTIONS,
  [VIEW_MODES.COPILOT_ADOPTION]: COPILOT_ADOPTION_SECTIONS,
  [VIEW_MODES.AI_ADOPTION_PHASES]: AI_ADOPTION_PHASE_SECTIONS,
  [VIEW_MODES.CLI_ADOPTION]: CLI_ADOPTION_SECTIONS,
  [VIEW_MODES.LANGUAGES]: LANGUAGES_SECTIONS,
  [VIEW_MODES.CLIENT_VERSIONS]: CLIENT_VERSIONS_SECTIONS,
  [VIEW_MODES.USER_DETAILS]: USER_DETAILS_SECTIONS,
  [VIEW_MODES.MODEL_DETAILS]: MODEL_DETAILS_SECTIONS,
};
