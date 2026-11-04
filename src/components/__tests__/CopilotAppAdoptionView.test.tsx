import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { aggregateMetrics } from '../../domain/metricsAggregator';
import { makeMetric } from '../../__tests__/factories/metrics';
import { makeCliTotals, makeModelFeatureTotal } from '../../__tests__/factories/metricTotals';
import { selectCopilotAppAdoptionReadModel } from '../../read-models/copilotAppAdoption';
import CopilotAppAdoptionView from '../CopilotAppAdoptionView';

vi.mock('react-chartjs-2', () => ({
  Bar: () => <div data-chart="bar" />,
  Chart: () => <div data-chart="mixed" />,
}));

describe('CopilotAppAdoptionView', () => {
  it('renders all five App charts and matching section anchors without CLI labels', () => {
    const metrics = aggregateMetrics([
      makeMetric({
        used_copilot_app: true,
        totals_by_copilot_app: makeCliTotals({ session_count: 2, request_count: 3 }),
        totals_by_model_feature: [makeModelFeatureTotal('gpt-4.1', 'copilot_app', 3)],
      }),
    ]).aggregated;
    const html = renderToStaticMarkup(
      <CopilotAppAdoptionView model={selectCopilotAppAdoptionReadModel(metrics)} />
    );

    for (const title of [
      'Copilot App Adoption',
      'Copilot App Adoption Trend',
      'Daily Copilot App Users',
      'Daily Copilot App Sessions',
      'Daily Copilot App Token Usage',
      'Copilot App Models Daily Usage',
    ]) {
      expect(html).toContain(title);
    }
    for (const id of ['app-adoption-trend', 'app-daily-users', 'app-daily-sessions', 'app-daily-tokens', 'app-models-usage']) {
      expect(html).toContain(`id="${id}"`);
    }
    expect(html).not.toContain('CLI');
    expect(html.match(/data-chart=/g)).toHaveLength(5);
  });
});
