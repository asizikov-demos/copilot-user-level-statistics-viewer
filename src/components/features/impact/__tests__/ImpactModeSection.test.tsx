import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { ModeImpactData } from '../../../../domain/calculators/metricCalculators';
import { IMPACT_MODE_CONFIGS } from '../impactModeConfigs';
import { ImpactModeSection } from '../sections/ImpactModeSection';

const mocks = vi.hoisted(() => ({
  modeImpactChart: vi.fn(),
}));

vi.mock('../../../charts/ModeImpactChart', () => ({
  default: (props: Record<string, unknown>) => {
    mocks.modeImpactChart(props);
    return <span>mode impact chart</span>;
  },
}));

describe('ImpactModeSection', () => {
  it('passes mode impact config and data through the section boundary', () => {
    const data: ModeImpactData[] = [
      {
        date: '2026-07-01',
        userCount: 2,
        totalUniqueUsers: 3,
        locAdded: 20,
        locDeleted: 5,
        netChange: 15,
      },
    ];
    const config = IMPACT_MODE_CONFIGS[0];

    const markup = renderToStaticMarkup(
      <ImpactModeSection sectionId="combined-impact" data={data} config={config} />
    );

    expect(markup).toContain('id="combined-impact"');
    expect(mocks.modeImpactChart).toHaveBeenCalledWith({
      data,
      title: config.title,
      description: config.description,
      emptyStateMessage: config.emptyStateMessage,
      footer: undefined,
    });
  });
});
