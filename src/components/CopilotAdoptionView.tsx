"use client";

import React, { useState } from 'react';
import FeatureAdoptionChart from './charts/FeatureAdoptionChart';
import AgentModeHeatmapChart from './charts/AgentModeHeatmapChart';
import { MetricTileGroup, MetricTileIcon, StatsGrid, ViewPanel } from './ui';
import ExpandableTableSection from './ui/ExpandableTableSection';
import MetricsTable, { TableColumn } from './ui/MetricsTable';
import InsightsCard from './ui/InsightsCard';
import CopilotAdoptionInsights from './CopilotAdoptionInsights';
import { usePluginVersions } from '../hooks/usePluginVersions';
import { classifyVsCodeVersion, parseReportDayEnd, resolveCurrentStableMinorAtDate } from '../domain/vscodeVersionClassifier';
import type { VsCodeVersionClassification } from '../domain/vscodeVersionClassifier';
import type { FeatureAdoptionData, AgentModeHeatmapData } from '../domain/calculators/metricCalculators';
import type { MetricsStats, PluginVersionAnalysisData } from '../types/metrics';
import type { VoidCallback } from '../types/events';

interface CopilotAdoptionViewProps {
  featureAdoptionData: FeatureAdoptionData | null;
  agentModeHeatmapData: AgentModeHeatmapData[];
  stats: MetricsStats;
  pluginVersionData: PluginVersionAnalysisData;
  onBack: VoidCallback;
}

