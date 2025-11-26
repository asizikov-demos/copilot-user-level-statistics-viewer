"use client";

import React, { useState } from 'react';
import FeatureAdoptionChart from './charts/FeatureAdoptionChart';
import AgentModeHeatmapChart from './charts/AgentModeHeatmapChart';
import MetricTile from './ui/MetricTile';
import SectionHeader from './ui/SectionHeader';
import {
  DataTable,
  DataTableHeader,
  DataTableBody,
  DataTableColumn,
  DataTableExpandButton,
} from './ui/DataTable';
import InsightsCard from './ui/InsightsCard';
import { usePluginVersions } from '../hooks/usePluginVersions';
import type { FeatureAdoptionData, AgentModeHeatmapData } from '../utils/metricCalculators';
import type { MetricsStats, CopilotMetrics } from '../types/metrics';
import type { VoidCallback } from '../types/events';

interface PluginVersionData {
  version: string;
  userCount: number;
  usernames: string[];
}

interface PluginVersionInfo {
  version: string;
  releaseDate: string;
}

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

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <SectionHeader
        title="Copilot Adoption Analysis"
        description="Understand Copilot feature adoption patterns and Agent Mode usage intensity across days."
        onBack={onBack}
        className="mb-6"
      />

      {/* User Adoption Metrics */}
      <div className="mb-8">
        <h3 className="text-lg font-medium text-gray-900 mb-4">User Adoption Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <MetricTile
            title="Chat Users"
            value={stats.chatUsers}
            accent="emerald"
            subtitle={`Out of ${stats.uniqueUsers.toLocaleString()} unique users`}
            icon={<svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>}
          />
          <MetricTile
            title="Agent Mode Users"
            value={stats.agentUsers}
            accent="violet"
            subtitle={`Out of ${stats.uniqueUsers.toLocaleString()} unique users`}
            icon={<svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>}
          />
          <MetricTile
            title="Completion Only Users"
            value={stats.completionOnlyUsers}
            accent="amber"
            subtitle={`Out of ${stats.uniqueUsers.toLocaleString()} unique users`}
            icon={<svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>}
          />
        </div>
      </div>

      <div className="mb-12">
        <FeatureAdoptionChart data={featureAdoptionData || {
          totalUsers: 0,
          completionUsers: 0,
          chatUsers: 0,
          agentModeUsers: 0,
          askModeUsers: 0,
          editModeUsers: 0,
          inlineModeUsers: 0,
          codeReviewUsers: 0
        }} />
      </div>

      <div className="mb-6 pt-4">
        <AgentModeHeatmapChart data={agentModeHeatmapData || []} />
      </div>

      {/* Plugin Version Analysis Section */}
      <div className="mt-10">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Plugin Version Analysis</h3>
        <p className="text-gray-600 text-sm mb-6 max-w-2xl">
          Analyze plugin versions across your organization to identify users with outdated plugins that may be missing important features and bug fixes.
        </p>

        {/* JetBrains Subsection */}
        <h4 className="text-md font-semibold text-gray-900 mb-1">JetBrains</h4>
        <p className="text-gray-600 text-xs mb-4 max-w-2xl">
          IntelliJ-based IDEs using the GitHub Copilot JetBrains plugin.
        </p>

        {/* Plugin Summary Metrics (JetBrains) */}
        {pluginVersionAnalysis.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <MetricTile
              title="Total IntelliJ Users"
              value={totalUniqueIntellijUsers}
              accent="blue"
              subtitle="Users with plugin version data"
              icon={<svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            />
            <MetricTile
              title="Unique Plugin Versions"
              value={pluginVersionAnalysis.length}
              accent="indigo"
              subtitle="Different versions detected"
              icon={<svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>}
            />
            <MetricTile
              title="Users on Outdated Versions"
              value={outdatedPlugins.reduce((sum, p) => sum + p.userCount, 0)}
              accent={outdatedPlugins.length > 0 ? "orange" : "emerald"}
              subtitle={`${outdatedPlugins.length} outdated version${outdatedPlugins.length !== 1 ? 's' : ''} detected`}
              icon={<svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>}
            />
          </div>
        ) : (
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-md mb-6">
            <div className="text-gray-800 font-medium">No IntelliJ Plugin Data Available</div>
            <div className="text-gray-600 text-sm mt-1">No IntelliJ users found in the current dataset, or plugin version information is not available.</div>
          </div>
        )}

        {/* Outdated JetBrains Plugins Table */}
        {pluginVersionAnalysis.length > 0 && (
          <div className="mb-8">
            <h4 className="text-md font-semibold text-gray-800 mb-3">Outdated Plugins</h4>
            <p className="text-sm text-gray-600 mb-3">
              Plugin versions that are not among the latest 8 stable releases. Users with outdated plugins may be missing important features and security updates.
            </p>
            {outdatedPlugins.length > 0 ? (
            <DataTable
              data={outdatedPlugins}
              initialCount={5}
              containerClassName="overflow-x-auto border border-gray-200 rounded-md"
              tableClassName="min-w-full divide-y divide-gray-200 text-sm"
            >
              <DataTableHeader className="bg-red-50">
                <DataTableColumn<PluginVersionData> field="version" sortable className="px-4 py-2 text-left font-medium text-gray-700">Plugin Version</DataTableColumn>
                <DataTableColumn className="px-4 py-2 text-left font-medium text-gray-700">Release Date</DataTableColumn>
                <DataTableColumn<PluginVersionData> field="userCount" sortable className="px-4 py-2 text-left font-medium text-gray-700">Number of Users</DataTableColumn>
                <DataTableColumn className="px-4 py-2 text-left font-medium text-gray-700">Usernames</DataTableColumn>
              </DataTableHeader>
              <DataTableBody<PluginVersionData>
                rowClassName={() => 'hover:bg-gray-50'}
              >
                {(plugin) => {
                  const cdate = jetbrainsVersionDateMap.get(plugin.version);
                  const releaseDate = cdate ? formatDate(cdate) : 'N/A';
                  return (
                    <>
                      <td className="px-4 py-2 font-mono text-gray-900 whitespace-nowrap">{plugin.version}</td>
                      <td className="px-4 py-2 text-gray-700 whitespace-nowrap">{releaseDate}</td>
                      <td className="px-4 py-2 text-center">{plugin.userCount}</td>
                      <td className="px-4 py-2">
                        <div className="max-w-md">
                          {plugin.usernames.length <= 3 ? (
                            <span className="text-xs text-gray-600">
                              {plugin.usernames.join(', ')}
                            </span>
                          ) : (
                            <div>
                              <span className="text-xs text-gray-600">
                                {expandedUsernames.has(plugin.version) 
                                  ? plugin.usernames.join(', ')
                                  : `${plugin.usernames.slice(0, 3).join(', ')}...`
                                }
                              </span>
                              <button
                                onClick={() => {
                                  const newExpanded = new Set(expandedUsernames);
                                  if (expandedUsernames.has(plugin.version)) {
                                    newExpanded.delete(plugin.version);
                                  } else {
                                    newExpanded.add(plugin.version);
                                  }
                                  setExpandedUsernames(newExpanded);
                                }}
                                className="ml-2 text-xs text-blue-600 hover:text-blue-800 underline"
                              >
                                {expandedUsernames.has(plugin.version) ? 'Show Less' : `Show All ${plugin.usernames.length}`}
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </>
                  );
                }}
              </DataTableBody>
              <DataTableExpandButton
                collapsedLabel={(total) => `Show All ${total} Versions`}
                expandedLabel="Show Less"
              />
            </DataTable>
          ) : (
            <div className="p-4 bg-green-50 border border-green-200 rounded-md">
              <div className="text-green-800 font-medium">✓ All users are on recent plugin versions!</div>
              <div className="text-green-700 text-sm mt-1">No outdated plugins detected among your IntelliJ users.</div>
            </div>
          )}
        </div>
        )}

        {/* JetBrains: Latest 8 Versions Table (Collapsible: show 2 by default) */}
        <div className="mb-8">
          <h4 className="text-md font-semibold text-gray-800 mb-3">JetBrains &mdash; Latest 8 Plugin Versions</h4>
          {jbLoading ? (
            <div className="overflow-x-auto border border-gray-200 rounded-md">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-gray-700">Version</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-700">Release Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  <tr>
                    <td className="px-4 py-3 text-gray-500" colSpan={2}>Loading…</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : jbError ? (
            <div className="overflow-x-auto border border-gray-200 rounded-md">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-gray-700">Version</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-700">Release Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  <tr>
                    <td className="px-4 py-3 text-red-600" colSpan={2}>Failed to load plugin versions: {jbError}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : latestEightUpdates.length === 0 ? (
            <div className="overflow-x-auto border border-gray-200 rounded-md">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-gray-700">Version</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-700">Release Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  <tr>
                    <td className="px-4 py-3 text-gray-500" colSpan={2}>No version data available.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <DataTable
              data={latestEightUpdates}
              initialCount={2}
              containerClassName="overflow-x-auto border border-gray-200 rounded-md"
              tableClassName="min-w-full divide-y divide-gray-200 text-sm"
            >
              <DataTableHeader className="bg-gray-50">
                <DataTableColumn<PluginVersionInfo> field="version" sortable className="px-4 py-2 text-left font-medium text-gray-700">Version</DataTableColumn>
                <DataTableColumn className="px-4 py-2 text-left font-medium text-gray-700">Release Date</DataTableColumn>
              </DataTableHeader>
              <DataTableBody<PluginVersionInfo>
                className="divide-y divide-gray-100 bg-white"
                rowClassName={() => 'hover:bg-gray-50'}
              >
                {(update) => (
                  <>
                    <td className="px-4 py-2 font-mono text-gray-900 whitespace-nowrap">{update.version}</td>
                    <td className="px-4 py-2 text-gray-700 whitespace-nowrap">{formatDate(update.releaseDate)}</td>
                  </>
                )}
              </DataTableBody>
              <DataTableExpandButton
                collapsedLabel={(total) => `Show All ${total} Versions`}
                expandedLabel="Show Less"
              />
            </DataTable>
          )}
        </div>

        {/* Visual Studio Code Subsection */}
        <h4 className="text-md font-semibold text-gray-900 mb-1 mt-6">Visual Studio Code</h4>
        <p className="text-gray-600 text-xs mb-4 max-w-2xl">
          VS Code using the GitHub Copilot extension. Version history is maintained as a rolling window of recent releases.
        </p>

        {/* VS Code Plugin Summary Metrics */}
        {vscodeVersionAnalysis.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <MetricTile
              title="Total VS Code Users"
              value={totalUniqueVsCodeUsers}
              accent="blue"
              subtitle="Users with extension version data"
              icon={
                <svg
                  className="w-8 h-8"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 4h14a2 2 0 012 2v10a2 2 0 01-2 2H7l-4 3V6a2 2 0 012-2z"
                  />
                </svg>
              }
            />
            <MetricTile
              title="Unique VS Code Versions"
              value={vscodeVersionAnalysis.length}
              accent="indigo"
              subtitle="Different extension versions detected"
              icon={
                <svg
                  className="w-8 h-8"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 7h18M3 12h18M3 17h18"
                  />
                </svg>
              }
            />
            <MetricTile
              title="VS Code Users on Outdated Versions"
              value={outdatedVsCodePlugins.reduce((sum, p) => sum + p.userCount, 0)}
              accent={outdatedVsCodePlugins.length > 0 ? 'orange' : 'emerald'}
              subtitle={`${outdatedVsCodePlugins.length} outdated version${outdatedVsCodePlugins.length !== 1 ? 's' : ''} detected`}
              icon={
                <svg
                  className="w-8 h-8"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01M4.93 19h14.14a1 1 0 00.9-1.45L13.9 4.55a1 1 0 00-1.8 0L4.03 17.55A1 1 0 004.93 19z"
                  />
                </svg>
              }
            />
          </div>
        ) : (
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-md mb-6">
            <div className="text-gray-800 font-medium">No VS Code Extension Data Available</div>
            <div className="text-gray-600 text-sm mt-1">No VS Code users with extension version information were found in the current dataset.</div>
          </div>
        )}

        <div className="mb-8">
          {vsLoading ? (
            <div className="overflow-x-auto border border-gray-200 rounded-md">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-gray-700">Version</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-700">Release Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  <tr>
                    <td className="px-4 py-3 text-gray-500" colSpan={2}>Loading&hellip;</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : vsError ? (
            <div className="overflow-x-auto border border-gray-200 rounded-md">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-gray-700">Version</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-700">Release Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  <tr>
                    <td className="px-4 py-3 text-red-600" colSpan={2}>
                      Failed to load VS Code versions: {vsError}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : vscodeVersions.length === 0 ? (
            <div className="overflow-x-auto border border-gray-200 rounded-md">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-gray-700">Version</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-700">Release Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  <tr>
                    <td className="px-4 py-3 text-gray-500" colSpan={2}>No version data available.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <DataTable
              data={vscodeVersions}
              initialCount={2}
              containerClassName="overflow-x-auto border border-gray-200 rounded-md"
              tableClassName="min-w-full divide-y divide-gray-200 text-sm"
            >
              <DataTableHeader className="bg-gray-50">
                <DataTableColumn<PluginVersionInfo> field="version" sortable className="px-4 py-2 text-left font-medium text-gray-700">Version</DataTableColumn>
                <DataTableColumn className="px-4 py-2 text-left font-medium text-gray-700">Release Date</DataTableColumn>
              </DataTableHeader>
              <DataTableBody<PluginVersionInfo>
                className="divide-y divide-gray-100 bg-white"
                rowClassName={() => 'hover:bg-gray-50'}
              >
                {(v) => (
                  <>
                    <td className="px-4 py-2 font-mono text-gray-900 whitespace-nowrap">{v.version}</td>
                    <td className="px-4 py-2 text-gray-700 whitespace-nowrap">{formatDate(v.releaseDate)}</td>
                  </>
                )}
              </DataTableBody>
              <DataTableExpandButton
                collapsedLabel={(total) => `Show All ${total} Versions`}
                expandedLabel="Show Less"
              />
            </DataTable>
          )}
        </div>

        {vscodeVersionAnalysis.length > 0 && (
          <div className="mb-8">
            <h4 className="text-md font-semibold text-gray-800 mb-3">VS Code Users by Extension Version</h4>
            <p className="text-sm text-gray-600 mb-3">
              Breakdown of VS Code users by installed GitHub Copilot extension version. Versions outside the latest rolling window are considered outdated.
            </p>
            <DataTable
              data={vscodeVersionAnalysis}
              initialCount={5}
              containerClassName="overflow-x-auto border border-gray-200 rounded-md"
              tableClassName="min-w-full divide-y divide-gray-200 text-sm"
            >
              <DataTableHeader className="bg-gray-50">
                <DataTableColumn<PluginVersionData> field="version" sortable className="px-4 py-2 text-left font-medium text-gray-700">Extension Version</DataTableColumn>
                <DataTableColumn className="px-4 py-2 text-left font-medium text-gray-700">Status</DataTableColumn>
                <DataTableColumn<PluginVersionData> field="userCount" sortable className="px-4 py-2 text-left font-medium text-gray-700">Number of Users</DataTableColumn>
                <DataTableColumn className="px-4 py-2 text-left font-medium text-gray-700">Usernames</DataTableColumn>
              </DataTableHeader>
              <DataTableBody<PluginVersionData>
                className="divide-y divide-gray-100 bg-white"
                rowClassName={(plugin) => {
                  const isLatest = latestVsCodeVersions.includes(plugin.version);
                  return isLatest ? 'hover:bg-gray-50' : 'hover:bg-red-50';
                }}
              >
                {(plugin) => {
                  const isLatest = latestVsCodeVersions.includes(plugin.version);
                  const isExpanded = expandedVsUsernames.has(plugin.version);
                  const userLabel = isExpanded
                    ? plugin.usernames.join(', ')
                    : `${plugin.usernames.slice(0, 3).join(', ')}${plugin.usernames.length > 3 ? '...' : ''}`;
                  return (
                    <>
                      <td className="px-4 py-2 font-mono text-gray-900 whitespace-nowrap">{plugin.version}</td>
                      <td className="px-4 py-2 text-gray-700 whitespace-nowrap">{isLatest ? 'Latest window' : 'Outdated'}</td>
                      <td className="px-4 py-2 text-center">{plugin.userCount}</td>
                      <td className="px-4 py-2">
                        <div className="max-w-md">
                          <span className="text-xs text-gray-600">{userLabel}</span>
                          {plugin.usernames.length > 3 && (
                            <button
                              onClick={() => {
                                const next = new Set(expandedVsUsernames);
                                if (isExpanded) {
                                  next.delete(plugin.version);
                                } else {
                                  next.add(plugin.version);
                                }
                                setExpandedVsUsernames(next);
                              }}
                              className="ml-2 text-xs text-blue-600 hover:text-blue-800 underline"
                            >
                              {isExpanded ? 'Show Less' : `Show All ${plugin.usernames.length}`}
                            </button>
                          )}
                        </div>
                      </td>
                    </>
                  );
                }}
              </DataTableBody>
              <DataTableExpandButton
                collapsedLabel={(total) => `Show All ${total} Versions`}
                expandedLabel="Show Less"
              />
            </DataTable>
          </div>
        )}

        {/* Insights and Recommendations */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InsightsCard title="Plugin Health Status" variant="orange">
            <p>
              {outdatedPlugins.length === 0 
                ? 'Excellent! All IntelliJ users are on recent plugin versions with latest features and security updates.'
                : `${outdatedPlugins.reduce((sum, p) => sum + p.userCount, 0)} user${outdatedPlugins.reduce((sum, p) => sum + p.userCount, 0) !== 1 ? 's' : ''} ${outdatedPlugins.reduce((sum, p) => sum + p.userCount, 0) !== 1 ? 'are' : 'is'} using outdated plugins which can result in incomplete telemetry and skewed statistics. Consider upgrading for better performance, feature completeness, and accurate reporting.`
              }
            </p>
          </InsightsCard>
          <InsightsCard title="Upgrade Recommendations" variant="blue">
            <p>
              {outdatedPlugins.length > 0 
                ? 'Contact users with outdated plugins to upgrade. Latest versions include improved Agent Mode, better code review features, and enhanced MCP support.'
                : 'Keep monitoring plugin versions regularly. New releases often include performance improvements and advanced AI features.'
              }
            </p>
          </InsightsCard>
        </div>
      </div>
    </div>
  );
}
