"use client";
import React, { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import type { TooltipItem } from 'chart.js';
import { registerChartJS } from './utils/chartSetup';
import { getIDEIcon, formatIDEName, CopilotIcon } from '../icons/IDEIcons';
import { createBarDataset } from './utils/chartStyles';
import { createBaseChartOptions } from './utils/chartOptions';
import { getIdeColor, hasIdeColor, ideColors } from './utils/chartColors';
import { computeCliDayTotals, type CliDayTotals } from '../../domain/calculators/cliUsageCalculator';
import { formatShortDate, generateDateRange } from '../../utils/formatters';
import ChartContainer from '../ui/ChartContainer';
import MetricsTable, { type TableColumn } from '../ui/MetricsTable';
import type { UserDayData } from '../../types/metrics';

registerChartJS();

interface IDEAggregateItem {
  ide: string;
  user_initiated_interaction_count: number;
  code_generation_activity_count: number;
  code_acceptance_activity_count: number;
  loc_added_sum: number;
  loc_deleted_sum: number;
  loc_suggested_to_add_sum: number;
  loc_suggested_to_delete_sum: number;
}

interface ClientActivityChartProps {
  ideAggregates: IDEAggregateItem[];
  days: UserDayData[];
  title?: string;
  reportStartDay: string;
  reportEndDay: string;
  pluginVersions?: {
    plugin: string;
    plugin_version: string;
    sampled_at: string;
  }[];
  cliVersions?: {
    cli_version: string;
    sampled_at: string;
  }[];
}

type VersionEntry = { name: string; version: string; sampled_at: string };

const versionColumns: TableColumn<VersionEntry>[] = [
  { id: 'name', header: 'Client', headerClassName: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider', className: 'px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900', renderCell: (r) => r.name },
  { id: 'version', header: 'Version', headerClassName: 'px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider', className: 'px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right', renderCell: (r) => r.version },
  { id: 'sampled_at', header: 'Last Seen', headerClassName: 'px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider', className: 'px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right', renderCell: (r) => formatShortDate(r.sampled_at) },
];

/**
 * ClientActivityChart
 * Reusable section displaying a daily interactions stacked bar chart (by IDE/CLI) plus
 * a table summarizing aggregate metrics per client.
 */
export default function ClientActivityChart({
  ideAggregates,
  days,
  title = 'Activity by Client',
  reportStartDay,
  reportEndDay,
  pluginVersions,
  cliVersions,
}: ClientActivityChartProps) {
  const { cliTotals, cliTotalsByDay } = useMemo(() => {
    const totals = {
      promptCount: 0,
      interactions: 0,
      generations: 0,
      acceptances: 0,
      locAdded: 0,
      locDeleted: 0,
      locSuggestedToAdd: 0,
      locSuggestedToDelete: 0,
    };
    const byDay = new Map<string, CliDayTotals>();

    for (const day of days) {
      const dayTotals = computeCliDayTotals(day);
      byDay.set(day.day, dayTotals);

      totals.promptCount += dayTotals.promptCount;
      totals.interactions += dayTotals.interactions;
      totals.generations += dayTotals.generations;
      totals.acceptances += dayTotals.acceptances;
      totals.locAdded += dayTotals.locAdded;
      totals.locDeleted += dayTotals.locDeleted;
      totals.locSuggestedToAdd += dayTotals.locSuggestedToAdd;
      totals.locSuggestedToDelete += dayTotals.locSuggestedToDelete;
    }

    return { cliTotals: totals, cliTotalsByDay: byDay };
  }, [days]);

  const barChartData = useMemo(() => {
    const allIDEs = Array.from(
      new Set(days.flatMap(day => day.totals_by_ide.map(ide => ide.ide)))
    ).sort();

    const allDays = generateDateRange(reportStartDay, reportEndDay);
    const dayMap = new Map(days.map(d => [d.day, d]));

    let fallbackIndex = 0;
    const datasets = allIDEs.map((ide) => {
      const data = allDays.map(dayStr => {
        const dayData = dayMap.get(dayStr);
        const ideData = dayData?.totals_by_ide.find(i => i.ide === ide);
        return ideData?.user_initiated_interaction_count || 0;
      });

      const color = getIdeColor(ide, fallbackIndex);
      if (!hasIdeColor(ide)) {
        fallbackIndex += 1;
      }
      return createBarDataset(color, formatIDEName(ide), data);
    }).filter(dataset => dataset.data.some(value => value > 0));

    // Add CLI dataset if any day has CLI data
    const hasCliData = Array.from(cliTotalsByDay.values()).some(dayTotals => dayTotals.interactionCount > 0);
    if (hasCliData) {
      const cliData = allDays.map(dayStr => {
        return cliTotalsByDay.get(dayStr)?.interactionCount ?? 0;
      });
      datasets.push(createBarDataset(ideColors['copilot_cli'], 'Copilot CLI', cliData));
    }

    return {
      labels: allDays.map(day => formatShortDate(day)),
      datasets: datasets,
    };
  }, [cliTotalsByDay, days, reportStartDay, reportEndDay]);

  const barChartOptions = useMemo(() => createBaseChartOptions({
    xAxisLabel: 'Date',
    yAxisLabel: 'Interactions',
    tooltipLabelCallback: (context: TooltipItem<'line' | 'bar'>) => {
      const label = context.dataset.label || '';
      const value = context.parsed.y || 0;
      return `${label}: ${value.toLocaleString()} interactions`;
    },
  }), []);

  const hasCliData = cliTotals.promptCount > 0 || cliTotals.interactions > 0;
  const cliInteractionCount = cliTotals.interactions > 0 ? cliTotals.interactions : cliTotals.promptCount;
  const hasCliVersions = cliVersions && cliVersions.length > 0;
  const allVersions = [
    ...(pluginVersions || []).map(p => ({
      name: p.plugin,
      version: p.plugin_version,
      sampled_at: p.sampled_at,
    })),
    ...(cliVersions || []).map(c => ({
      name: 'Copilot CLI',
      version: c.cli_version,
      sampled_at: c.sampled_at,
    })),
  ].sort((a, b) => new Date(b.sampled_at).getTime() - new Date(a.sampled_at).getTime());
  const isEmpty = ideAggregates.length === 0 && !hasCliData && !hasCliVersions;

  const footer = (
    <>
      <div className="overflow-x-auto">
        <table className="w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IDE</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Interactions</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Generation</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acceptance</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">LOC Added</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">LOC Deleted</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Suggested Add</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Suggested Delete</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {ideAggregates.map(ide => (
              <tr key={ide.ide}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  <div className="flex items-center gap-2">
                    {React.createElement(getIDEIcon(ide.ide))}
                    <span>{formatIDEName(ide.ide)}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{ide.user_initiated_interaction_count.toLocaleString()}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{ide.code_generation_activity_count.toLocaleString()}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{ide.code_acceptance_activity_count.toLocaleString()}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{ide.loc_added_sum.toLocaleString()}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{ide.loc_deleted_sum.toLocaleString()}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{ide.loc_suggested_to_add_sum.toLocaleString()}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{ide.loc_suggested_to_delete_sum.toLocaleString()}</td>
              </tr>
            ))}
            {(() => {
              if (!hasCliData) return null;
              return (
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    <div className="flex items-center gap-2">
                      <span className="text-base"><CopilotIcon /></span>
                      <span>Copilot CLI</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{cliInteractionCount.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{cliTotals.generations.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{cliTotals.acceptances.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{cliTotals.locAdded.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{cliTotals.locDeleted.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{cliTotals.locSuggestedToAdd.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{cliTotals.locSuggestedToDelete.toLocaleString()}</td>
                </tr>
              );
            })()}
          </tbody>
        </table>
      </div>

      {allVersions.length > 0 && (
        <div className="mt-8">
          <h4 className="text-md font-semibold text-gray-900 mb-4">Client Versions</h4>
          <div className="overflow-x-auto border border-gray-200">
            <MetricsTable
              data={allVersions}
              columns={versionColumns}
              getRowKey={(_, i) => i}
              initialCount={1}
              buttonCollapsedLabel={(total) => `Show All ${total} Client Versions`}
              buttonExpandedLabel="Show Less"
            />
          </div>
        </div>
      )}
    </>
  );

  return (
    <ChartContainer title={title} footer={!isEmpty ? footer : undefined} isEmpty={isEmpty} emptyState="No client activity data available.">
      {barChartData.datasets && barChartData.datasets.length > 0 && (
        <div className="mb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-800 mb-4 text-center">Daily Client Interactions</h4>
            <div className="h-64">
              <Bar data={barChartData} options={barChartOptions} />
            </div>
          </div>
        </div>
      )}
    </ChartContainer>
  );
}
