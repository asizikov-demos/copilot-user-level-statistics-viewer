'use client';

import { Bar } from 'react-chartjs-2';
import { useMemo } from 'react';
import { registerChartJS } from './utils/chartSetup';
import { chartColors } from './utils/chartColors';
import { createDailyBarChartConfig, padDailyReportRangeData } from './utils/dailyBarChart';
import type { DailyCloudAgentAdoptionData } from '../../domain/calculators/metricCalculators';
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
  return padDailyReportRangeData(
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

  const { chartData, options } = createDailyBarChartConfig({
    data: paddedData,
    getDate: day => day.date,
    series: [
      {
        color: chartColors.teal.solid,
        label: 'Cloud Agent users',
        getValue: day => day.uniqueUsers,
      },
    ],
    options: {
      xAxisLabel: 'Date',
      yAxisLabel: 'Unique Users',
      yStepSize: 1,
      xMaxRotation: 45,
      xAutoSkip: true,
    },
  });

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
