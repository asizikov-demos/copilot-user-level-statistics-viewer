'use client';

import type { ModelSelectionMode, ModelSelectionRequests } from '../../types/metrics';
import ChartContainer from '../ui/ChartContainer';
import CompositionChart from './CompositionChart';
import { chartColors, modelCategoryColors } from './utils/chartColors';

const MODE_LABELS: Record<ModelSelectionMode, string> = {
  user_selected: 'User selected',
  auto: 'Auto',
  product_selected: 'Product selected',
};

export default function ModelSelectionModeCharts({ data }: { data: ModelSelectionRequests }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Model types by selection mode, using successful model requests across all clients.
        Requests are model calls, not prompts or user interactions. Client traffic reported for{' '}
        {data.reportedRecords.toLocaleString()} of {data.recordCount.toLocaleString()} uploaded user-day records.
        {' '}{data.excludedRequestCount.toLocaleString()} requests with other, unknown, or unrecognized selection modes are excluded.
      </p>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {data.modes.map(({ mode, categories }) => {
          const label = MODE_LABELS[mode];
          const entries = categories.map(({ category, requestCount }) => ({
            label: category,
            value: requestCount,
            color: category === 'Code Review Model'
              ? chartColors.orange.solid
              : modelCategoryColors[category].solid,
          }));

          return (
            <ChartContainer
              key={mode}
              title={label}
              description="Model types by request count."
              chartHeight="h-auto"
              isEmpty={!entries.some(entry => entry.value > 0)}
              emptyState={data.reportedRecords === 0
                ? 'Client model traffic not reported'
                : `No ${label.toLowerCase()} model requests reported`}
            >
              <CompositionChart
                variant="doughnut"
                entries={entries}
                unit="requests"
                label={`${label} model types`}
              />
            </ChartContainer>
          );
        })}
      </div>
      <p className="text-xs text-muted">
        Types follow the Copilot model catalog; unmapped models appear as Uncategorized.
        Unknown models reported by the code review client appear as Code Review Model.
      </p>
    </div>
  );
}
