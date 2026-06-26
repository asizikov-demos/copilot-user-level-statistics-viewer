'use client';

import { Bar } from 'react-chartjs-2';
import type { ChartOptions } from 'chart.js';
import { useMemo } from 'react';
import { registerChartJS } from './utils/chartSetup';
import { createBaseChartOptions } from './utils/chartOptions';
import { createBarDataset } from './utils/chartStyles';
import { chartColors } from './utils/chartColors';
import { formatShortDate } from '../../utils/formatters';
import type { DailyCloudAgentAdoptionData } from '../../domain/calculators/metricCalculators';
import { padReportRangeWithDefaults } from '../../utils/timeSeries';
import ChartContainer from '../ui/ChartContainer';

registerChartJS();

interface CloudAgentAdoptionChartProps {
  data: DailyCloudAgentAdoptionData[];
  reportStartDay: string;
  reportEndDay: string;
}

function padCloudAgentAdoptionData(
  data: DailyCloudAgentAdoptionData[],
  reportStartDay: string,
  reportEndDay: string
): DailyCloudAgentAdoptionData[] {
  return padReportRangeWithDefaults(
    data,
    reportStartDay,
    reportEndDay,
    day => day.date,
    date => ({ date, uniqueUsers: 0 }),
  );
}

export default function CloudAgentAdoptionChart({
  data,
  reportStartDay,
  reportEndDay,
}: CloudAgentAdoptionChartProps) {
  const paddedData = useMemo(
    () => padCloudAgentAdoptionData(data, reportStartDay, reportEndDay),
    [data, reportStartDay, reportEndDay]
  );
  const peakDailyUsers = data.reduce((peak, day) => Math.max(peak, day.uniqueUsers), 0);
  const userDays = data.reduce((sum, day) => sum + day.uniqueUsers, 0);

  const chartData = {
    labels: paddedData.map(day => formatShortDate(day.date)),
    datasets: [
      createBarDataset(
        chartColors.teal.solid,
        'Cloud Agent users',
        paddedData.map(day => day.uniqueUsers)
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
      title="Cloud Agent Adoption"
      description="Daily number of unique users using Copilot Cloud Agent."
      isEmpty={false}
      summaryStats={[
        { value: peakDailyUsers.toLocaleString(), label: 'Peak Daily Users' },
        { value: data.length.toLocaleString(), label: 'Active Days' },
        { value: userDays.toLocaleString(), label: 'User-days' },
      ]}
    >
      <div className="h-full">
        <Bar data={chartData} options={options} />
      </div>
    </ChartContainer>
  );
}
