"use client";
import React, { useState, useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import type { ChartOptions, TooltipItem } from 'chart.js';
import { registerChartJS } from './utils/chartSetup';
import { getIDEIcon, formatIDEName, CopilotIcon } from '../icons/IDEIcons';
import { formatShortDate } from '../../utils/formatters';
import ChartContainer from '../ui/ChartContainer';
import type { UserDayData } from '../../types/metrics';

registerChartJS();

function generateAllDays(startDay: string, endDay: string): string[] {
  const start = new Date(startDay + 'T00:00:00Z');
  const end = new Date(endDay + 'T00:00:00Z');
  const dates: string[] = [];
  for (const cur = new Date(start); cur <= end; cur.setUTCDate(cur.getUTCDate() + 1)) {
    dates.push(cur.toISOString().split('T')[0]);
  }
  return dates;
}

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

const IDE_COLORS: Record<string, string> = {
  'vscode': '#007ACC',
  'visual_studio': '#5C2D91',
  'jetbrains': '#FE315D',
  'vim': '#019733',
  'neovim': '#57A143',
  'emacs': '#7F5AB6',
  'eclipse': '#66595C',
  'sublime_text': '#FF9800',
  'xcode': '#1575F9',
  'intellij': '#FE315D',
  'copilot_cli': '#6E40C9',
};

const FALLBACK_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#F97316', '#06B6D4', '#84CC16', '#EC4899', '#14B8A6'
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
  const [isPluginTableExpanded, setIsPluginTableExpanded] = useState(false);

  const barChartData = useMemo(() => {
    const allIDEs = Array.from(
      new Set(days.flatMap(day => day.totals_by_ide.map(ide => ide.ide)))
    ).sort();

    const allDays = generateAllDays(reportStartDay, reportEndDay);
    const dayMap = new Map(days.map(d => [d.day, d]));

    const datasets = allIDEs.map((ide, index) => {
      const data = allDays.map(dayStr => {
        const dayData = dayMap.get(dayStr);
        const ideData = dayData?.totals_by_ide.find(i => i.ide === ide);
        return ideData?.user_initiated_interaction_count || 0;
      });

      return {
        label: formatIDEName(ide),
        data: data,
        backgroundColor: IDE_COLORS[ide] || FALLBACK_COLORS[index % FALLBACK_COLORS.length],
        borderColor: IDE_COLORS[ide] || FALLBACK_COLORS[index % FALLBACK_COLORS.length],
        borderWidth: 1,
      };
    }).filter(dataset => dataset.data.some(value => value > 0));

    // Add CLI dataset if any day has CLI data
    const hasCliData = days.some(d => d.totals_by_cli && d.totals_by_cli.prompt_count > 0);
    if (hasCliData) {
      const cliData = allDays.map(dayStr => {
        const dayData = dayMap.get(dayStr);
        return dayData?.totals_by_cli?.prompt_count || 0;
      });
      datasets.push({
        label: 'Copilot CLI',
        data: cliData,
        backgroundColor: IDE_COLORS['copilot_cli'],
        borderColor: IDE_COLORS['copilot_cli'],
        borderWidth: 1,
      });
    }

    return {
      labels: allDays.map(day => formatShortDate(day)),
      datasets: datasets,
    };
  }, [days, reportStartDay, reportEndDay]);

  const barChartOptions: ChartOptions<'bar'> = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          padding: 20,
          usePointStyle: true,
        }
      },
      tooltip: {
        callbacks: {
          label: function(context: TooltipItem<'bar'>) {
            const label = context.dataset.label || '';
            const value = context.parsed.y || 0;
            return `${label}: ${value.toLocaleString()} interactions`;
          }
        }
      }
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Date'
        }
      },
      y: {
        title: {
          display: true,
          text: 'Interactions'
        },
        beginAtZero: true
      }
    }
  }), []);

  const hasCliData = days.some(d => d.totals_by_cli && d.totals_by_cli.prompt_count > 0);
  const hasCliVersions = cliVersions && cliVersions.length > 0;
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
              const cliTotals = days.reduce((acc, day) => {
                if (day.totals_by_cli) {
                  acc.request_count += day.totals_by_cli.request_count;
                  acc.session_count += day.totals_by_cli.session_count;
                  acc.prompt_count += day.totals_by_cli.prompt_count;
                }
                return acc;
              }, { request_count: 0, session_count: 0, prompt_count: 0 });

              if (cliTotals.prompt_count === 0) return null;
              return (
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    <div className="flex items-center gap-2">
                      <span className="text-base"><CopilotIcon /></span>
                      <span>Copilot CLI</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{cliTotals.prompt_count.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">—</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">—</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">—</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">—</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">—</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">—</td>
                </tr>
              );
            })()}
          </tbody>
        </table>
      </div>

      {((pluginVersions && pluginVersions.length > 0) || (cliVersions && cliVersions.length > 0)) && (
        <div className="mt-8">
          <h4 className="text-md font-semibold text-gray-900 mb-4">Client Versions</h4>
          {(() => {
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

            return (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Version</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Last Seen</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {(isPluginTableExpanded ? allVersions : allVersions.slice(0, 1)).map((entry, index) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{entry.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{entry.version}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{formatShortDate(entry.sampled_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {allVersions.length > 1 && (
                  <div className="mt-4 text-center">
                    <button
                      onClick={() => setIsPluginTableExpanded(!isPluginTableExpanded)}
                      className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 border border-blue-300 hover:border-blue-400 rounded-md transition-colors"
                    >
                      {isPluginTableExpanded ? 'Show Less' : `Show All ${allVersions.length} Client Versions`}
                    </button>
                  </div>
                )}
              </>
            );
          })()}
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
