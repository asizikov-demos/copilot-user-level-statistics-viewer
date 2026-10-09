'use client';

import { useEffect, useMemo, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { registerChartJS } from './utils/chartSetup';
import { yAxisFormatters } from './utils/chartOptions';
import { createBarDataset } from './utils/chartStyles';
import { createDailyReportRangeChartConfig } from './utils/dailyBarChart';
import { getIdeColor } from './utils/chartColors';
import { formatShortDate } from '../../utils/formatters';
import { getIDEIcon, formatIDEName } from '../icons/IDEIcons';
import ChartContainer from '../ui/ChartContainer';
import type { DailyIdeUsersData } from '../../domain/calculators/dailyIdeUsersCalculator';
import type { ClientTelemetryWarning } from '../../domain/calculators/clientTelemetryCalculator';
import { getIDEMetadata } from '../../utils/ideMetadata';
import ClientTelemetryNotice from '../ClientTelemetryNotice';

registerChartJS();

interface DailyIDEUsersChartProps {
  data: DailyIdeUsersData;
  reportStartDay: string;
  reportEndDay: string;
  telemetryWarnings?: ClientTelemetryWarning[];
}

export default function DailyIDEUsersChart({
  data,
  reportStartDay,
  reportEndDay,
  telemetryWarnings = [],
}: DailyIDEUsersChartProps) {
  const [selectedIde, setSelectedIde] = useState<string>('');

  const defaultIde = data.length > 0 ? data[0].ide : '';
  const activeIde = data.some(entry => entry.ide === selectedIde)
    ? selectedIde
    : defaultIde;

  useEffect(() => {
    if (selectedIde && !data.some(entry => entry.ide === selectedIde)) {
      setSelectedIde('');
    }
  }, [data, selectedIde]);

  const activeEntry = data.find(entry => entry.ide === activeIde);
  const activeTelemetryWarnings = useMemo(() => {
    const canonicalIde = getIDEMetadata(activeIde)?.canonicalKey;
    return telemetryWarnings.filter(warning => warning.ide === canonicalIde);
  }, [activeIde, telemetryWarnings]);

  const activeDays = activeEntry?.daily ?? [];
  const peakDailyUsers = activeDays.reduce(
    (max, day) => Math.max(max, day.uniqueUsers),
    0
  );
  const avgDailyUsers = activeDays.length > 0
    ? activeDays.reduce((sum, day) => sum + day.uniqueUsers, 0) / activeDays.length
    : 0;

  const ideLabel = activeIde ? formatIDEName(activeIde) : '';
  const IDEIcon = getIDEIcon(activeIde);
  const color = getIdeColor(activeIde, 0);

  const { displayData, chartData, options } = useMemo(
    () => createDailyReportRangeChartConfig<
      DailyIdeUsersData[number]['daily'][number],
      'bar'
    >({
      data: activeEntry?.daily ?? [],
      reportStartDay,
      reportEndDay,
      type: 'bar',
      series: [{
        color,
        label: `${ideLabel} Users`,
        getValue: day => day?.uniqueUsers ?? 0,
      }],
      createDataset: (series, values) => createBarDataset(series.color, series.label, values),
      options: () => ({
        xAxisLabel: 'Date',
        yAxisLabel: 'Users',
        showLegend: false,
        yStepSize: 1,
        yTicksCallback: yAxisFormatters.integer,
        xMaxRotation: 45,
        xAutoSkip: true,
        tooltipLabelCallback: context => {
          const value = context.parsed.y || 0;
          return `${ideLabel}: ${value} ${value === 1 ? 'user' : 'users'}`;
        },
      }),
    }),
    [activeEntry, color, ideLabel, reportEndDay, reportStartDay]
  );
  const chartAriaLabel = `Daily IDE Users for ${ideLabel}: ${displayData
    .map(day => {
      const uniqueUsers = day.entry?.uniqueUsers ?? 0;
      return `${formatShortDate(day.date)}, ${uniqueUsers} ${uniqueUsers === 1 ? 'user' : 'users'}`;
    })
    .join('; ')}.`;

  return (
    <ChartContainer
      title="Daily IDE Users"
      description="Unique users interacting with the selected client each day."
      isEmpty={data.length === 0}
      emptyState="No client usage data available"
      footer={<ClientTelemetryNotice key={activeIde} warnings={activeTelemetryWarnings} />}
      headerActions={
        <div className="min-w-44">
          <label htmlFor="daily-ide-users-filter" className="block text-xs font-medium text-gray-700 mb-1">
            Client
          </label>
          <select
            id="daily-ide-users-filter"
            value={activeIde}
            onChange={event => setSelectedIde(event.target.value)}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
          >
            {data.map(entry => (
              <option key={entry.ide} value={entry.ide}>
                {formatIDEName(entry.ide)}
              </option>
            ))}
          </select>
        </div>
      }
      summaryStats={[
        { value: activeEntry?.totalUniqueUsers ?? 0, label: 'Unique Users', colorClass: 'text-indigo-600' },
        {
          value: avgDailyUsers.toLocaleString(undefined, {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1,
          }),
          label: 'Avg Daily Users',
        },
        { value: peakDailyUsers.toLocaleString(), label: 'Peak Daily Users' },
      ]}
    >
      <div className="flex h-full flex-col">
        <div className="mb-3 flex items-center justify-center gap-2">
          <span
            className="inline-block h-3 w-3 rounded-sm"
            style={{ backgroundColor: color }}
            aria-hidden="true"
          />
          <IDEIcon />
          <span className="text-sm font-medium text-gray-900">{ideLabel}</span>
        </div>
        <div className="min-h-0 flex-1">
          <Bar
            data={chartData}
            options={options}
            role="img"
            aria-label={chartAriaLabel}
          />
        </div>
      </div>
    </ChartContainer>
  );
}
