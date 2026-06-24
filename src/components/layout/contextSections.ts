import { VIEW_MODES, type ViewMode } from '../../types/navigation';
import { OVERVIEW_SECTIONS } from '../features/overview/overviewSections';

export interface ContextSection {
  id: string;
  label: string;
}

export const COPILOT_IMPACT_SECTIONS: ContextSection[] = [
  { id: 'impact-combined', label: 'Combined Copilot Impact' },
  { id: 'impact-agent', label: 'Copilot Agent Mode Impact' },
  { id: 'impact-cli', label: 'Copilot CLI Impact' },
  { id: 'impact-code-completion', label: 'Code Completion Impact' },
  { id: 'impact-ask', label: 'Copilot Ask Mode Impact' },
  { id: 'impact-inline', label: 'Copilot Inline Mode Impact' },
  { id: 'impact-edit', label: 'Copilot Edit Mode Impact' },
];

export const CLI_ADOPTION_SECTIONS: ContextSection[] = [
  { id: 'cli-adoption-trend', label: 'CLI Adoption Trend' },
  { id: 'cli-daily-users', label: 'Daily CLI Users' },
  { id: 'cli-daily-sessions', label: 'Daily CLI Sessions' },
  { id: 'cli-daily-tokens', label: 'Daily CLI Token Usage' },
  { id: 'cli-models-usage', label: 'CLI Models Daily Usage' },
];

export const CONTEXT_SECTIONS: Partial<Record<ViewMode, ContextSection[]>> = {
  [VIEW_MODES.OVERVIEW]: OVERVIEW_SECTIONS,
  [VIEW_MODES.COPILOT_IMPACT]: COPILOT_IMPACT_SECTIONS,
  [VIEW_MODES.CLI_ADOPTION]: CLI_ADOPTION_SECTIONS,
};
