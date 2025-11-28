"use client";

import React, { useState } from 'react';
import FeatureAdoptionChart from './charts/FeatureAdoptionChart';
import AgentModeHeatmapChart from './charts/AgentModeHeatmapChart';
import { MetricTileGroup, MetricTileIcon, StatsGrid, ViewPanel } from './ui';
import ExpandableTableSection from './ui/ExpandableTableSection';
import MetricsTable, { TableColumn } from './ui/MetricsTable';
import InsightsCard from './ui/InsightsCard';
import { usePluginVersions } from '../hooks/usePluginVersions';
import type { FeatureAdoptionData, AgentModeHeatmapData } from '../domain/calculators/metricCalculators';
import type { MetricsStats, CopilotMetrics } from '../types/metrics';
import type { VoidCallback } from '../types/events';

interface CopilotAdoptionViewProps {
  featureAdoptionData: FeatureAdoptionData | null;
  agentModeHeatmapData: AgentModeHeatmapData[];
  stats: MetricsStats;
  metrics: CopilotMetrics[];
  onBack: VoidCallback;
}

export default function CopilotAdoptionView({ featureAdoptionData, agentModeHeatmapData, stats, metrics, onBack }: CopilotAdoptionViewProps) {
  const { versions: jetbrainsUpdates, isLoading: jbLoading, error: jbError } = usePluginVersions('jetbrains');
  const { versions: vscodeVersions, isLoading: vsLoading, error: vsError } = usePluginVersions('vscode');

  const [expandedUsernames, setExpandedUsernames] = useState<Set<string>>(new Set());
  const [expandedVsUsernames, setExpandedVsUsernames] = useState<Set<string>>(new Set());

  // Plugin version analysis
  const pluginVersionAnalysis = React.useMemo(() => {
    const versionMap = new Map<string, Set<string>>();
    
    // Extract plugin versions for IntelliJ users (exclude nightly builds)
    for (const metric of metrics) {
      for (const ideTotal of metric.totals_by_ide) {
        if (ideTotal.ide === 'intellij' && ideTotal.last_known_plugin_version?.plugin_version) {
          const rawVersion = ideTotal.last_known_plugin_version.plugin_version;
          const lower = rawVersion.toLowerCase();
          if (lower.endsWith('-nightly')) continue; // skip nightly builds
          if (!versionMap.has(rawVersion)) {
            versionMap.set(rawVersion, new Set());
          }
          versionMap.get(rawVersion)!.add(metric.user_login);
        }
      }
    }

    // Convert to array and sort by user count
    return Array.from(versionMap.entries())
      .map(([version, usernamesSet]) => ({
        version,
        userCount: usernamesSet.size,
        usernames: Array.from(usernamesSet).sort()
      }))
      .sort((a, b) => b.userCount - a.userCount);
  }, [metrics]);

  // True count of unique IntelliJ users (do NOT sum per-version counts because a user may appear under multiple versions over the reporting window)
  const totalUniqueIntellijUsers = React.useMemo(() => {
    const userSet = new Set<string>();
    for (const v of pluginVersionAnalysis) {
      for (const username of v.usernames) userSet.add(username);
    }
    return userSet.size;
  }, [pluginVersionAnalysis]);

  // VS Code plugin version analysis
  const vscodeVersionAnalysis = React.useMemo(() => {
    const versionMap = new Map<string, Set<string>>();

    for (const metric of metrics) {
      for (const ideTotal of metric.totals_by_ide) {
        const pluginInfo = ideTotal.last_known_plugin_version;
        if (
          ideTotal.ide === 'vscode' &&
          pluginInfo?.plugin_version &&
          pluginInfo.plugin === 'copilot-chat'
        ) {
          const rawVersion = pluginInfo.plugin_version;
          const lower = rawVersion.toLowerCase();
          if (lower.endsWith('-insider') || lower.endsWith('-nightly')) continue;
          if (!versionMap.has(rawVersion)) {
            versionMap.set(rawVersion, new Set());
          }
          versionMap.get(rawVersion)!.add(metric.user_login);
        }
      }
    }

    return Array.from(versionMap.entries())
      .map(([version, usernamesSet]) => ({
        version,
        userCount: usernamesSet.size,
        usernames: Array.from(usernamesSet).sort(),
      }))
      .sort((a, b) => b.userCount - a.userCount);
  }, [metrics]);

  const totalUniqueVsCodeUsers = React.useMemo(() => {
    const userSet = new Set<string>();
    for (const v of vscodeVersionAnalysis) {
      for (const username of v.usernames) userSet.add(username);
    }
    return userSet.size;
  }, [vscodeVersionAnalysis]);

  // Get latest 8 stable (non-nightly) versions from JetBrains data
  const latestEightUpdates = React.useMemo(() => {
    const stable = jetbrainsUpdates.filter(u => !u.version.toLowerCase().endsWith('-nightly'));
    return stable.slice(0, 8);
  }, [jetbrainsUpdates]);

  const latestEightVersions = React.useMemo(() => latestEightUpdates.map(u => u.version), [latestEightUpdates]);

  // VS Code latest versions window from rolling history
  const latestVsCodeVersions = React.useMemo(
    () => vscodeVersions.map(v => v.version),
    [vscodeVersions],
  );

  // Map of version -> release date (cdate) for quick lookup (stable only)
  const jetbrainsVersionDateMap = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const u of jetbrainsUpdates) {
      const vLower = u.version.toLowerCase();
      if (vLower.endsWith('-nightly')) continue;
      if (!map.has(u.version)) {
        map.set(u.version, u.releaseDate);
      }
    }
    return map;
  }, [jetbrainsUpdates]);

  // Identify outdated plugins
  const outdatedPlugins = React.useMemo(() => {
    return pluginVersionAnalysis.filter(plugin => 
      !latestEightVersions.includes(plugin.version)
    );
  }, [pluginVersionAnalysis, latestEightVersions]);

  const outdatedVsCodePlugins = React.useMemo(
    () =>
      vscodeVersionAnalysis.filter(
        (plugin) => !latestVsCodeVersions.includes(plugin.version),
      ),
    [vscodeVersionAnalysis, latestVsCodeVersions],
  );

  function formatDate(dateString: string): string {
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return dateString;
    try {
      return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return dateString;
    }
  }

  const tableHeaderClass = 'px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider';
  const narrowCellClass = 'px-4 py-2 text-sm text-gray-900 whitespace-nowrap';
  const usernameCellClass = 'px-4 py-2 text-sm text-gray-900';

  const renderUsernames = (pluginVersion: string, usernames: string[], expandedSet: Set<string>, toggle: (version: string) => void) => {
    if (usernames.length <= 3) {
      return <span className="text-xs text-gray-600">{usernames.join(', ')}</span>;
    }

    const isExpanded = expandedSet.has(pluginVersion);
    const shown = isExpanded ? usernames.join(', ') : `${usernames.slice(0, 3).join(', ')}...`;
    return (
      <div>
        <span className="text-xs text-gray-600">{shown}</span>
        <button
          onClick={() => toggle(pluginVersion)}
          className="ml-2 text-xs text-blue-600 hover:text-blue-800 underline"
        >
          {isExpanded ? 'Show Less' : `Show All ${usernames.length}`}
        </button>
      </div>
    );
  };

  const toggleExpanded = (setState: React.Dispatch<React.SetStateAction<Set<string>>>, version: string) => {
    setState((prev) => {
      const next = new Set(prev);
      if (next.has(version)) {
        next.delete(version);
      } else {
        next.add(version);
      }
      return next;
    });
  };

  const outdatedPluginsColumns: TableColumn<typeof outdatedPlugins[number]>[] = [
    {
      id: 'version',
      header: 'Plugin Version',
      headerClassName: `${tableHeaderClass} text-red-600`,
      className: 'px-4 py-2 font-mono text-gray-900 whitespace-nowrap',
      renderCell: (plugin) => plugin.version,
    },
    {
      id: 'releaseDate',
      header: 'Release Date',
      headerClassName: `${tableHeaderClass} text-red-600`,
      className: narrowCellClass,
      renderCell: (plugin) => {
        const releaseDate = jetbrainsVersionDateMap.get(plugin.version);
        return releaseDate ? formatDate(releaseDate) : 'N/A';
      },
    },
    {
      id: 'userCount',
      header: 'Number of Users',
      headerClassName: `${tableHeaderClass} text-red-600`,
      className: `${narrowCellClass} text-center`,
      accessor: 'userCount',
    },
    {
      id: 'usernames',
      header: 'Usernames',
      headerClassName: `${tableHeaderClass} text-red-600`,
      className: usernameCellClass,
      renderCell: (plugin) => renderUsernames(plugin.version, plugin.usernames, expandedUsernames, (version) => toggleExpanded(setExpandedUsernames, version)),
    },
  ];

  const jetbrainsVersionsColumns: TableColumn<typeof latestEightUpdates[number]>[] = [
    {
      id: 'version',
      header: 'Version',
      headerClassName: tableHeaderClass,
      className: 'px-4 py-2 font-mono text-gray-900 whitespace-nowrap',
      renderCell: (update) => update.version,
    },
    {
      id: 'releaseDate',
      header: 'Release Date',
      headerClassName: tableHeaderClass,
      className: narrowCellClass,
      renderCell: (update) => formatDate(update.releaseDate),
    },
  ];

  const vscodeVersionsColumns: TableColumn<(typeof vscodeVersions)[number]>[] = [
    {
      id: 'version',
      header: 'Version',
      headerClassName: tableHeaderClass,
      className: 'px-4 py-2 font-mono text-gray-900 whitespace-nowrap',
      renderCell: (version) => version.version,
    },
    {
      id: 'releaseDate',
      header: 'Release Date',
      headerClassName: tableHeaderClass,
      className: narrowCellClass,
      renderCell: (version) => formatDate(version.releaseDate),
    },
  ];

  const vscodeVersionAnalysisColumns: TableColumn<typeof vscodeVersionAnalysis[number]>[] = [
    {
      id: 'version',
      header: 'Extension Version',
      headerClassName: tableHeaderClass,
      className: 'px-4 py-2 font-mono text-gray-900 whitespace-nowrap',
      renderCell: (item) => item.version,
    },
    {
      id: 'status',
      header: 'Status',
      headerClassName: tableHeaderClass,
      className: narrowCellClass,
      renderCell: (item) => (latestVsCodeVersions.includes(item.version) ? 'Latest window' : 'Outdated'),
    },
    {
      id: 'userCount',
      header: 'Number of Users',
      headerClassName: tableHeaderClass,
      className: `${narrowCellClass} text-center`,
      accessor: 'userCount',
    },
    {
      id: 'usernames',
      header: 'Usernames',
      headerClassName: tableHeaderClass,
      className: usernameCellClass,
      renderCell: (item) => renderUsernames(item.version, item.usernames, expandedVsUsernames, (version) => toggleExpanded(setExpandedVsUsernames, version)),
    },
  ];

  return (
    <ViewPanel
      headerProps={{
        title: 'Copilot Adoption Analysis',
        description: 'Understand Copilot feature adoption patterns and Agent Mode usage intensity across days.',
        onBack,
      }}
      contentClassName="space-y-10"
    >
      <MetricTileGroup
        title="User Adoption Metrics"
        items={[
          {
            title: 'Chat Users',
            value: stats.chatUsers,
            accent: 'emerald',
            subtitle: `Out of ${stats.uniqueUsers.toLocaleString()} unique users`,
            icon: <MetricTileIcon name="chat-users" />,
          },
          {
            title: 'Agent Mode Users',
            value: stats.agentUsers,
            accent: 'violet',
            subtitle: `Out of ${stats.uniqueUsers.toLocaleString()} unique users`,
            icon: <MetricTileIcon name="agent-users" />,
          },
          {
            title: 'Completion Only Users',
            value: stats.completionOnlyUsers,
            accent: 'amber',
            subtitle: `Out of ${stats.uniqueUsers.toLocaleString()} unique users`,
            icon: <MetricTileIcon name="completion-only-users" />,
          },
        ]}
      />
      <FeatureAdoptionChart
        data={
          featureAdoptionData || {
            totalUsers: 0,
            completionUsers: 0,
            chatUsers: 0,
            agentModeUsers: 0,
            askModeUsers: 0,
            editModeUsers: 0,
            inlineModeUsers: 0,
            codeReviewUsers: 0,
          }
        }
      />
      <AgentModeHeatmapChart data={agentModeHeatmapData || []} />

      <section className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Plugin Version Analysis</h3>
          <p className="text-gray-600 text-sm max-w-2xl">
            Analyze plugin versions across your organization to identify users with outdated plugins that may be missing important features and bug fixes.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <h4 className="text-md font-semibold text-gray-900 mb-1">JetBrains</h4>
            <p className="text-gray-600 text-xs mb-4 max-w-2xl">
              IntelliJ-based IDEs using the GitHub Copilot JetBrains plugin.
            </p>
          </div>

          {pluginVersionAnalysis.length > 0 ? (
            <MetricTileGroup
              items={[
                {
                  title: 'Total IntelliJ Users',
                  value: totalUniqueIntellijUsers,
                  accent: 'blue',
                  subtitle: 'Users with plugin version data',
                  icon: <MetricTileIcon name="plugin-users" />,
                },
                {
                  title: 'Unique Plugin Versions',
                  value: pluginVersionAnalysis.length,
                  accent: 'indigo',
                  subtitle: 'Different versions detected',
                  icon: <MetricTileIcon name="plugin-versions" />,
                },
                {
                  title: 'Users on Outdated Versions',
                  value: outdatedPlugins.reduce((sum, p) => sum + p.userCount, 0),
                  accent: outdatedPlugins.length > 0 ? 'orange' : 'emerald',
                  subtitle: `${outdatedPlugins.length} outdated version${outdatedPlugins.length !== 1 ? 's' : ''} detected`,
                  icon: <MetricTileIcon name="plugin-outdated" />,
                },
              ]}
              columns={{ base: 1, md: 3 }}
              gapClassName="gap-4"
            />
          ) : (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-md">
              <div className="text-gray-800 font-medium">No IntelliJ Plugin Data Available</div>
              <div className="text-gray-600 text-sm mt-1">No IntelliJ users found in the current dataset, or plugin version information is not available.</div>
            </div>
          )}

          {pluginVersionAnalysis.length > 0 && (
            <div className="space-y-8">
              <div>
                <h4 className="text-md font-semibold text-gray-800 mb-3">Outdated Plugins</h4>
                <p className="text-sm text-gray-600 mb-3">
                  Plugin versions that are not among the latest 8 stable releases. Users with outdated plugins may be missing important features and security updates.
                </p>
                {outdatedPlugins.length > 0 ? (
                  <ExpandableTableSection
                    items={outdatedPlugins}
                    initialCount={5}
                    buttonCollapsedLabel={(total) => `Show All ${total} Versions`}
                    buttonExpandedLabel="Show Less"
                  >
                    {({ visibleItems }) => (
                      <div className="overflow-x-auto border border-gray-200 rounded-md">
                        <MetricsTable
                          data={visibleItems}
                          columns={outdatedPluginsColumns}
                          tableClassName="min-w-full divide-y divide-gray-200 text-sm"
                          theadClassName="bg-red-50"
                          rowClassName={() => 'hover:bg-gray-50'}
                        />
                      </div>
                    )}
                  </ExpandableTableSection>
                ) : (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                    <div className="text-green-800 font-medium">✓ All users are on recent plugin versions!</div>
                    <div className="text-green-700 text-sm mt-1">No outdated plugins detected among your IntelliJ users.</div>
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-md font-semibold text-gray-800 mb-3">JetBrains &mdash; Latest 8 Plugin Versions</h4>
                <ExpandableTableSection
                  items={latestEightUpdates}
                  initialCount={2}
                  buttonCollapsedLabel={(total) => `Show All ${total} Versions`}
                  buttonExpandedLabel="Show Less"
                >
                  {({ visibleItems }) => (
                    <div className="overflow-x-auto border border-gray-200 rounded-md">
                      {jbLoading ? (
                        <div className="px-4 py-3 text-gray-500">Loading…</div>
                      ) : jbError ? (
                        <div className="px-4 py-3 text-red-600">Failed to load plugin versions: {jbError}</div>
                      ) : jetbrainsUpdates.length === 0 ? (
                        <div className="px-4 py-3 text-gray-500">No version data available.</div>
                      ) : (
                        <MetricsTable
                          data={visibleItems}
                          columns={jetbrainsVersionsColumns}
                          tableClassName="min-w-full divide-y divide-gray-200 text-sm"
                          theadClassName="bg-gray-50"
                          rowClassName={() => 'hover:bg-gray-50'}
                        />
                      )}
                    </div>
                  )}
                </ExpandableTableSection>
              </div>
            </div>
          )}

          <div>
            <h4 className="text-md font-semibold text-gray-900 mb-1 mt-6">Visual Studio Code</h4>
            <p className="text-gray-600 text-xs mb-4 max-w-2xl">
              VS Code using the GitHub Copilot extension. Version history is maintained as a rolling window of recent releases.
            </p>
          </div>

          {vscodeVersionAnalysis.length > 0 ? (
            <MetricTileGroup
              items={[
                {
                  title: 'Total VS Code Users',
                  value: totalUniqueVsCodeUsers,
                  accent: 'blue',
                  subtitle: 'Users with extension version data',
                  icon: <MetricTileIcon name="vs-users" />,
                },
                {
                  title: 'Unique VS Code Versions',
                  value: vscodeVersionAnalysis.length,
                  accent: 'indigo',
                  subtitle: 'Different extension versions detected',
                  icon: <MetricTileIcon name="vs-versions" />,
                },
                {
                  title: 'VS Code Users on Outdated Versions',
                  value: outdatedVsCodePlugins.reduce((sum, p) => sum + p.userCount, 0),
                  accent: outdatedVsCodePlugins.length > 0 ? 'orange' : 'emerald',
                  subtitle: `${outdatedVsCodePlugins.length} outdated version${outdatedVsCodePlugins.length !== 1 ? 's' : ''} detected`,
                  icon: <MetricTileIcon name="plugin-outdated" />,
                },
              ]}
              columns={{ base: 1, md: 3 }}
              gapClassName="gap-4"
            />
          ) : (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-md">
              <div className="text-gray-800 font-medium">No VS Code Extension Data Available</div>
              <div className="text-gray-600 text-sm mt-1">No VS Code users with extension version information were found in the current dataset.</div>
            </div>
          )}

          <ExpandableTableSection
            items={vscodeVersions || []}
            initialCount={2}
            buttonCollapsedLabel={(total) => `Show All ${total} Versions`}
            buttonExpandedLabel="Show Less"
          >
            {({ visibleItems }) => (
              <div className="overflow-x-auto border border-gray-200 rounded-md">
                {vsLoading ? (
                  <div className="px-4 py-3 text-gray-500">Loading&hellip;</div>
                ) : vsError ? (
                  <div className="px-4 py-3 text-red-600">Failed to load VS Code versions: {vsError}</div>
                ) : vscodeVersions.length === 0 ? (
                  <div className="px-4 py-3 text-gray-500">No version data available.</div>
                ) : (
                  <MetricsTable
                    data={visibleItems}
                    columns={vscodeVersionsColumns}
                    tableClassName="min-w-full divide-y divide-gray-200 text-sm"
                    theadClassName="bg-gray-50"
                    rowClassName={() => 'hover:bg-gray-50'}
                  />
                )}
              </div>
            )}
          </ExpandableTableSection>

          {vscodeVersionAnalysis.length > 0 && (
            <div className="space-y-4">
              <h4 className="text-md font-semibold text-gray-800 mb-3">VS Code Users by Extension Version</h4>
              <p className="text-sm text-gray-600">
                Breakdown of VS Code users by installed GitHub Copilot extension version. Versions outside the latest rolling window are considered outdated.
              </p>
              <ExpandableTableSection
                items={vscodeVersionAnalysis}
                initialCount={5}
                buttonCollapsedLabel={(total) => `Show All ${total} Versions`}
                buttonExpandedLabel="Show Less"
              >
                {({ visibleItems }) => (
                  <div className="overflow-x-auto border border-gray-200 rounded-md">
                    <MetricsTable
                      data={visibleItems}
                      columns={vscodeVersionAnalysisColumns}
                      tableClassName="min-w-full divide-y divide-gray-200 text-sm"
                      theadClassName="bg-gray-50"
                      rowClassName={(item, index) => `${latestVsCodeVersions.includes(item.version) ? 'hover:bg-gray-50' : 'hover:bg-red-50'} ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                    />
                  </div>
                )}
              </ExpandableTableSection>
            </div>
          )}

          <StatsGrid columns={{ base: 1, md: 2 }} gapClassName="gap-4">
            <InsightsCard title="Plugin Health Status" variant="orange">
              <p>
                {outdatedPlugins.length === 0
                  ? 'Excellent! All IntelliJ users are on recent plugin versions with latest features and security updates.'
                  : `${outdatedPlugins.reduce((sum, p) => sum + p.userCount, 0)} user${outdatedPlugins.reduce((sum, p) => sum + p.userCount, 0) !== 1 ? 's' : ''} ${outdatedPlugins.reduce((sum, p) => sum + p.userCount, 0) !== 1 ? 'are' : 'is'} using outdated plugins which can result in incomplete telemetry and skewed statistics. Consider upgrading for better performance, feature completeness, and accurate reporting.`}
              </p>
            </InsightsCard>
            <InsightsCard title="Upgrade Recommendations" variant="blue">
              <p>
                {outdatedPlugins.length > 0
                  ? 'Contact users with outdated plugins to upgrade. Latest versions include improved Agent Mode, better code review features, and enhanced MCP support.'
                  : 'Keep monitoring plugin versions regularly. New releases often include performance improvements and advanced AI features.'}
              </p>
            </InsightsCard>
          </StatsGrid>
        </div>
      </section>
    </ViewPanel>
  );
}
