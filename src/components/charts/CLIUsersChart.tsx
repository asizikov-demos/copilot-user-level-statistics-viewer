'use client';

import { Bar } from 'react-chartjs-2';
import { registerChartJS } from './utils/chartSetup';
import { createBaseChartOptions, yAxisFormatters } from './utils/chartOptions';
import { createBarDataset } from './utils/chartStyles';
import { chartColors } from './utils/chartColors';
import { formatShortDate } from '../../utils/formatters';
import { calculateAverage, findMaxValue } from '../../domain/calculators/statsCalculators';
import type { DailyCliSessionData } from '../../domain/calculators/metricCalculators';
import ChartContainer from '../ui/ChartContainer';

registerChartJS();

interface CLIUsersChartProps {
  data: DailyCliSessionData[];
}

export default function CLIUsersChart({ data }: CLIUsersChartProps) {
  const avgUsers = calculateAverage(data, d => d.uniqueUsers);
  const maxUsers = findMaxValue(data, d => d.uniqueUsers);

  const chartData = {
    labels: data.map(d => formatShortDate(d.date)),
    datasets: [
      createBarDataset(chartColors.indigo.solid, 'CLI Users', data.map(d => d.uniqueUsers)),
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
        { value: avgUsers.toFixed(1), label: 'Avg Daily Users' },
        { value: maxUsers.toLocaleString(), label: 'Peak Daily Users' },
      ]}
    >
      <div className="h-full">
        <Bar data={chartData} options={options} />
      </div>
    </ChartContainer>
  );
}
