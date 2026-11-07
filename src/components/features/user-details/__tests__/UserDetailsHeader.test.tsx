import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import UserDetailsHeader from '../sections/UserDetailsHeader';
import type { UserDetailsHeaderReadModel } from '../../../../read-models/userDetails';

const summary: UserDetailsHeaderReadModel = {
  daysActive: 1,
  reportDays: 28,
  activeDaysPercent: 4,
  interactions: 1,
  interactionRank: { rank: 1, totalUsers: 1 },
  topPercent: 100,
  locAdded: 0,
  locDeleted: 0,
  netLoc: 0,
  aiCreditsUsed: 0,
  primaryClient: null,
  surfacesUsed: 1,
  daysSinceLastActive: 0,
};

describe('UserDetailsHeader adoption phase', () => {
  it('explains the phase-zero display label without implying chat-only use', () => {
    const markup = renderToStaticMarkup(
      <UserDetailsHeader
        userLogin="octocat"
        userId={1}
        aiAdoptionPhase={{ phase_number: 0, phase: 'No Cohort', version: 'v1' }}
        summary={summary}
        onBackToUsers={() => {}}
        onCopyUserLogin={() => {}}
      />
    );

    expect(markup).toContain('P0 · Chat-first users');
    expect(markup).toContain('qualifying feature usage on at least two days in the 28-day period');
    expect(markup).toContain('This does not mean they used only chat.');
  });
});
