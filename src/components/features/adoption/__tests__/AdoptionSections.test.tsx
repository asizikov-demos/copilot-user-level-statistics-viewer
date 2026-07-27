import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { CopilotAdoptionReadModel } from '../../../../read-models/adoption';
import { AdoptionTrendSection } from '../sections/AdoptionTrendSection';
import { AgentModeHeatmapSection } from '../sections/AgentModeHeatmapSection';
import { FeatureAdoptionSection } from '../sections/FeatureAdoptionSection';

const mocks = vi.hoisted(() => ({
  adoptionTrendChart: vi.fn(),
  agentModeHeatmapChart: vi.fn(),
  featureAdoptionChart: vi.fn(),
}));

vi.mock('../charts/AdoptionTrendChart', () => ({
  default: (props: Record<string, unknown>) => {
    mocks.adoptionTrendChart(props);
    return <span>adoption trend chart</span>;
  },
}));

vi.mock('../charts/AgentModeHeatmapChart', () => ({
  default: (props: Record<string, unknown>) => {
    mocks.agentModeHeatmapChart(props);
    return <span>agent heatmap chart</span>;
  },
}));

vi.mock('../../../charts/FeatureAdoptionChart', () => ({
  default: (props: Record<string, unknown>) => {
    mocks.featureAdoptionChart(props);
    return <span>feature adoption chart</span>;
  },
}));

describe('adoption sections', () => {
  it('keeps feature adoption rendering behind the requested section anchor', () => {
    const data: NonNullable<CopilotAdoptionReadModel['featureAdoptionData']> = {
      totalUsers: 5,
      completionUsers: 4,
      completionOnlyUsers: 1,
      chatUsers: 3,
      agentModeUsers: 2,
      askModeUsers: 1,
      inlineModeUsers: 1,
      planModeUsers: 1,
      cliUsers: 1,
      codingAgentUsers: 1,
      codeReviewUsers: 1,
      advancedUsers: 2,
    };

    const markup = renderToStaticMarkup(
      <FeatureAdoptionSection sectionId="feature-adoption" data={data} />
    );

    expect(markup).toContain('id="feature-adoption"');
    expect(mocks.featureAdoptionChart).toHaveBeenCalledWith({ data });
  });

  it('passes heatmap and trend data through narrow section props', () => {
    const heatmapData: CopilotAdoptionReadModel['agentModeHeatmapData'] = [
      {
        date: '2026-07-01',
        agentModeRequests: 3,
        uniqueUsers: 2,
        intensity: 3,
      },
    ];
    const trendData: CopilotAdoptionReadModel['dailyAdoptionTrend'] = [
      {
        date: '2026-07-01',
        newUsers: 1,
        returningUsers: 2,
        cumulativeUsers: 3,
        totalActiveUsers: 3,
      },
    ];

    renderToStaticMarkup(
      <>
        <AgentModeHeatmapSection sectionId="agent-heatmap" data={heatmapData} />
        <AdoptionTrendSection
          sectionId="trend"
          data={trendData}
          reportStartDay="2026-07-01"
          reportEndDay="2026-07-31"
        />
      </>
    );

    expect(mocks.agentModeHeatmapChart).toHaveBeenCalledWith({ data: heatmapData });
    expect(mocks.adoptionTrendChart).toHaveBeenCalledWith({
      data: trendData,
      reportStartDay: '2026-07-01',
      reportEndDay: '2026-07-31',
    });
  });
});