export default function CopilotAdoptionView({ featureAdoptionData, agentModeHeatmapData, stats, pluginVersionData, onBack }: CopilotAdoptionViewProps) {
  const { versions: jetbrainsUpdates, isLoading: jbLoading, error: jbError } = usePluginVersions('jetbrains');
  const {
    stableReleases: vsCodeStableReleases,
    isLoading: vsLoading,
    error: vsError,
    currentStableMinor,
    currentPreviewMinor,
    updatedAt: vsUpdatedAt,
  } = usePluginVersions('vscode');

  const [expandedUsernames, setExpandedUsernames] = useState<Set<string>>(new Set());
  const [expandedVsUsernames, setExpandedVsUsernames] = useState<Set<string>>(new Set());

  const pluginVersionAnalysis = pluginVersionData.jetbrains;
  const totalUniqueIntellijUsers = pluginVersionData.totalUniqueIntellijUsers;
  const vscodeVersionAnalysis = pluginVersionData.vscode;
  const totalUniqueVsCodeUsers = pluginVersionData.totalUniqueVsCodeUsers;

  const latestTwentyUpdates = React.useMemo(() => {
    const stable = jetbrainsUpdates.filter(u => !u.version.toLowerCase().endsWith('-nightly'));
    return stable.slice(0, 20);
  }, [jetbrainsUpdates]);

  const latestTwentyVersions = React.useMemo(() => latestTwentyUpdates.map(u => u.version), [latestTwentyUpdates]);

  const effectiveVsCodeStableMinor = React.useMemo(() => {
    const releaseWindowMinor = resolveCurrentStableMinorAtDate(vsCodeStableReleases, stats.reportEndDay);
    if (releaseWindowMinor !== null) return releaseWindowMinor;
    if (vsCodeStableReleases.length > 0) return null;
    return currentStableMinor;
  }, [currentStableMinor, stats.reportEndDay, vsCodeStableReleases]);

  const effectiveVsCodePreviewMinor = React.useMemo(() => {
    if (effectiveVsCodeStableMinor === null) return null;

    if (
      currentStableMinor !== null
      && currentPreviewMinor !== null
      && effectiveVsCodeStableMinor === currentStableMinor
    ) {
      return currentPreviewMinor;
    }

    return effectiveVsCodeStableMinor + 1;
  }, [currentPreviewMinor, currentStableMinor, effectiveVsCodeStableMinor]);

  const earliestVsCodeStableReleaseDate = React.useMemo(() => {
    let earliest: string | null = null;

    for (const release of vsCodeStableReleases) {
      const releaseTime = new Date(release.releaseDate).getTime();
      if (Number.isNaN(releaseTime)) continue;
      if (earliest === null || releaseTime < new Date(earliest).getTime()) {
        earliest = release.releaseDate;
      }
    }

    return earliest;
  }, [vsCodeStableReleases]);

  const parsedReportEndDay = React.useMemo(() => parseReportDayEnd(stats.reportEndDay), [stats.reportEndDay]);

  const hasHistoricalVsCodeMetadataGap = React.useMemo(
    () => {
      if (vsLoading || vsError || currentStableMinor === null || effectiveVsCodeStableMinor !== null) {
        return false;
      }

      if (parsedReportEndDay === null || earliestVsCodeStableReleaseDate === null) {
        return false;
      }

      return parsedReportEndDay.getTime() < new Date(earliestVsCodeStableReleaseDate).getTime();
    },
    [currentStableMinor, earliestVsCodeStableReleaseDate, effectiveVsCodeStableMinor, parsedReportEndDay, vsError, vsLoading],
  );

  const effectiveVsCodePreviewTrainLabel = React.useMemo(() => {
    if (effectiveVsCodePreviewMinor !== null) return effectiveVsCodePreviewMinor;
    if (effectiveVsCodeStableMinor !== null) return effectiveVsCodeStableMinor + 1;
    return null;
  }, [effectiveVsCodePreviewMinor, effectiveVsCodeStableMinor]);

  const classifyVsCode = React.useCallback(
    (version: string): VsCodeVersionClassification => {
      if (effectiveVsCodeStableMinor === null) return 'unknown';
      return classifyVsCodeVersion(
        version,
        effectiveVsCodeStableMinor,
        effectiveVsCodePreviewMinor ?? effectiveVsCodeStableMinor + 1,
      );
    },
    [effectiveVsCodePreviewMinor, effectiveVsCodeStableMinor],
  );

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

  const vsCodeVersionDateMap = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const { version, releaseDate } of vsCodeStableReleases) {
      if (!map.has(version)) map.set(version, releaseDate);
    }
    return map;
  }, [vsCodeStableReleases]);

  const outdatedPlugins = React.useMemo(() => {
    return pluginVersionAnalysis.filter(plugin => 
      !latestTwentyVersions.includes(plugin.version)
    );
  }, [pluginVersionAnalysis, latestTwentyVersions]);

  const outdatedVsCodePlugins = React.useMemo(
    () =>
      vscodeVersionAnalysis.filter(
        (plugin) => classifyVsCode(plugin.version) === 'outdated',
      ),
    [vscodeVersionAnalysis, classifyVsCode],
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

  function formatReportDay(reportDay: string): string {
    const reportDayEnd = parseReportDayEnd(reportDay);
    if (reportDayEnd === null) return reportDay;

    try {
      return reportDayEnd.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
      });
    } catch {
      return reportDay;
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

  const jetbrainsVersionsColumns: TableColumn<typeof latestTwentyUpdates[number]>[] = [
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
      renderCell: (item) => {
        const cls = classifyVsCode(item.version);
        if (cls === 'stable') return 'Stable';
        if (cls === 'prerelease') return 'Pre-release';
        if (cls === 'latest-preview') return 'Latest preview';
        if (cls === 'outdated') return 'Outdated';
        return vsLoading ? 'Loading\u2026' : 'Unknown';
      },
    },
    {
      id: 'releaseDate',
      header: 'Release Date',
      headerClassName: tableHeaderClass,
      className: narrowCellClass,
      renderCell: (item) => {
        if (classifyVsCode(item.version) !== 'outdated') return '\u2014';
        const date = vsCodeVersionDateMap.get(item.version);
        return date ? formatDate(date) : '\u2014';
      },
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
        columns={{ base: 1, md: 2, lg: 4 }}
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
            title: 'CLI Users',
            value: stats.cliUsers,
            accent: 'indigo',
            subtitle: `Out of ${stats.uniqueUsers.toLocaleString()} unique users`,
            icon: <MetricTileIcon name="cli-users" />,
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
            completionOnlyUsers: 0,
            chatUsers: 0,
            agentModeUsers: 0,
            askModeUsers: 0,
            editModeUsers: 0,
            inlineModeUsers: 0,
            planModeUsers: 0,
            cliUsers: 0,
            advancedUsers: 0,
          }
        }
      />
      <CopilotAdoptionInsights featureAdoptionData={featureAdoptionData} stats={stats} />
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
                  Plugin versions that are not among the latest 20 stable releases. Users with outdated plugins may be missing important features and security updates.
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
                <h4 className="text-md font-semibold text-gray-800 mb-3">JetBrains &mdash; Latest 20 Plugin Versions</h4>
                <ExpandableTableSection
                  items={latestTwentyUpdates}
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
              VS Code using the GitHub Copilot extension. When release history is available, version status is evaluated against the stable train available by the end of the report window; if not, it falls back to the currently bundled stable train. Timestamp builds are treated as pre-release channels.
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
                  subtitle:
                    hasHistoricalVsCodeMetadataGap
                      ? 'Historical release metadata is unavailable for this report window'
                      : effectiveVsCodeStableMinor === null
                      ? 'Unable to evaluate VS Code stable train for this report window'
                      : `Stable 0.${effectiveVsCodeStableMinor}, latest preview 0.${effectiveVsCodePreviewTrainLabel}`,
                  icon: <MetricTileIcon name="vs-versions" />,
                },
                {
                  title: 'VS Code Users on Outdated Versions',
                  value:
                    !vsLoading && effectiveVsCodeStableMinor !== null
                      ? outdatedVsCodePlugins.reduce((sum, p) => sum + p.userCount, 0)
                      : null,
                  accent:
                    !vsLoading && effectiveVsCodeStableMinor !== null
                      ? outdatedVsCodePlugins.length > 0
                        ? 'orange'
                        : 'emerald'
                      : 'amber',
                  subtitle:
                    vsLoading
                      ? undefined
                      : hasHistoricalVsCodeMetadataGap
                        ? 'Historical release metadata unavailable for this report range'
                      : effectiveVsCodeStableMinor === null
                        ? vsError
                          ? 'Release metadata unavailable'
                          : 'No release metadata available'
                        : `Earlier than stable 0.${effectiveVsCodeStableMinor}`,
                  isLoading: vsLoading,
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

          <div className="rounded-md border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
            {vsLoading ? (
              <div className="text-gray-500">Loading VS Code release metadata…</div>
            ) : vsError ? (
              <div className="text-red-600">Failed to load VS Code release metadata: {vsError}</div>
            ) : currentStableMinor === null ? (
              <div className="text-gray-500">No VS Code release metadata available.</div>
            ) : hasHistoricalVsCodeMetadataGap ? (
              <div className="space-y-1">
                <p>
                  <span className="font-medium text-gray-900">Status evaluation:</span>{' '}
                  This report ends on {formatReportDay(stats.reportEndDay)}, which predates the bundled VS Code stable release history.
                </p>
                <p>
                  Historical metadata in this build starts at {formatDate(earliestVsCodeStableReleaseDate ?? '')}, so older report windows are shown without stable or outdated classification.
                </p>
                {vsUpdatedAt && (
                  <p>
                    <span className="font-medium text-gray-900">Metadata updated:</span>{' '}
                    {formatDate(vsUpdatedAt)}
                  </p>
                )}
              </div>
            ) : effectiveVsCodeStableMinor === null ? (
              <div className="text-gray-500">
                Unable to evaluate VS Code extension status for this report window because the report end date or release metadata is incomplete.
              </div>
            ) : (
              <div className="space-y-1">
                <p>
                  <span className="font-medium text-gray-900">Status evaluation:</span>{' '}
                  Versions are compared against the stable release train available by the end of this report window ({formatReportDay(stats.reportEndDay)}).
                </p>
                <p>
                  <span className="font-medium text-gray-900">Stable release train at report end:</span>{' '}
                  0.{effectiveVsCodeStableMinor}
                </p>
                <p>
                  <span className="font-medium text-gray-900">Latest preview train:</span>{' '}
                  0.{effectiveVsCodePreviewTrainLabel}.x
                </p>
                <p>
                  <span className="font-medium text-gray-900">Timestamp builds:</span>{' '}
                  treated as pre-release versions instead of exact releases that must stay in a rolling window.
                </p>
                {vsUpdatedAt && (
                  <p>
                    <span className="font-medium text-gray-900">Metadata updated:</span>{' '}
                    {formatDate(vsUpdatedAt)}
                  </p>
                )}
              </div>
            )}
          </div>

          {vscodeVersionAnalysis.length > 0 && (
            <div className="space-y-4">
              <h4 className="text-md font-semibold text-gray-800 mb-3">VS Code Users by Extension Version</h4>
              <p className="text-sm text-gray-600">
                Breakdown of VS Code users by installed GitHub Copilot extension version. Statuses are evaluated using the report end date, stable versions like 0.38 and 0.38.2 stay current within their release window, timestamp builds are treated as pre-release, and only earlier release trains are considered outdated.
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
                      rowClassName={(item, index) => `${classifyVsCode(item.version) === 'outdated' ? 'hover:bg-red-50' : 'hover:bg-gray-50'} ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
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
