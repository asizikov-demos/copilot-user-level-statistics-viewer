import InsightsCard from '../../ui/InsightsCard';

export const IMPACT_MODE_CONFIGS = [
  {
    mode: 'combined',
    title: 'Combined Copilot Impact',
    description: 'Aggregate impact across Code Completion, Ask Mode, Agent Mode, Edit Mode, Inline Mode, and CLI activities.',
    emptyStateMessage: 'No combined impact data available.',
  },
  {
    mode: 'agent',
    title: 'Copilot Agent Mode Impact',
    description: 'Daily lines of code added and deleted through Copilot Agent Mode sessions.',
    emptyStateMessage: 'No agent mode impact data available.',
  },
  {
    mode: 'cli',
    title: 'Copilot CLI Impact',
    description: 'Daily lines of code added and deleted through Copilot CLI sessions.',
    emptyStateMessage: 'No CLI impact data available.',
  },
  {
    mode: 'codeCompletion',
    title: 'Code Completion Impact',
    description: 'Daily lines of code added and deleted when developers accept Copilot code completions.',
    emptyStateMessage: 'No code completion impact data available.',
  },
  {
    mode: 'ask',
    title: 'Copilot Ask Mode Impact',
    description: 'Lines of code copied or applied into files from Copilot Chat Ask Mode responses. Ask Mode does not edit files directly — these counts reflect suggestions the developer chose to accept.',
    emptyStateMessage: 'No Ask Mode impact data available.',
  },
  {
    mode: 'inline',
    title: 'Copilot Inline Mode Impact',
    description: 'Daily lines of code added and deleted when developers work inline with Copilot.',
    emptyStateMessage: 'No Inline Mode impact data available.',
  },
  {
    mode: 'edit',
    title: 'Copilot Edit Mode Impact',
    description: "Daily lines of code added and deleted through Copilot's Edit Mode sessions.",
    emptyStateMessage: 'No Edit Mode impact data available.',
    footer: (
      <InsightsCard title="Edit Mode Deprecation" variant="orange">
        Edit mode is deprecated and will be removed in newer versions of IDE clients.
      </InsightsCard>
    ),
  },
] as const;

export type ImpactModeConfig = (typeof IMPACT_MODE_CONFIGS)[number];
