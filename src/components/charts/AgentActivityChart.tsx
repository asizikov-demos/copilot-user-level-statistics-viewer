'use client';

import { useState } from 'react';
import { Bar } from 'react-chartjs-2';
import type { ChartOptions } from 'chart.js';
import type { AgentActivity, AgentSurface } from '../../types/agentActivity';
import { formatShortDate } from '../../utils/formatters';
import { mapReportRangeData } from '../../utils/timeSeries';
import ChartContainer from '../ui/ChartContainer';
import { registerChartJS } from './utils/chartSetup';
import { createBaseChartOptions, yAxisFormatters } from './utils/chartOptions';
import { createBarDataset } from './utils/chartStyles';
import { chartColors } from './utils/chartColors';

registerChartJS();

const surfaces = [
  { key: 'cli', label: 'Copilot CLI', inputLabel: 'Prompts', color: chartColors.blue.solid },
  { key: 'app', label: 'Copilot App', inputLabel: 'Prompts', color: chartColors.black.solid },
  { key: 'vscodeAgents', label: 'VS Code Agents', inputLabel: 'User messages', color: chartColors.green.solid },
] as const satisfies ReadonlyArray<{ key: AgentSurface; label: string; inputLabel: string; color: string }>;

function formatCount(value: number | null | undefined): string {
  return value == null ? 'Not reported' : value.toLocaleString();
}

interface AgentActivityChartProps {
  data: AgentActivity;
  reportStartDay: string;
  reportEndDay: string;
}

export default function AgentActivityChart({ data, reportStartDay, reportEndDay }: AgentActivityChartProps) {
  const [measure, setMeasure] = useState<'sessions' | 'userInputs'>('sessions');
  const reportedSurfaces = surfaces.filter(surface =>
    data.summary[surface.key].sessions !== null || data.summary[surface.key].userInputs !== null,
  );
  if (reportedSurfaces.length === 0) return null;

  const visibleSurfaces = reportedSurfaces.filter(surface => data.summary[surface.key][measure] !== null);
  const displayData = mapReportRangeData(
    data.daily, reportStartDay, reportEndDay, day => day.date,
    (date, day) => ({ date, day }),
  );
  const isSessions = measure === 'sessions';
  const title = isSessions ? 'Daily agent sessions' : 'Daily agent prompts & messages';
  const options = createBaseChartOptions({
    xAxisLabel: 'Date',
    yAxisLabel: isSessions ? 'Reported sessions' : 'Reported prompts / messages',
    yTicksCallback: yAxisFormatters.integer,
    xAutoSkip: true,
    tooltipLabelCallback: context => {
      const surface = visibleSurfaces[context.datasetIndex];
      const counts = displayData[context.dataIndex].day?.[surface.key];
      return [
        surface.label,
        `Sessions: ${formatCount(counts?.sessions)}`,
        `${surface.inputLabel}: ${formatCount(counts?.userInputs)}`,
        ...(surface.key === 'vscodeAgents' ? [] : [`Requests: ${formatCount(counts?.requests)}`]),
      ];
    },
  }) as ChartOptions<'bar'>;

  return (
    <ChartContainer
      title={title}
      description="Copilot CLI, Copilot App, and the dedicated VS Code Agents window, separate from editor Agent Mode."
      headerActions={(
        <label className="text-sm text-gray-600">
          <span className="sr-only">Agent activity measure</span>
          <select
            value={measure}
            onChange={event => setMeasure(event.target.value === 'sessions' ? 'sessions' : 'userInputs')}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900"
          >
            <option value="sessions">Sessions</option>
            <option value="userInputs">Prompts &amp; messages</option>
          </select>
        </label>
      )}
      summaryStats={reportedSurfaces.map(surface => ({
        label: `${surface.label} ${isSessions ? 'sessions' : surface.inputLabel.toLowerCase()}`,
        value: formatCount(data.summary[surface.key][measure]),
      }))}
      footer={(
        <p className="text-xs text-gray-500">
          Only reported counts are included. Missing values are not zero.
          {' '}{isSessions
            ? 'Sessions are counted per surface, not deduplicated across surfaces.'
            : 'CLI and App report prompts; VS Code Agents reports user messages. Counting definitions may differ.'}
        </p>
      )}
    >
      {visibleSurfaces.length > 0 ? (
        <Bar
          data={{
            labels: displayData.map(entry => formatShortDate(entry.date)),
            datasets: visibleSurfaces.map(surface => createBarDataset(
              surface.color,
              isSessions ? surface.label : `${surface.label} ${surface.inputLabel.toLowerCase()}`,
              displayData.map(entry => entry.day?.[surface.key][measure] ?? null),
            )),
          }}
          options={options}
          role="img"
          aria-label={`${title}: ${visibleSurfaces.map(surface => surface.label).join(', ')}.`}
        />
      ) : (
        <p className="py-8 text-center text-gray-500">
          {isSessions ? 'Session counts are not reported. Select Prompts & messages to view available activity.' : 'Prompts and user messages are not reported.'}
        </p>
      )}
    </ChartContainer>
  );
}
