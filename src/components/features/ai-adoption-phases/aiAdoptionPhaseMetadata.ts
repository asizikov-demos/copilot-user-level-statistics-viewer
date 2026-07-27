export const AI_ADOPTION_PHASE_BLOG_URL = 'https://github.blog/changelog/2026-05-29-copilot-usage-metrics-api-adds-cohorts-for-ai-adoption/#whats-new';

export const PHASE_PILL_CLASS = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800';

export const PHASE_DEFINITIONS = [
  {
    phaseNumber: 0,
    phase: 'No cohort',
    description: 'User did not meet the engagement criteria for any phase.',
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
