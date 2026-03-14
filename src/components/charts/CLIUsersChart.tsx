'use client';

import { Bar } from 'react-chartjs-2';
import { registerChartJS } from './utils/chartSetup';
import { createBaseChartOptions, yAxisFormatters } from './utils/chartOptions';
import { createBarDataset } from './utils/chartStyles';
import { chartColors } from './utils/chartColors';
import { formatShortDate } from '../../utils/formatters';
import type { DailyCliSessionData } from '../../domain/calculators/metricCalculators';
import ChartContainer from '../ui/ChartContainer';

registerChartJS();

interface CLIUsersChartProps {
  data: DailyCliSessionData[];
}

export default function CLIUsersChart({ data }: CLIUsersChartProps) {
  const labels: string[] = [];
  const values: number[] = [];
  let sum = 0;
  let max = 0;

  for (const d of data) {
    labels.push(formatShortDate(d.date));
    values.push(d.uniqueUsers);
    sum += d.uniqueUsers;
    if (d.uniqueUsers > max) max = d.uniqueUsers;
  }

  const avg = data.length > 0 ? sum / data.length : 0;

  const chartData = {
    labels,
    datasets: [
      createBarDataset(chartColors.indigo.solid, 'CLI Users', values),
    ],
  };

  const options = createBaseChartOptions({
    xAxisLabel: 'Date',
    yAxisLabel: 'Users',
    yStepSize: 1,
    yTicksCallback: yAxisFormatters.integer,
    xMaxRotation: 45,
    xAutoSkip: true,
  });

  return (
    <ChartContainer
      title="Daily CLI Users"
      description="Number of unique CLI users per day."
      isEmpty={data.length === 0}
      emptyState="No CLI user data available"
      summaryStats={[
        { value: avg.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }), label: 'Avg Daily Users' },
        { value: max.toLocaleString(), label: 'Peak Daily Users' },
      ]}
    >
      <div className="h-full">
        <Bar data={chartData} options={options} />
      </div>
    </ChartContainer>
  );
}
