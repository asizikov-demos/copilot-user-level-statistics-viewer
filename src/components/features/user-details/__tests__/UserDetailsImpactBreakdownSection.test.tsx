// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ModeImpactData } from '../../../../domain/calculators/metricCalculators';
import UserDetailsImpactBreakdownSection from '../sections/UserDetailsImpactBreakdownSection';

vi.mock('../../../charts/ModeImpactChart', () => ({
  default: ({ title }: { title: string }) => <h2>{title}</h2>,
}));

const withLoc = (locAdded: number, locDeleted = 0): ModeImpactData[] => [
  { date: '2026-01-01', locAdded, locDeleted, netChange: locAdded - locDeleted, userCount: 1, totalUniqueUsers: 1 },
];

describe('UserDetailsImpactBreakdownSection', () => {
  it('omits Edit Mode from the expanded user impact breakdown', () => {
    render(
      <UserDetailsImpactBreakdownSection
        sectionId="impact-breakdown"
        isExpanded
        onToggle={vi.fn()}
        agentImpact={withLoc(1)}
        askModeImpact={withLoc(0, 2)}
        completionImpact={withLoc(3)}
        copilotAppImpact={withLoc(4)}
        cliImpact={withLoc(5)}
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

  it('omits categories without LOC data and the section when none have any', () => {
    const props = { sectionId: 'impact-breakdown', isExpanded: true, onToggle: vi.fn() };
    const { container, rerender } = render(
      <UserDetailsImpactBreakdownSection {...props} agentImpact={withLoc(1)} askModeImpact={[]} completionImpact={withLoc(0)} copilotAppImpact={[]} cliImpact={[]} />,
    );
    expect(screen.getAllByRole('heading', { level: 2 }).map(h => h.textContent)).toEqual(['Copilot Agent Mode Impact']);

    rerender(
      <UserDetailsImpactBreakdownSection {...props} agentImpact={[]} askModeImpact={[]} completionImpact={[]} copilotAppImpact={[]} cliImpact={[]} />,
    );
    expect(container.firstChild).toBeNull();
  });
});
