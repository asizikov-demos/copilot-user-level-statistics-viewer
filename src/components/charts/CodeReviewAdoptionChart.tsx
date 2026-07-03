'use client';

import { Bar } from 'react-chartjs-2';
import { useMemo } from 'react';
import { registerChartJS } from './utils/chartSetup';
import { chartColors } from './utils/chartColors';
import { createDailyBarChartConfig, padDailyReportRangeData } from './utils/dailyBarChart';
import type { DailyCodeReviewAdoptionData } from '../../domain/calculators/metricCalculators';
import ChartContainer from '../ui/ChartContainer';

registerChartJS();

interface CodeReviewAdoptionChartProps {
  data: DailyCodeReviewAdoptionData[];
  reportStartDay: string;
  reportEndDay: string;
}

function getTotalUsers(day: DailyCodeReviewAdoptionData): number {
  return day.totalUsers ?? Math.max(day.activeUsers, day.passiveUsers);
}

function padCodeReviewAdoptionData(
  data: DailyCodeReviewAdoptionData[],
  reportStartDay: string,
  reportEndDay: string
): DailyCodeReviewAdoptionData[] {
  return padDailyReportRangeData(
    data,
    reportStartDay,
    reportEndDay,
    day => day.date,
    date => ({
      date,
      activeUsers: 0,
      passiveUsers: 0,
      totalUsers: 0,
    }),
    day => ({
      ...day,
      totalUsers: getTotalUsers(day),
    }),
  );
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
  const totalUserDays = data.reduce((sum, day) => sum + getTotalUsers(day), 0);

  const { chartData, options } = createDailyBarChartConfig({
    data: paddedData,
    getDate: day => day.date,
    series: [
      {
        color: chartColors.cyan.solid,
        label: 'Active CCR users',
        getValue: day => day.activeUsers,
      },
      {
        color: chartColors.indigo.solid,
        label: 'Passive CCR users',
        getValue: day => day.passiveUsers,
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
      title="Code Review Adoption"
      description="Daily number of unique active and passive Copilot Code Review users."
      isEmpty={false}
      summaryStats={[
        { value: peakActiveUsers.toLocaleString(), label: 'Peak Active Users' },
        { value: peakPassiveUsers.toLocaleString(), label: 'Peak Passive Users' },
        { value: totalUserDays.toLocaleString(), label: 'CCR User-days' },
      ]}
    >
      <div className="h-full">
        <Bar data={chartData} options={options} />
      </div>
    </ChartContainer>
  );
}
