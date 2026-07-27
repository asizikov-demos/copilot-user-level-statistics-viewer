"use client";

import React from 'react';
import { MetricTileGroup, MetricTileIcon, StatsGrid } from '../../../ui';
import MetricsTable, { TableColumn } from '../../../ui/MetricsTable';
import InsightsCard from '../../../ui/InsightsCard';
import type { PluginVersionEntry } from '../../../../types/metrics';
import type { PluginVersion } from '../../../../hooks/usePluginVersions';
import {
  formatDate,
  narrowCellClass,
  renderVersionUsernames,
  tableHeaderClass,
  usernameCellClass,
} from '../versionSectionUtils';

interface JetBrainsVersionsSectionProps {
  sectionId: string;
  pluginVersionAnalysis: PluginVersionEntry[];
  totalUniqueIntellijUsers: number;
  jetbrainsUpdates: PluginVersion[];
  isLoading: boolean;
  error: string | null;
}

export default function JetBrainsVersionsSection({
  sectionId,
  pluginVersionAnalysis,
  totalUniqueIntellijUsers,
  jetbrainsUpdates,
  isLoading,
  error,
}: JetBrainsVersionsSectionProps) {
  const latestTwentyUpdates = React.useMemo(() => {
    const stable = jetbrainsUpdates.filter(u => !u.version.toLowerCase().endsWith('-nightly'));
    return stable.slice(0, 20);
  }, [jetbrainsUpdates]);

  const latestTwentyVersions = React.useMemo(() => latestTwentyUpdates.map(u => u.version), [latestTwentyUpdates]);

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

  const outdatedPlugins = React.useMemo(() => {
    return pluginVersionAnalysis.filter(plugin =>
      !latestTwentyVersions.includes(plugin.version)
    );
  }, [pluginVersionAnalysis, latestTwentyVersions]);

  const outdatedJetBrainsUserCount = React.useMemo(
    () => new Set(outdatedPlugins.flatMap((p) => p.usernames)).size,
    [outdatedPlugins],
  );

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
      renderCell: (plugin) => renderVersionUsernames('jetbrains', plugin.version, plugin.usernames),
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

  return (
    <>
      <div id={sectionId} className="scroll-mt-28">
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
              value: outdatedJetBrainsUserCount,
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
          <div className="rounded-md border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
            {isLoading ? (
              <div className="text-gray-500">Loading JetBrains release metadata…</div>
            ) : error ? (
              <div className="text-red-600">Failed to load JetBrains release metadata: {error}</div>
            ) : jetbrainsUpdates.length === 0 ? (
              <div className="text-gray-500">No JetBrains release metadata available.</div>
            ) : (
              <div className="space-y-1">
                <p>
                  <span className="font-medium text-gray-900">Status evaluation:</span>{' '}
                  Versions are compared against the latest 20 stable releases from the JetBrains Marketplace.
                </p>
                <p>
                  <span className="font-medium text-gray-900">Outdated threshold:</span>{' '}
                  Any version not in the latest 20 stable releases is considered outdated.
                </p>
              </div>
            )}
          </div>

          <div>
            <h4 className="text-md font-semibold text-gray-800 mb-3">Outdated Plugins</h4>
            <p className="text-sm text-gray-600 mb-3">
              Plugin versions that are not among the latest 20 stable releases. Users with outdated plugins may be missing important features and security updates.
            </p>
            {outdatedPlugins.length > 0 ? (
              <MetricsTable
                data={outdatedPlugins}
                columns={outdatedPluginsColumns}
                tableClassName="min-w-full divide-y divide-gray-200 text-sm"
                tableContainerClassName="overflow-x-auto border border-gray-200"
                theadClassName="bg-red-50"
                rowClassName={() => 'hover:bg-gray-50'}
                initialCount={5}
                buttonCollapsedLabel={(total) => `Show All ${total} Versions`}
                buttonExpandedLabel="Show Less"
              />
            ) : (
              <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                <div className="text-green-800 font-medium">✓ All users are on recent plugin versions!</div>
                <div className="text-green-700 text-sm mt-1">No outdated plugins detected among your IntelliJ users.</div>
              </div>
            )}
          </div>

          <div>
            <h4 className="text-md font-semibold text-gray-800 mb-3">JetBrains &mdash; Latest 20 Plugin Versions</h4>
            {isLoading ? (
              <div className="overflow-x-auto border border-gray-200">
                <div className="px-4 py-3 text-gray-500">Loading…</div>
              </div>
            ) : error ? (
              <div className="overflow-x-auto border border-gray-200">
                <div className="px-4 py-3 text-red-600">Failed to load plugin versions: {error}</div>
              </div>
            ) : jetbrainsUpdates.length === 0 ? (
              <div className="overflow-x-auto border border-gray-200">
                <div className="px-4 py-3 text-gray-500">No version data available.</div>
              </div>
            ) : (
              <MetricsTable
                data={latestTwentyUpdates}
                columns={jetbrainsVersionsColumns}
                tableClassName="min-w-full divide-y divide-gray-200 text-sm"
                tableContainerClassName="overflow-x-auto border border-gray-200"
                theadClassName="bg-gray-50"
                rowClassName={() => 'hover:bg-gray-50'}
                initialCount={2}
                buttonCollapsedLabel={(total) => `Show All ${total} Versions`}
                buttonExpandedLabel="Show Less"
              />
            )}
          </div>

          <StatsGrid columns={{ base: 1, md: 2 }} gapClassName="gap-4">
            <InsightsCard title="Plugin Health Status" variant="orange">
              <p>
                {outdatedPlugins.length === 0
                  ? 'Excellent! All IntelliJ users are on recent plugin versions with latest features and security updates.'
                  : `${outdatedJetBrainsUserCount} user${outdatedJetBrainsUserCount !== 1 ? 's' : ''} ${outdatedJetBrainsUserCount !== 1 ? 'are' : 'is'} using outdated plugins which can result in incomplete telemetry and skewed statistics. Consider upgrading for better performance, feature completeness, and accurate reporting.`}
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
      )}
    </>
  );
}
