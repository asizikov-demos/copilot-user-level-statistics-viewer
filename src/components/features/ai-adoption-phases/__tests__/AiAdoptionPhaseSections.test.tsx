import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PhaseAssignmentSection } from '../sections/PhaseAssignmentSection';
import { PhaseComparisonSection } from '../sections/PhaseComparisonSection';
import { PhaseDepthHeader } from '../sections/PhaseDepthHeader';
import type { AiAdoptionPhaseData } from '../../../../domain/calculators';

function phaseEntry(phaseNumber: number, userCount: number): AiAdoptionPhaseData {
  return {
    phase: { phase_number: phaseNumber, phase: `Phase ${phaseNumber}`, version: '1' },
    userCount,
    avgUserInitiatedInteractions: 0,
    totalLocAdded: 0,
    totalLocDeleted: 0,
    avgLocAdded: 0,
    avgLocDeleted: 0,
    avgAiCreditsUsed: 0,
    avgDaysActive: 0,
    topModels: [],
    topClients: [],
    topLanguages: [],
  };
}

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

  it('renders the adoption depth header with the lede, ribbon, and phase details', () => {
    const markup = renderToStaticMarkup(
      <PhaseDepthHeader
       
        aiAdoptionPhaseData={[phaseEntry(0, 96), phaseEntry(1, 702), phaseEntry(2, 318), phaseEntry(3, 132)]}
      />
    );

    expect(markup).not.toContain('<h2');
    expect(markup).toContain('1,248</span> people used Copilot.');
    expect(markup).toContain('450</span> reached GitHub agent surfaces.');
    expect(markup).toContain('>56%<');
    expect(markup).toContain('Phase 3 · <span class="tabular-nums">132</span>');
    expect(markup).toContain('Two or more agent surfaces, or Copilot app');
    expect(markup).not.toContain('Completions ·');
    expect(markup).not.toContain('Not reported');
  });

  it('accounts for users without a reported phase', () => {
    const markup = renderToStaticMarkup(
      <PhaseDepthHeader aiAdoptionPhaseData={[phaseEntry(1, 60), phaseEntry(-1, 40)]} />
    );

    expect(markup).toContain('100</span> people used Copilot.');
    expect(markup).toContain('Not reported · <span class="tabular-nums">40</span>');
    expect(markup).toContain('>40%<');
    expect(markup).toContain('None reached GitHub agent surfaces yet.');
  });

  it('renders an empty adoption depth header without a ribbon', () => {
    const markup = renderToStaticMarkup(<PhaseDepthHeader aiAdoptionPhaseData={[]} />);

    expect(markup).toContain('No AI adoption phase data is available');
    expect(markup).not.toContain('role="img"');
  });
});
