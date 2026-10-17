// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import UserDetailsImpactBreakdownSection from '../sections/UserDetailsImpactBreakdownSection';

vi.mock('../../../charts/ModeImpactChart', () => ({
  default: ({ title }: { title: string }) => <h2>{title}</h2>,
}));

describe('UserDetailsImpactBreakdownSection', () => {
  it('omits Edit Mode from the expanded user impact breakdown', () => {
    render(
      <UserDetailsImpactBreakdownSection
        sectionId="impact-breakdown"
        isExpanded
        onToggle={vi.fn()}
        agentImpact={[]}
        askModeImpact={[]}
        completionImpact={[]}
        copilotAppImpact={[]}
        cliImpact={[]}
      />,
    );

    expect(screen.queryByRole('heading', { name: /Edit Mode Impact/ })).toBeNull();
    expect(screen.getAllByRole('heading', { level: 2 }).map(heading => heading.textContent)).toEqual([
      'Copilot Agent Mode Impact',
      'Ask Mode Impact',
      'Completions Impact',
      'Copilot App Impact',
      'CLI Impact',
    ]);
  });
});
