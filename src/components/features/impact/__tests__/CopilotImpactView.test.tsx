// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { makeAggregatedMetrics } from '../../../../__tests__/factories/aggregatedMetrics';
import { selectCopilotImpactReadModel } from '../../../../read-models/impact';
import { COPILOT_IMPACT_SECTIONS } from '../../../layout/contextSections';
import CopilotImpactView from '../CopilotImpactView';

vi.mock('../../../charts/ModeImpactChart', () => ({
  default: ({ title }: { title: string }) => <h2>{title}</h2>,
}));

describe('CopilotImpactView', () => {
  it('renders the remaining impact charts with matching navigation targets and no Edit Mode chart', () => {
    const { container } = render(
      <CopilotImpactView model={selectCopilotImpactReadModel(makeAggregatedMetrics())} />,
    );

    expect(screen.queryByRole('heading', { name: 'Copilot Edit Mode Impact' })).toBeNull();
    expect(screen.queryByText('Edit Mode Deprecation')).toBeNull();
    expect(COPILOT_IMPACT_SECTIONS.map(section => section.id)).not.toContain('impact-edit');
    expect(screen.getAllByRole('heading', { level: 2 }).map(heading => heading.textContent)).toEqual([
      'Copilot Impact Analysis',
      'Combined Copilot Impact',
      'Copilot Agent Mode Impact',
      'Copilot App Impact',
      'Copilot CLI Impact',
      'Code Completion Impact',
      'Copilot Ask Mode Impact',
      'Copilot Inline Mode Impact',
    ]);
    for (const section of COPILOT_IMPACT_SECTIONS) {
      expect(container.querySelector(`#${section.id} h2`)).not.toBeNull();
    }
  });
});
