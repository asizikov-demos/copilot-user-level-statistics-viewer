import type { LabelColorOptions } from '@primer/react';

/**
 * Copilot features rendered as Primer `Label`s (Users table, user summary, day dialog).
 *
 * Labels are colored by surface family so a feature keeps the same color in every view:
 * IDE features use `accent`, GitHub-based surfaces (CLI, Copilot App, cloud agent,
 * code review) use `sponsors`, and baseline completions stay neutral.
 */
export type FeatureLabelKey =
  | 'completions'
  | 'chat'
  | 'ideAgent'
  | 'vscodeAgent'
  | 'autoMode'
  | 'cli'
  | 'copilotApp'
  | 'cloudAgent'
  | 'codeReview';

export const FEATURE_LABEL_VARIANT: Readonly<Record<FeatureLabelKey, LabelColorOptions>> = {
  completions: 'secondary',
  chat: 'accent',
  ideAgent: 'accent',
  vscodeAgent: 'accent',
  autoMode: 'accent',
  cli: 'sponsors',
  copilotApp: 'sponsors',
  cloudAgent: 'sponsors',
  codeReview: 'sponsors',
};
