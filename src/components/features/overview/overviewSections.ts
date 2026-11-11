export interface OverviewSection {
  id: string;
  label: string;
}

export const OVERVIEW_SECTIONS: OverviewSection[] = [
  { id: 'overview-working-patterns', label: 'Working Patterns' },
  { id: 'overview-client-reach', label: 'Where people work' },
  { id: 'overview-workflow-reach', label: 'How Copilot is used' },
];
