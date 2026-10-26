'use client';

import { Bar } from 'react-chartjs-2';
import { registerChartJS } from '../../charts/utils/chartSetup';
import { createHorizontalBarChartOptions } from '../../charts/utils/chartOptions';
import { createBarDataset } from '../../charts/utils/chartStyles';
import ChartContainer from '../../ui/ChartContainer';
import type { CustomizationsReadModel } from '../../../read-models/customizations';
import { CUSTOMIZATION_META, CUSTOMIZATION_ORDER } from './meta';
import { Card, ShareBar, formatNumber, formatPercent } from './shared';

registerChartJS();

const TOP_N = 10;

export function CustomizationsSummaryCards({ model }: { model: CustomizationsReadModel }) {
  const { totalUsers } = model;
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {CUSTOMIZATION_ORDER.map(type => {
        const stats = model.types[type];
        const meta = CUSTOMIZATION_META[type];
        const named = stats.items.filter(i => !i.unnamed).length;
        const unnamedShare = stats.totalEvents > 0 ? (stats.unnamedEvents / stats.totalEvents) * 100 : 0;
        const adoption = totalUsers > 0 ? stats.users / totalUsers : 0;
        return (
          <Card key={type}>
            <div className="text-xs font-medium text-muted">{meta.title}</div>
            <div className="mt-1 text-2xl font-semibold tabular-nums text-default">{formatPercent(adoption * 100)}</div>
            <div className="mb-2 text-xs text-muted">{formatNumber(stats.users)} of {formatNumber(totalUsers)} users</div>
            <ShareBar fraction={adoption} color={meta.color.solid} />
            <dl className="m-0 mt-3 grid grid-cols-2 gap-y-1 text-xs">
              <dt className="text-muted">Named {meta.singular.toLowerCase()}s</dt>
              <dd className="m-0 text-right tabular-nums text-default">{formatNumber(named)}</dd>
              <dt className="text-muted">Total {meta.measure}</dt>
              <dd className="m-0 text-right tabular-nums text-default">{formatNumber(stats.totalEvents)}</dd>
              <dt className="text-muted">Unnamed share</dt>
              <dd className="m-0 text-right tabular-nums text-default">{formatPercent(unnamedShare)}</dd>
            </dl>
          </Card>
        );
      })}
    </div>
  );
}

export function CustomizationsTopCharts({ model }: { model: CustomizationsReadModel }) {
  const options = createHorizontalBarChartOptions({ showLegend: false });
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {CUSTOMIZATION_ORDER.map(type => {
        const meta = CUSTOMIZATION_META[type];
        const top = model.types[type].items.filter(i => !i.unnamed).slice(0, TOP_N);
        const chartData = {
          labels: top.map(i => i.name),
          datasets: [createBarDataset(meta.color.solid, meta.measure, top.map(i => i.totalEvents))],
        };
        return (
          <ChartContainer
            key={type}
            title={`Top ${meta.title.toLowerCase()}`}
            description={`Named items only, ranked by ${meta.measure}. Unnamed buckets are excluded.`}
            isEmpty={top.length === 0}
            emptyState="No named items reported"
            chartHeight="h-96"
          >
            <div className="h-full"><Bar data={chartData} options={options} /></div>
          </ChartContainer>
        );
      })}
    </div>
  );
}
