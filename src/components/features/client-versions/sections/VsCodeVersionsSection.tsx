"use client";

import React from 'react';
import { MetricTileGroup, MetricTileIcon, StatsGrid } from '../../../ui';
import MetricsTable, { TableColumn } from '../../../ui/MetricsTable';
import InsightsCard from '../../../ui/InsightsCard';
import {
  classifyVsCodeVersion,
  parseReportDayInclusiveEnd,
  resolveCurrentStableMinorAtDate,
  type VsCodeVersionClassification,
} from '../../../../domain/vscodeVersionClassifier';
import type { PluginVersionEntry } from '../../../../types/metrics';
import type { PluginVersion } from '../../../../hooks/usePluginVersions';
import {
  formatDate,
  formatReportDay,
  narrowCellClass,
  renderVersionUsernames,
  tableHeaderClass,
  usernameCellClass,
} from '../versionSectionUtils';

interface VsCodeVersionsSectionProps {
  sectionId: string;
  versionAnalysis: PluginVersionEntry[];
  totalUniqueVsCodeUsers: number;
  stableReleases: PluginVersion[];
  isLoading: boolean;
  error: string | null;
  currentStableMinor: number | null;
  currentPreviewMinor: number | null;
  updatedAt: string | null;
  reportStartDay: string;
}

