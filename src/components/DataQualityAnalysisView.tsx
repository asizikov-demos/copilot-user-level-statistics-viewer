'use client';

import { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TooltipItem
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { CopilotMetrics } from '../types/metrics';
import ExpandableTableSection from './ui/ExpandableTableSection';
import MetricsTable, { TableColumn } from './ui/MetricsTable';
import { ViewPanel, MetricTileGroup, MetricTileIcon } from './ui';
import type { VoidCallback } from '../types/events';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface DataQualityUser {
  userLogin: string;
  userId: number;
  usedAgent: boolean;
  usedModes: string[];
  pluginsUsed: string[];
}

interface DataQualityAnalysisViewProps {
  metrics: CopilotMetrics[];
  onBack: VoidCallback;
}

interface UnknownModelTrendPoint {
  day: string;
  count: number;
}

interface IdeSummaryRow {
  ide: string;
  occurrences: number;
  uniqueUsers: number;
  pluginVersions: string[];
}

export default function DataQualityAnalysisView({ metrics, onBack }: DataQualityAnalysisViewProps) {
  const {
    usersWithDataQualityIssues,
    unknownModelTrend,
    ideSummary,
    totalUnknownModelEntries
  } = useMemo(() => {
    const userModeMap = new Map<string, {
      userId: number;
      userLogin: string;
      modes: Set<string>;
      usedAgent: boolean;
      hasAgentModeFeature: boolean;
      plugins: Map<string, string>;
    }>();

    const unknownCountsByDay = new Map<string, number>();
    const ideAggregations = new Map<string, {
      occurrences: number;
      users: Set<number>;
      pluginVersions: Set<string>;
    }>();

    metrics.forEach(metric => {
      const key = `${metric.user_id}_${metric.user_login}`;

      if (!userModeMap.has(key)) {
        userModeMap.set(key, {
          userId: metric.user_id,
          userLogin: metric.user_login,
          modes: new Set<string>(),
          usedAgent: false,
          hasAgentModeFeature: false,
          plugins: new Map<string, string>()
        });
      }

      const userEntry = userModeMap.get(key)!;

      if (metric.used_agent) {
        userEntry.usedAgent = true;
      }

      metric.totals_by_feature?.forEach(feature => {
        const featureName = feature.feature;
        if (featureName && [
          'chat_panel_unknown_mode',
          'chat_panel_agent_mode',
          'chat_panel_ask_mode',
          'chat_panel_custom_mode',
          'chat_panel_edit_mode',
          'chat_inline',
          'agent_edit'
        ].includes(featureName)) {
          userEntry.modes.add(featureName);

          if (featureName === 'chat_panel_agent_mode' || featureName === 'agent_edit') {
            userEntry.hasAgentModeFeature = true;
          }
        }
      });

      metric.totals_by_ide?.forEach(ide => {
        if (ide.last_known_plugin_version) {
          const { plugin, plugin_version } = ide.last_known_plugin_version;
          if (plugin && plugin_version) {
            userEntry.plugins.set(plugin, plugin_version);
          }
        }
      });

      const unknownModelEntries = metric.totals_by_language_model?.filter(entry => entry.model?.toLowerCase() === 'unknown') ?? [];

      if (unknownModelEntries.length > 0) {
        const currentCount = unknownCountsByDay.get(metric.day) ?? 0;
        unknownCountsByDay.set(metric.day, currentCount + unknownModelEntries.length);

        metric.totals_by_ide?.forEach(ide => {
          const ideName = ide.ide || 'Unknown IDE';
          if (!ideAggregations.has(ideName)) {
            ideAggregations.set(ideName, {
              occurrences: 0,
              users: new Set<number>(),
              pluginVersions: new Set<string>()
            });
          }

          const ideEntry = ideAggregations.get(ideName)!;
          ideEntry.occurrences += 1;
          ideEntry.users.add(metric.user_id);

          const pluginInfo = ide.last_known_plugin_version;
          if (pluginInfo?.plugin && pluginInfo?.plugin_version) {
            ideEntry.pluginVersions.add(`${pluginInfo.plugin} (v${pluginInfo.plugin_version})`);
          }
        });
      }
    });

    const usersWithIssues: DataQualityUser[] = [];

    userModeMap.forEach(user => {
      if (user.usedAgent && !user.hasAgentModeFeature) {
        usersWithIssues.push({
          userLogin: user.userLogin,
          userId: user.userId,
          usedAgent: user.usedAgent,
          usedModes: Array.from(user.modes).sort(),
          pluginsUsed: Array.from(user.plugins.entries())
            .map(([plugin, version]) => `${plugin} (v${version})`)
            .sort()
        });
      }
    });

    const unknownModelTrend: UnknownModelTrendPoint[] = Array.from(unknownCountsByDay.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([day, count]) => ({ day, count }));

    const ideSummary: IdeSummaryRow[] = Array.from(ideAggregations.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([ide, value]) => ({
        ide,
        occurrences: value.occurrences,
        uniqueUsers: value.users.size,
        pluginVersions: Array.from(value.pluginVersions).sort()
      }));

    const totalUnknownModelEntries = unknownModelTrend.reduce((sum, point) => sum + point.count, 0);

    return {
      usersWithDataQualityIssues: usersWithIssues.sort((a, b) => a.userLogin.localeCompare(b.userLogin)),
      unknownModelTrend,
      ideSummary,
      totalUnknownModelEntries
    };
  }, [metrics]);

  const formatModes = (modes: string[]): string => {
    return modes.join(', ');
  };

  const formatPlugins = (plugins: string[]): string => {
    return plugins.length > 0 ? plugins.join(', ') : 'None';
  };

  const headerClass = 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider';
  const cellClass = 'px-6 py-4 whitespace-nowrap text-sm text-gray-900';

  const ideSummaryColumns: TableColumn<IdeSummaryRow>[] = [
    {
      id: 'ide',
      header: 'IDE',
      headerClassName: headerClass,
      className: cellClass,
      renderCell: (row) => <div className="text-sm font-medium text-gray-900">{row.ide}</div>,
    },
    {
      id: 'occurrences',
      header: 'Metrics with Unknown Model',
      headerClassName: headerClass,
      className: cellClass,
      accessor: 'occurrences',
    },
    {
      id: 'uniqueUsers',
      header: 'Impacted Users',
      headerClassName: headerClass,
      className: cellClass,
      accessor: 'uniqueUsers',
    },
    {
      id: 'pluginVersionsCount',
      header: 'Plugin Versions (Count)',
      headerClassName: headerClass,
      className: cellClass,
      renderCell: (row) => <div className="text-sm text-gray-900">{row.pluginVersions.length.toLocaleString()}</div>,
    },
  ];

  const idePluginColumns: TableColumn<IdeSummaryRow>[] = [
    {
      id: 'ide',
      header: 'IDE',
      headerClassName: headerClass,
      className: cellClass,
      renderCell: (row) => <div className="text-sm font-medium text-gray-900">{row.ide}</div>,
    },
    {
      id: 'pluginVersions',
      header: 'Plugin Versions',
      headerClassName: headerClass,
      className: 'px-6 py-4',
      renderCell: (row) => (
        row.pluginVersions.length > 0 ? (
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-900">
            {row.pluginVersions.map((plugin) => (
              <li key={`${row.ide}-${plugin}`}>{plugin}</li>
            ))}
          </ul>
        ) : (
          <span className="text-sm text-gray-500">None</span>
        )
      ),
    },
  ];

  const userIssueColumns: TableColumn<DataQualityUser>[] = [
    {
      id: 'userLogin',
      header: 'User Name',
      headerClassName: headerClass,
      className: cellClass,
      renderCell: (user) => <div className="text-sm font-medium text-gray-900">{user.userLogin}</div>,
    },
    {
      id: 'userId',
      header: 'User ID',
      headerClassName: headerClass,
      className: cellClass,
      accessor: 'userId',
    },
    {
      id: 'usedAgent',
      header: 'Used Agent Flag',
      headerClassName: headerClass,
      className: 'px-6 py-4 whitespace-nowrap',
      renderCell: (user) => (
        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
          {user.usedAgent ? 'Yes' : 'No'}
        </span>
      ),
    },
    {
      id: 'usedModes',
      header: 'Chat Modes Used',
      headerClassName: headerClass,
      className: cellClass,
      renderCell: (user) => (
        <div className="text-sm text-gray-900">
          {user.usedModes.length > 0 ? formatModes(user.usedModes) : 'None'}
        </div>
      ),
    },
    {
      id: 'pluginsUsed',
      header: 'Plugins Used',
      headerClassName: headerClass,
      className: cellClass,
      renderCell: (user) => (
        <div className="text-sm text-gray-900">{formatPlugins(user.pluginsUsed)}</div>
      ),
    },
  ];

  const unknownModelChartData = {
    labels: unknownModelTrend.map(point => point.day),
    datasets: [
      {
        label: 'Unknown Model Entries',
        data: unknownModelTrend.map(point => point.count),
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.2)',
        tension: 0.2,
        fill: true,
        pointRadius: 4,
        pointHoverRadius: 6
      }
    ]
  };

  const unknownModelChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: true,
        text: 'Unknown Model Entries Per Day'
      },
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          title: (context: TooltipItem<'line'>[]) => context[0]?.label ?? '',
          label: (context: TooltipItem<'line'>) => `Entries: ${context.parsed.y}`
        }
      }
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Day'
        }
      },
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0
        },
        title: {
          display: true,
          text: 'Unknown Model Entries'
        }
      }
    }
  };

  return (
    <ViewPanel
      headerProps={{
        title: 'Data Quality Analysis',
        description: 'Agent Mode users without Agent Mode feature reporting - potential data quality issues',
        onBack,
        descriptionClassName: 'text-gray-600 text-sm mt-1',
      }}
      contentClassName="space-y-6"
    >
      <MetricTileGroup
        className="mb-4"
        columns={{ base: 1, md: 2 }}
        items={[
          {
            title: 'Users with Data Quality Issues',
            value: usersWithDataQualityIssues.length,
            accent: 'orange',
            subtitle: 'Agent activity flagged without matching feature metrics',
            icon: <MetricTileIcon name="warning" />,
          },
          {
            title: 'Unknown Model Entries',
            value: totalUnknownModelEntries,
            accent: 'purple',
            subtitle: 'Daily records attributed to unmapped models',
            icon: <MetricTileIcon name="records" />,
          },
        ]}
      />

      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Unknown Model Trend</h3>
        {unknownModelTrend.length > 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-4 h-80">
            <Line data={unknownModelChartData} options={unknownModelChartOptions} />
          </div>
        ) : (
          <div className="text-center text-gray-500 py-10 border border-dashed border-gray-300 rounded-lg">
            No unknown model entries found in the selected timeframe.
          </div>
        )}
      </div>

      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">IDEs Associated with Unknown Models</h3>
        {ideSummary.length > 0 ? (
          <ExpandableTableSection
            items={ideSummary}
            initialCount={10}
            buttonCollapsedLabel={(total) => `Show All ${total} IDEs`}
            buttonExpandedLabel="Show Less"
          >
            {({ visibleItems }) => (
              <div className="overflow-x-auto">
                <MetricsTable<IdeSummaryRow>
                  data={visibleItems}
                  columns={ideSummaryColumns}
                  tableClassName="min-w-full divide-y divide-gray-200"
                  theadClassName="bg-gray-50"
                  rowClassName={(_, index) => `${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-gray-50`}
                />
              </div>
            )}
          </ExpandableTableSection>
        ) : (
          <div className="text-center text-gray-500 py-10 border border-dashed border-gray-300 rounded-lg">
            No IDE associations found for unknown models.
          </div>
        )}
      </div>

      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Plugin Versions Reported with Unknown Models</h3>
        {ideSummary.length > 0 ? (
          <ExpandableTableSection
            items={ideSummary}
            initialCount={0}
            defaultExpanded={false}
            buttonCollapsedLabel={(total) => `Show Plugin Versions (${total.toLocaleString()} IDEs)`}
            buttonExpandedLabel="Hide Plugin Versions"
            buttonAlignment="left"
          >
            {({ visibleItems, isExpanded }) => (
              <>
                {isExpanded ? (
                  <div className="overflow-x-auto">
                    <MetricsTable<IdeSummaryRow>
                      data={visibleItems}
                      columns={idePluginColumns}
                      tableClassName="min-w-full divide-y divide-gray-200"
                      theadClassName="bg-gray-50"
                      rowClassName={(_, index) => `${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-gray-50`}
                    />
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-6 py-4 text-sm text-gray-600">
                    Click &quot;Show Plugin Versions&quot; to view IDE plugin details associated with unknown models.
                  </div>
                )}
              </>
            )}
          </ExpandableTableSection>
        ) : (
          <div className="text-center text-gray-500 py-10 border border-dashed border-gray-300 rounded-lg">
            No plugin version data available for unknown models.
          </div>
        )}
      </div>

      {usersWithDataQualityIssues.length === 0 ? (
        <div className="text-center py-8">
          <svg className="w-16 h-16 text-green-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Quality Issues Found</h3>
          <p className="text-gray-600">All agent users have proper Agent Mode feature reporting</p>
        </div>
      ) : (
        <ExpandableTableSection
          items={usersWithDataQualityIssues}
          initialCount={10}
          buttonCollapsedLabel={(total) => `Show All ${total} Users`}
          buttonExpandedLabel="Show Less"
        >
          {({ visibleItems }) => (
            <div className="overflow-x-auto">
              <MetricsTable<DataQualityUser>
                data={visibleItems}
                columns={userIssueColumns}
                tableClassName="min-w-full divide-y divide-gray-200"
                theadClassName="bg-gray-50"
                rowClassName={(_, index) => `${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-gray-50`}
              />
            </div>
          )}
        </ExpandableTableSection>
      )}

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="text-sm font-medium text-blue-900 mb-2">Analysis Notes:</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Users shown have <code>used_agent: true</code> but no <code>chat_panel_agent_mode</code> or <code>agent_edit</code> feature usage reported</li>
          <li>• This indicates a data quality issue where the agent flag is set but features don&apos;t reflect agent mode usage</li>
          <li>• These users may be using agent mode but it&apos;s not being properly tracked in the feature metrics</li>
        </ul>
      </div>
    </ViewPanel>
  );
}
