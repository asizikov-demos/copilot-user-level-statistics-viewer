import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PhaseAssignmentSection } from '../sections/PhaseAssignmentSection';
import { PhaseComparisonSection } from '../sections/PhaseComparisonSection';

describe('AI adoption phase sections', () => {
  it('renders comparison empty state behind the comparison anchor', () => {
    const markup = renderToStaticMarkup(
      <PhaseComparisonSection sectionId="phase-comparison" aiAdoptionPhaseData={[]} />
    );

    expect(markup).toContain('id="phase-comparison"');
    expect(markup).toContain('No AI adoption phase data is available');
  });

  it('renders phase assignment definitions and the learn-more link', () => {
    const markup = renderToStaticMarkup(
      <PhaseAssignmentSection sectionId="phase-assignment" />
    );

    expect(markup).toContain('id="phase-assignment"');
    expect(markup).toContain('How phases are assigned');
    expect(markup).toContain('Phase 3');
    expect(markup).toContain('github.blog/changelog/2026-05-29-copilot-usage-metrics-api-adds-cohorts-for-ai-adoption');
  });
});
