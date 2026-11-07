import type { LabelColorOptions } from '@primer/react';

export const AI_ADOPTION_PHASE_BLOG_URL = 'https://github.blog/changelog/2026-05-29-copilot-usage-metrics-api-adds-cohorts-for-ai-adoption/#whats-new';

/** Primer `Label` variant used wherever an AI adoption phase is shown. */
export const PHASE_LABEL_VARIANT: LabelColorOptions = 'done';

export const CHAT_FIRST_DESCRIPTION = 'Active users who did not meet any phase’s engagement criteria: qualifying feature usage on at least two days in the 28-day period. This does not mean they used only chat.';

export const PHASE_DEFINITIONS = [
  {
    phaseNumber: 0,
    phase: 'Chat-first users',
    description: CHAT_FIRST_DESCRIPTION,
  },
  {
    phaseNumber: 1,
    phase: 'Phase 1',
    description: 'User engaged with code completion and/or IDE agent mode.',
  },
  {
    phaseNumber: 2,
    phase: 'Phase 2',
    description:
      'User engaged with a single GitHub-based agent surface, such as Copilot cloud agent, Copilot code review, or Copilot CLI.',
  },
  {
    phaseNumber: 3,
    phase: 'Phase 3',
    description: 'User engaged with two or more GitHub-based agent surfaces, or with the GitHub Copilot app.',
  },
] as const;
