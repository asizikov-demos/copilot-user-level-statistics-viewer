export interface OverviewSection {
  id: string;
  label: string;
}

export const OVERVIEW_SECTIONS: OverviewSection[] = [
  { id: 'overview-working-patterns', label: 'Working patterns' },
  { id: 'overview-client-reach', label: 'Where people work' },
  { id: 'overview-workflow-reach', label: 'How Copilot is used' },
];
