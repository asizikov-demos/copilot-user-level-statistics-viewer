'use client';

import { Bar } from 'react-chartjs-2';
import type { ChartOptions } from 'chart.js';
import { useMemo } from 'react';
import { registerChartJS } from './utils/chartSetup';
import { createBaseChartOptions } from './utils/chartOptions';
import { createBarDataset } from './utils/chartStyles';
import { chartColors } from './utils/chartColors';
import { formatShortDate, generateDateRange } from '../../utils/formatters';
import type { DailyCodeReviewAdoptionData } from '../../domain/calculators/metricCalculators';
import ChartContainer from '../ui/ChartContainer';

registerChartJS();

interface CodeReviewAdoptionChartProps {
  data: DailyCodeReviewAdoptionData[];
  reportStartDay: string;
  reportEndDay: string;
}

function padCodeReviewAdoptionData(
  data: DailyCodeReviewAdoptionData[],
  reportStartDay: string,
  reportEndDay: string
): DailyCodeReviewAdoptionData[] {
  const dataByDate = new Map(data.map(day => [day.date, day]));

  return generateDateRange(reportStartDay, reportEndDay).map(date => ({
    date,
    activeUsers: dataByDate.get(date)?.activeUsers ?? 0,
    passiveUsers: dataByDate.get(date)?.passiveUsers ?? 0,
  }));
}

export default function CodeReviewAdoptionChart({
  data,
  reportStartDay,
  reportEndDay,
}: CodeReviewAdoptionChartProps) {
  const paddedData = useMemo(
    () => padCodeReviewAdoptionData(data, reportStartDay, reportEndDay),
    [data, reportStartDay, reportEndDay]
  );
  const peakActiveUsers = data.reduce((peak, day) => Math.max(peak, day.activeUsers), 0);
  const peakPassiveUsers = data.reduce((peak, day) => Math.max(peak, day.passiveUsers), 0);
  const activeUserDays = data.reduce((sum, day) => sum + day.activeUsers, 0);
  const passiveUserDays = data.reduce((sum, day) => sum + day.passiveUsers, 0);

  const chartData = {
    labels: paddedData.map(day => formatShortDate(day.date)),
    datasets: [
      createBarDataset(
        chartColors.cyan.solid,
        'Active CCR users',
        paddedData.map(day => day.activeUsers)
      ),
      createBarDataset(
        chartColors.indigo.solid,
        'Passive CCR users',
        paddedData.map(day => day.passiveUsers)
      ),
    ],
  };

  const options = createBaseChartOptions({
    xAxisLabel: 'Date',
    yAxisLabel: 'Unique Users',
    yStepSize: 1,
    xMaxRotation: 45,
    xAutoSkip: true,
  }) as ChartOptions<'bar'>;

  return (
    <ChartContainer
      title="Code Review Adoption"
      description="Daily number of unique active and passive Copilot Code Review users."
      isEmpty={false}
      summaryStats={[
        { value: peakActiveUsers.toLocaleString(), label: 'Peak Active Users' },
        { value: peakPassiveUsers.toLocaleString(), label: 'Peak Passive Users' },
        { value: (activeUserDays + passiveUserDays).toLocaleString(), label: 'CCR User-days' },
      ]}
    >
      <div className="h-full">
        <Bar data={chartData} options={options} />
      </div>
    </ChartContainer>
  );
}