export default function VsCodeVersionsSection({
  sectionId,
  versionAnalysis,
  totalUniqueVsCodeUsers,
  stableReleases,
  isLoading,
  error,
  currentStableMinor,
  currentPreviewMinor,
  updatedAt,
  reportStartDay,
}: VsCodeVersionsSectionProps) {
  const effectiveStableMinor = React.useMemo(() => {
    const releaseWindowMinor = resolveCurrentStableMinorAtDate(stableReleases, reportStartDay);
    if (releaseWindowMinor !== null) return releaseWindowMinor;
    if (stableReleases.length > 0) return null;
    return currentStableMinor;
  }, [currentStableMinor, reportStartDay, stableReleases]);

  const effectivePreviewMinor = React.useMemo(() => {
    if (effectiveStableMinor === null) return null;

    if (
      currentStableMinor !== null
      && currentPreviewMinor !== null
      && effectiveStableMinor === currentStableMinor
    ) {
      return currentPreviewMinor;
    }

    return effectiveStableMinor + 1;
  }, [currentPreviewMinor, currentStableMinor, effectiveStableMinor]);

  const earliestStableReleaseDate = React.useMemo(() => {
    let earliest: string | null = null;

    for (const release of stableReleases) {
      const releaseTime = new Date(release.releaseDate).getTime();
      if (Number.isNaN(releaseTime)) continue;
      if (earliest === null || releaseTime < new Date(earliest).getTime()) {
        earliest = release.releaseDate;
      }
    }

    return earliest;
  }, [stableReleases]);

  const parsedReportStartDay = React.useMemo(() => parseReportDayInclusiveEnd(reportStartDay), [reportStartDay]);

  const hasHistoricalMetadataGap = React.useMemo(
    () => {
      if (isLoading || error || currentStableMinor === null || effectiveStableMinor !== null) {
        return false;
      }

      if (parsedReportStartDay === null || earliestStableReleaseDate === null) {
        return false;
      }

      return parsedReportStartDay.getTime() < new Date(earliestStableReleaseDate).getTime();
    },
    [currentStableMinor, earliestStableReleaseDate, effectiveStableMinor, error, isLoading, parsedReportStartDay],
  );

  const effectivePreviewTrainLabel = React.useMemo(() => {
    if (effectivePreviewMinor !== null) return effectivePreviewMinor;
    if (effectiveStableMinor !== null) return effectiveStableMinor + 1;
    return null;
  }, [effectivePreviewMinor, effectiveStableMinor]);

  const classifyVsCode = React.useCallback(
    (version: string): VsCodeVersionClassification => {
      if (effectiveStableMinor === null) return 'unknown';
      return classifyVsCodeVersion(
        version,
        effectiveStableMinor,
        effectivePreviewMinor ?? effectiveStableMinor + 1,
      );
    },
    [effectivePreviewMinor, effectiveStableMinor],
  );

  const stableReleaseDateMap = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const { version, releaseDate } of stableReleases) {
      if (!map.has(version)) map.set(version, releaseDate);
    }
    return map;
  }, [stableReleases]);

  const outdatedVersions = React.useMemo(
    () =>
      versionAnalysis.filter(
        (plugin) => classifyVsCode(plugin.version) === 'outdated',
      ),
    [versionAnalysis, classifyVsCode],
  );

  const outdatedUserCount = React.useMemo(
    () => new Set(outdatedVersions.flatMap((p) => p.usernames)).size,
    [outdatedVersions],
  );

  const latestTwentyStableReleases = React.useMemo(
    () => stableReleases.slice(0, 20),
    [stableReleases],
  );

  const outdatedVersionsColumns: TableColumn<typeof outdatedVersions[number]>[] = [
    {
      id: 'version',
      header: 'Extension Version',
      headerClassName: `${tableHeaderClass} text-red-600`,
      className: 'px-4 py-2 font-mono text-gray-900 whitespace-nowrap',
      renderCell: (item) => item.version,
    },
    {
      id: 'releaseDate',
      header: 'Release Date',
      headerClassName: `${tableHeaderClass} text-red-600`,
      className: narrowCellClass,
      renderCell: (item) => {
        const date = stableReleaseDateMap.get(item.version);
        return date ? formatDate(date) : '\u2014';
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
      renderCell: (item) => renderVersionUsernames('vscode', item.version, item.usernames),
    },
  ];

  const stableVersionsColumns: TableColumn<typeof stableReleases[number]>[] = [
    {
      id: 'version',
      header: 'Version',
      headerClassName: tableHeaderClass,
      className: 'px-4 py-2 font-mono text-gray-900 whitespace-nowrap',
      renderCell: (release) => release.version,
    },
    {
      id: 'releaseDate',
      header: 'Release Date',
      headerClassName: tableHeaderClass,
      className: narrowCellClass,
      renderCell: (release) => formatDate(release.releaseDate),
    },
  ];

  return (
    <>
      <div id={sectionId} className="scroll-mt-28">
        <h4 className="text-md font-semibold text-gray-900 mb-1 mt-6">Visual Studio Code</h4>
        <p className="text-gray-600 text-xs mb-4 max-w-2xl">
          VS Code using the GitHub Copilot extension. When release history is available, version status is evaluated against the stable train available at the start of the report window; if not, it falls back to the currently bundled stable train. Timestamp builds are treated as pre-release channels.
        </p>
      </div>

      {versionAnalysis.length > 0 ? (
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
              value: versionAnalysis.length,
              accent: 'indigo',
              subtitle:
                hasHistoricalMetadataGap
                  ? 'Historical release metadata is unavailable for this report window'
                  : effectiveStableMinor === null
                  ? 'Unable to evaluate VS Code stable train for this report window'
                  : `Stable 0.${effectiveStableMinor}, latest preview 0.${effectivePreviewTrainLabel}`,
              icon: <MetricTileIcon name="vs-versions" />,
            },
            {
              title: 'VS Code Users on Outdated Versions',
              value:
                !isLoading && effectiveStableMinor !== null
                  ? outdatedUserCount
                  : null,
              accent:
                !isLoading && effectiveStableMinor !== null
                  ? outdatedVersions.length > 0
                    ? 'orange'
                    : 'emerald'
                  : 'amber',
              subtitle:
                isLoading
                  ? undefined
                  : hasHistoricalMetadataGap
                    ? 'Historical release metadata unavailable for this report range'
                  : effectiveStableMinor === null
                    ? error
                      ? 'Release metadata unavailable'
                      : 'No release metadata available'
                  : `Earlier than stable 0.${effectiveStableMinor}`,
              isLoading,
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
        {isLoading ? (
          <div className="text-gray-500">Loading VS Code release metadata…</div>
        ) : error ? (
          <div className="text-red-600">Failed to load VS Code release metadata: {error}</div>
        ) : currentStableMinor === null ? (
          <div className="text-gray-500">No VS Code release metadata available.</div>
        ) : hasHistoricalMetadataGap ? (
          <div className="space-y-1">
            <p>
              <span className="font-medium text-gray-900">Status evaluation:</span>{' '}
              This report starts on {formatReportDay(reportStartDay)}, which predates the bundled VS Code stable release history.
            </p>
            <p>
              Historical metadata in this build starts at {formatDate(earliestStableReleaseDate ?? '')}, so older report windows are shown without stable or outdated classification.
            </p>
            {updatedAt && (
              <p>
                <span className="font-medium text-gray-900">Metadata updated:</span>{' '}
                {formatDate(updatedAt)}
              </p>
            )}
          </div>
        ) : effectiveStableMinor === null ? (
          <div className="text-gray-500">
            Unable to evaluate VS Code extension status for this report window because the report start date or release metadata is incomplete.
          </div>
        ) : (
          <div className="space-y-1">
            <p>
              <span className="font-medium text-gray-900">Status evaluation:</span>{' '}
              Versions are compared against the stable release train available at the start of this report window ({formatReportDay(reportStartDay)}).
            </p>
            <p>
              <span className="font-medium text-gray-900">Stable release train at report start:</span>{' '}
              0.{effectiveStableMinor}
            </p>
            <p>
              <span className="font-medium text-gray-900">Latest preview train:</span>{' '}
              0.{effectivePreviewTrainLabel}.x
            </p>
            <p>
              <span className="font-medium text-gray-900">Timestamp builds:</span>{' '}
              treated as pre-release versions instead of exact releases that must stay in a rolling window.
            </p>
            {updatedAt && (
              <p>
                <span className="font-medium text-gray-900">Metadata updated:</span>{' '}
                {formatDate(updatedAt)}
              </p>
            )}
          </div>
        )}
      </div>

      {versionAnalysis.length > 0 && (
        <div className="space-y-8">
          <h4 className="text-md font-semibold text-gray-800 mb-3">Outdated VS Code Extensions</h4>
          <p className="text-sm text-gray-600 mb-3">
            Extension versions earlier than the stable release train available at the start of this report window. Users on outdated extensions may be missing important features and bug fixes. The tile above counts unique users across all outdated versions, while users can appear in multiple rows below if they upgraded during the report window.
          </p>
          {isLoading ? (
            <div className="px-4 py-3 text-gray-500">Loading release metadata…</div>
          ) : effectiveStableMinor === null ? (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-md text-gray-600 text-sm">
              Unable to classify versions — release metadata unavailable for this report window.
            </div>
          ) : outdatedVersions.length > 0 ? (
            <MetricsTable
              data={outdatedVersions}
              columns={outdatedVersionsColumns}
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
              <div className="text-green-800 font-medium">✓ All users are on recent extension versions!</div>
              <div className="text-green-700 text-sm mt-1">No outdated VS Code extensions detected among your users.</div>
            </div>
          )}

          <div>
            <h4 className="text-md font-semibold text-gray-800 mb-3">VS Code &mdash; Latest Stable Releases</h4>
            {isLoading ? (
              <div className="overflow-x-auto border border-gray-200">
                <div className="px-4 py-3 text-gray-500">Loading…</div>
              </div>
            ) : error ? (
              <div className="overflow-x-auto border border-gray-200">
                <div className="px-4 py-3 text-red-600">Failed to load VS Code releases: {error}</div>
              </div>
            ) : stableReleases.length === 0 ? (
              <div className="overflow-x-auto border border-gray-200">
                <div className="px-4 py-3 text-gray-500">No version data available.</div>
              </div>
            ) : (
              <MetricsTable
                data={latestTwentyStableReleases}
                columns={stableVersionsColumns}
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
            <InsightsCard title="Extension Health Status" variant="orange">
              <p>
                {isLoading
                  ? 'Loading extension version analysis…'
                  : effectiveStableMinor === null
                    ? 'Unable to evaluate extension health — release metadata is unavailable for this report window.'
                    : outdatedVersions.length === 0
                      ? 'Excellent! All VS Code users are on recent extension versions with latest features and security updates.'
                      : `${outdatedUserCount} user${outdatedUserCount !== 1 ? 's' : ''} ${outdatedUserCount !== 1 ? 'are' : 'is'} using outdated extensions which can result in incomplete telemetry and skewed statistics. Consider upgrading for better performance, feature completeness, and accurate reporting.`}
              </p>
            </InsightsCard>
            <InsightsCard title="Upgrade Recommendations" variant="blue">
              <p>
                {isLoading
                  ? 'Waiting for release metadata…'
                  : effectiveStableMinor === null
                    ? 'Once release metadata is available, outdated extensions will be identified here with upgrade recommendations.'
                    : outdatedVersions.length > 0
                      ? 'Contact users with outdated extensions to upgrade. Latest versions include improved Agent Mode, better code review features, and enhanced MCP support.'
                      : 'Keep monitoring extension versions regularly. New releases often include performance improvements and advanced AI features.'}
              </p>
            </InsightsCard>
          </StatsGrid>
        </div>
      )}
    </>
  );
}
