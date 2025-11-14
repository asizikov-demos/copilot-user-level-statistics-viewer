"use client";

import React, { useEffect, useState } from 'react';
import FeatureAdoptionChart from './charts/FeatureAdoptionChart';
import AgentModeHeatmapChart from './charts/AgentModeHeatmapChart';
import MetricTile from './ui/MetricTile';
import SectionHeader from './ui/SectionHeader';
import ExpandableTableSection from './ui/ExpandableTableSection';
import InsightsCard from './ui/InsightsCard';
import type { FeatureAdoptionData, AgentModeHeatmapData } from '../utils/metricsParser';
import type { MetricsStats, CopilotMetrics } from '../types/metrics';

interface CopilotAdoptionViewProps {
  featureAdoptionData: FeatureAdoptionData | null;
  agentModeHeatmapData: AgentModeHeatmapData[];
  stats: MetricsStats;
  metrics: CopilotMetrics[];
  onBack: () => void;
}

export default function CopilotAdoptionView({ featureAdoptionData, agentModeHeatmapData, stats, metrics, onBack }: CopilotAdoptionViewProps) {
  // JetBrains plugin updates state
  interface JetBrainsPluginUpdate {
    version: string;
    releaseDate: string; // ISO string
  }

  const [jetbrainsUpdates, setJetbrainsUpdates] = useState<JetBrainsPluginUpdate[] | null>(null);
  const [jbError, setJbError] = useState<string | null>(null);
  const [jbLoading, setJbLoading] = useState<boolean>(false);
  // VS Code extension versions state
  interface VsCodeExtensionVersion {
    version: string;
    releaseDate: string; // ISO string
  }

  const [vscodeVersions, setVsCodeVersions] = useState<VsCodeExtensionVersion[] | null>(null);
  const [vsError, setVsError] = useState<string | null>(null);
  const [vsLoading, setVsLoading] = useState<boolean>(false);
  const [expandedUsernames, setExpandedUsernames] = useState<Set<string>>(new Set());

  useEffect(() => {
    let isMounted = true;
    async function loadUpdates() {
      try {
        setJbLoading(true);

        const res = await fetch('/data/jetbrains.json', { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: unknown = await res.json();

        if (!data || typeof data !== 'object' || !Array.isArray((data as { versions?: unknown }).versions)) {
          throw new Error('Unexpected response shape');
        }

        const versionsArray = (data as { versions: unknown[] }).versions;

        const mapped: JetBrainsPluginUpdate[] = versionsArray.map((item) => {
          const obj = item as { version?: unknown; releaseDate?: unknown };
          return {
            version: typeof obj.version === 'string' ? obj.version : 'n/a',
            releaseDate: typeof obj.releaseDate === 'string' ? obj.releaseDate : String(obj.releaseDate ?? ''),
          };
        });

        if (isMounted) setJetbrainsUpdates(mapped);
      } catch (e) {
        if (isMounted) setJbError((e as Error).message);
      } finally {
        if (isMounted) setJbLoading(false);
      }
    }
    loadUpdates();
    return () => { isMounted = false; };
  }, []);

  // VS Code versions: load rolling history from vscode.json
  useEffect(() => {
    let isMounted = true;
    async function loadVsCodeVersions() {
      try {
        setVsLoading(true);

        const res = await fetch('/data/vscode.json', { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: unknown = await res.json();

        if (!data || typeof data !== 'object' || !Array.isArray((data as { versions?: unknown }).versions)) {
          throw new Error('Unexpected response shape');
        }

        const versionsArray = (data as { versions: unknown[] }).versions;

        const mapped: VsCodeExtensionVersion[] = versionsArray.map((item) => {
          const obj = item as { version?: unknown; releaseDate?: unknown };
          return {
            version: typeof obj.version === 'string' ? obj.version : 'n/a',
            releaseDate:
              typeof obj.releaseDate === 'string'
                ? obj.releaseDate
                : String(obj.releaseDate ?? ''),
          };
        });

        if (isMounted) setVsCodeVersions(mapped);
      } catch (e) {
        if (isMounted) setVsError((e as Error).message);
      } finally {
        if (isMounted) setVsLoading(false);
      }
    }
    loadVsCodeVersions();
    return () => {
      isMounted = false;
    };
  }, []);

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

  // Get latest 8 stable (non-nightly) versions from JetBrains data
  const latestEightUpdates = React.useMemo(() => {
    if (!jetbrainsUpdates) return [];
    const stable = jetbrainsUpdates.filter(u => !u.version.toLowerCase().endsWith('-nightly'));
    return stable.slice(0, 8);
  }, [jetbrainsUpdates]);

  const latestEightVersions = React.useMemo(() => latestEightUpdates.map(u => u.version), [latestEightUpdates]);

  // Map of version -> release date (cdate) for quick lookup (stable only)
  const jetbrainsVersionDateMap = React.useMemo(() => {
    const map = new Map<string, string>();
    if (jetbrainsUpdates) {
      for (const u of jetbrainsUpdates) {
        const vLower = u.version.toLowerCase();
        if (vLower.endsWith('-nightly')) continue; // exclude nightly builds
        if (!map.has(u.version)) {
          map.set(u.version, u.releaseDate);
        }
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
            <ExpandableTableSection
              items={outdatedPlugins}
              initialCount={5}
              buttonCollapsedLabel={(total) => `Show All ${total} Versions`}
              buttonExpandedLabel="Show Less"
            >
              {({ visibleItems }) => (
                <div className="overflow-x-auto border border-gray-200 rounded-md">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-red-50">
                      <tr>
                        <th className="px-4 py-2 text-left font-medium text-gray-700">Plugin Version</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-700">Release Date</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-700">Number of Users</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-700">Usernames</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {visibleItems.map((plugin) => {
                        const cdate = jetbrainsVersionDateMap.get(plugin.version);
                        const releaseDate = cdate ? formatDate(cdate) : 'N/A';
                        return (
                          <tr key={plugin.version} className="hover:bg-gray-50">
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
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
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
        )}

        {/* JetBrains: Latest 8 Versions Table (Collapsible: show 2 by default) */}
        <div className="mb-8">
          <h4 className="text-md font-semibold text-gray-800 mb-3">JetBrains &mdash; Latest 8 Plugin Versions</h4>
          <ExpandableTableSection
            items={latestEightUpdates}
            initialCount={2}
            buttonCollapsedLabel={(total) => `Show All ${total} Versions`}
            buttonExpandedLabel="Show Less"
          >
            {({ visibleItems }) => (
              <div className="overflow-x-auto border border-gray-200 rounded-md">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">Version</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">Release Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {jbLoading && (
                      <tr>
                        <td className="px-4 py-3 text-gray-500" colSpan={2}>Loading…</td>
                      </tr>
                    )}
                    {jbError && !jbLoading && (
                      <tr>
                        <td className="px-4 py-3 text-red-600" colSpan={2}>Failed to load plugin versions: {jbError}</td>
                      </tr>
                    )}
                    {!jbLoading && !jbError && jetbrainsUpdates && jetbrainsUpdates.length === 0 && (
                      <tr>
                        <td className="px-4 py-3 text-gray-500" colSpan={2}>No version data available.</td>
                      </tr>
                    )}
                    {!jbLoading && !jbError && visibleItems.map(update => (
                      <tr key={update.version} className="hover:bg-gray-50">
                        <td className="px-4 py-2 font-mono text-gray-900 whitespace-nowrap">{update.version}</td>
                        <td className="px-4 py-2 text-gray-700 whitespace-nowrap">{formatDate(update.releaseDate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </ExpandableTableSection>
        </div>

        {/* Visual Studio Code Subsection */}
        <h4 className="text-md font-semibold text-gray-900 mb-1 mt-6">Visual Studio Code</h4>
        <p className="text-gray-600 text-xs mb-4 max-w-2xl">
          VS Code using the GitHub Copilot extension. Version history is maintained as a rolling window of recent releases.
        </p>

        <div className="mb-8">
          <ExpandableTableSection
            items={vscodeVersions || []}
            initialCount={2}
            buttonCollapsedLabel={(total) => `Show All ${total} Versions`}
            buttonExpandedLabel="Show Less"
          >
            {({ visibleItems }) => (
              <div className="overflow-x-auto border border-gray-200 rounded-md">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">Version</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">Release Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {vsLoading && (
                      <tr>
                        <td className="px-4 py-3 text-gray-500" colSpan={2}>Loading&hellip;</td>
                      </tr>
                    )}
                    {vsError && !vsLoading && (
                      <tr>
                        <td className="px-4 py-3 text-red-600" colSpan={2}>
                          Failed to load VS Code versions: {vsError}
                        </td>
                      </tr>
                    )}
                    {!vsLoading && !vsError && vscodeVersions && vscodeVersions.length === 0 && (
                      <tr>
                        <td className="px-4 py-3 text-gray-500" colSpan={2}>No version data available.</td>
                      </tr>
                    )}
                    {!vsLoading && !vsError && visibleItems.map((v) => (
                      <tr key={v.version} className="hover:bg-gray-50">
                        <td className="px-4 py-2 font-mono text-gray-900 whitespace-nowrap">{v.version}</td>
                        <td className="px-4 py-2 text-gray-700 whitespace-nowrap">{formatDate(v.releaseDate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </ExpandableTableSection>
        </div>

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
