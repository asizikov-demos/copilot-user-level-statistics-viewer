'use client';

import type { PluginVersion } from '../../../hooks/usePluginVersions';
import { getIDEIcon } from '../../icons/IDEIcons';
import MetricsTable, { type TableColumn } from '../../ui/MetricsTable';
import type {
  ClientPlatformHealth,
  OutdatedClientVersion,
} from './clientVersionAnalysis';
import {
  countUniqueUsersAcrossPlatforms,
} from './clientVersionAnalysis';
import {
  formatDate,
  formatReportDay,
  renderVersionUsernames,
} from './versionSectionUtils';

interface ClientVersionsDashboardProps {
  platforms: ClientPlatformHealth[];
  reportStartDay: string;
  vsCodeUpdatedAt: string | null;
  sectionIds: {
    health: string;
    drift: string;
    methodology: string;
  };
}

function StatusIcon({ kind }: { kind: 'attention' | 'healthy' | 'unknown' }) {
  const styles = {
    attention: 'border-amber-200 bg-amber-50 text-amber-700',
    healthy: 'border-green-200 bg-green-50 text-green-700',
    unknown: 'border-gray-200 bg-gray-50 text-gray-600',
  };

  return (
    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md border ${styles[kind]}`}>
      {kind === 'attention' ? (
        <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.3 3.8 2.4 17.5A2 2 0 0 0 4.1 20h15.8a2 2 0 0 0 1.7-2.5L13.7 3.8a2 2 0 0 0-3.4 0Z" />
        </svg>
      ) : kind === 'healthy' ? (
        <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m5 12 4 4L19 6" />
        </svg>
      ) : (
        <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 17v-6m0-4h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z" />
        </svg>
      )}
      <span className="sr-only">
        {kind === 'attention' ? 'Needs attention' : kind === 'healthy' ? 'Healthy' : 'Status unavailable'}
      </span>
    </span>
  );
}

function PlatformMark({ scope }: { scope: ClientPlatformHealth['scope'] }) {
  const Icon = getIDEIcon(scope);

  return (
    <span
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md border ${
        scope === 'vscode'
          ? 'border-blue-200 bg-blue-50'
          : 'border-gray-200 bg-gray-50'
      }`}
      aria-hidden="true"
    >
      <Icon />
    </span>
  );
}

function getMetadataLabel(platform: ClientPlatformHealth): string {
  switch (platform.metadataState) {
    case 'loading':
      return 'Loading release metadata';
    case 'error':
      return 'Release metadata failed to load';
    case 'historical-gap':
      return 'Historical release metadata unavailable';
    case 'unavailable':
      return 'Release metadata unavailable';
    case 'ready':
      return platform.thresholdLabel;
  }
}

function HealthSummary({
  platforms,
  sectionIds,
}: {
  platforms: ClientPlatformHealth[];
  sectionIds: ClientVersionsDashboardProps['sectionIds'];
}) {
  const classifiedPlatforms = platforms.filter(({ metadataState }) => metadataState === 'ready');
  const totalOutdatedUsers = countUniqueUsersAcrossPlatforms(
    classifiedPlatforms,
    ({ outdatedVersions }) => outdatedVersions,
  );
  const allVersionEntries = platforms.flatMap((platform) => [
    ...platform.outdatedVersions,
  ]);
  const attentionUsernames = new Set(
    classifiedPlatforms.flatMap(({ outdatedVersions }) =>
      outdatedVersions.flatMap(({ usernames }) => usernames),
    ),
  );
  const unclassifiedUsernames = new Set(
    platforms.flatMap((platform) =>
      platform.metadataState === 'ready'
        ? platform.unclassifiedUsernames
        : platform.usernames,
    ),
  );
  for (const username of attentionUsernames) {
    unclassifiedUsernames.delete(username);
  }
  const observedUsernames = new Set(
    platforms.flatMap(({ usernames }) => usernames),
  );
  const platformTotal = platforms.reduce((sum, platform) => sum + platform.totalUsers, 0);
  const currentUserCount = Math.max(
    0,
    observedUsernames.size - attentionUsernames.size - unclassifiedUsernames.size,
  );
  const hasUnclassifiedPlatform = platforms.some(
    ({ metadataState, totalUsers, unclassifiedUsers }) =>
      totalUsers > 0 && (metadataState !== 'ready' || (unclassifiedUsers ?? 0) > 0),
  );
  const unclassifiedUserCount = unclassifiedUsernames.size;
  const coverage = observedUsernames.size === 0 || hasUnclassifiedPlatform
    ? null
    : Math.round((currentUserCount / observedUsernames.size) * 1000) / 10;
  const hasData = platformTotal > 0;
  const kind = !hasData || classifiedPlatforms.length === 0
    ? 'unknown'
    : hasUnclassifiedPlatform
      ? 'unknown'
      : totalOutdatedUsers > 0
        ? 'attention'
        : 'healthy';

  return (
    <section
      id={sectionIds.health}
      className="overflow-hidden rounded-lg border border-[#d1d9e0] bg-white scroll-mt-28"
    >
      <div
        className={`flex flex-col gap-5 border-b border-[#d1d9e0] p-5 sm:flex-row sm:items-center sm:justify-between ${
          kind === 'attention'
            ? 'bg-[#fff8c5]'
            : kind === 'healthy'
              ? 'bg-green-50'
              : 'bg-[#f6f8fa]'
        }`}
      >
        <div className="flex gap-3">
          <StatusIcon kind={kind} />
          <div>
            <h2 className="font-semibold text-[#1f2328]">
              {!hasData
                ? 'No client version data available'
                : hasUnclassifiedPlatform
                  ? 'Some client versions could not be evaluated'
                  : totalOutdatedUsers > 0
                    ? `${totalOutdatedUsers.toLocaleString()} ${totalOutdatedUsers === 1 ? 'user needs' : 'users need'} attention`
                    : 'All classified clients are current'}
            </h2>
            <p className={`mt-1 text-sm ${kind === 'attention' ? 'text-[#6e4c00]' : 'text-[#57606a]'}`}>
              {!hasData
                ? 'No JetBrains or VS Code users with version information were found in this report.'
                : hasUnclassifiedPlatform
                  ? totalOutdatedUsers > 0
                    ? `${totalOutdatedUsers.toLocaleString()} ${totalOutdatedUsers === 1 ? 'user is' : 'users are'} on known outdated versions. Release metadata or version details are missing for ${unclassifiedUserCount.toLocaleString()} more ${unclassifiedUserCount === 1 ? 'user' : 'users'}.`
                    : `No outdated clients were found among classified users. Release metadata or version details are missing for ${unclassifiedUserCount.toLocaleString()} ${unclassifiedUserCount === 1 ? 'user' : 'users'}.`
                  : totalOutdatedUsers > 0
                    ? `${allVersionEntries.length} outdated version ${allVersionEntries.length === 1 ? 'cohort was' : 'cohorts were'} detected across the organization.`
                    : 'No outdated client versions were detected in this report.'}
            </p>
          </div>
        </div>
        {coverage !== null && (
          <div className={`text-sm ${kind === 'attention' ? 'text-[#6e4c00]' : 'text-[#57606a]'}`}>
            <span className="font-semibold">{coverage}%</span> current-user coverage
          </div>
        )}
      </div>

      <div className="divide-y divide-[#d1d9e0]">
        {platforms.map((platform) => {
          const currentPercentage =
            platform.currentUsers === null || platform.totalUsers === 0
              ? null
              : (platform.currentUsers / platform.totalUsers) * 100;
          const unclassifiedPercentage =
            platform.unclassifiedUsers === null || platform.totalUsers === 0
              ? 0
              : (platform.unclassifiedUsers / platform.totalUsers) * 100;

          return (
            <div
              key={platform.scope}
              id={`client-versions-${platform.scope}`}
              className="grid gap-5 p-5 md:grid-cols-[minmax(180px,1fr)_minmax(240px,2fr)_auto] md:items-center"
            >
              <div className="flex items-center gap-3">
                <PlatformMark scope={platform.scope} />
                <div>
                  <h3 className="font-semibold text-[#1f2328]">{platform.platform}</h3>
                  <p className="text-xs text-[#636c76]">{getMetadataLabel(platform)}</p>
                </div>
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between gap-3 text-xs">
                  <span className="font-medium text-[#1f2328]">
                    {platform.currentUsers === null
                      ? 'Classification unavailable'
                      : `${platform.currentUsers.toLocaleString()} current`}
                  </span>
                  <span className="text-[#636c76]">{platform.totalUsers.toLocaleString()} users</span>
                </div>
                {currentPercentage === null ? (
                  <div className="h-2 overflow-hidden rounded-full bg-[#d8dee4]" aria-hidden="true" />
                ) : (
                  <div
                    className="flex h-2 overflow-hidden rounded-full bg-[#eaeef2]"
                    role="img"
                    aria-label={`${Math.round(currentPercentage)}% of ${platform.platform} users are current${unclassifiedPercentage > 0 ? `; ${Math.round(unclassifiedPercentage)}% are unclassified` : ''}`}
                  >
                    <div className="bg-[#1a7f37]" style={{ width: `${currentPercentage}%` }} />
                    {unclassifiedPercentage > 0 && (
                      <div className="bg-[#8c959f]" style={{ width: `${unclassifiedPercentage}%` }} />
                    )}
                    <div className="flex-1 bg-[#bf8700]" />
                  </div>
                )}
              </div>
              <div className="text-sm md:text-right">
                {platform.outdatedUsers === null ? (
                  <span className="text-[#636c76]">{platform.uniqueVersions} versions observed</span>
                ) : platform.outdatedUsers > 0 ? (
                  <a
                    href={`#${sectionIds.drift}`}
                    className="font-medium text-[#0969da] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0969da]"
                  >
                    Review {platform.outdatedUsers.toLocaleString()} {platform.outdatedUsers === 1 ? 'user' : 'users'}
                  </a>
                ) : (platform.unclassifiedUsers ?? 0) > 0 ? (
                  <span className="text-[#636c76]">
                    {platform.unclassifiedUsers?.toLocaleString()} {platform.unclassifiedUsers === 1 ? 'user' : 'users'} unclassified
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 font-medium text-green-700">
                    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m5 12 4 4L19 6" />
                    </svg>
                    No outdated users
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function VersionDriftTable({
  platforms,
  sectionId,
}: {
  platforms: ClientPlatformHealth[];
  sectionId: string;
}) {
  const rows = platforms
    .flatMap(({ outdatedVersions }) => outdatedVersions)
    .sort((left, right) => right.userCount - left.userCount);
  const unclassifiedPlatforms = platforms.filter(
    ({ metadataState, totalUsers, unclassifiedUsers }) =>
      totalUsers > 0 && (metadataState !== 'ready' || (unclassifiedUsers ?? 0) > 0),
  );
  const hasVersionData = platforms.some(({ totalUsers }) => totalUsers > 0);
  const columns: TableColumn<OutdatedClientVersion>[] = [
    {
      id: 'platform',
      header: 'Client',
      className: 'px-4 py-3 font-medium text-[#1f2328] whitespace-nowrap',
      renderCell: ({ platform }) => platform,
    },
    {
      id: 'version',
      header: 'Version',
      className: 'px-4 py-3 font-mono text-[#1f2328] whitespace-nowrap',
      renderCell: ({ version }) => version,
    },
    {
      id: 'status',
      header: 'Status',
      className: 'px-4 py-3 whitespace-nowrap',
      renderCell: () => (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-800">
          <span className="h-1.5 w-1.5 rounded-full bg-red-600" />
          Outdated
        </span>
      ),
    },
    {
      id: 'users',
      header: 'Users',
      className: 'px-4 py-3 font-semibold tabular-nums text-[#1f2328] whitespace-nowrap',
      renderCell: ({ userCount }) => userCount.toLocaleString(),
    },
    {
      id: 'reason',
      header: 'Why it matters',
      className: 'px-4 py-3 text-[#636c76] whitespace-nowrap',
      renderCell: ({ reason }) => reason,
    },
    {
      id: 'usernames',
      header: 'Affected users',
      className: 'px-4 py-3 text-[#1f2328] min-w-64',
      renderCell: ({ scope, version, usernames }) =>
        renderVersionUsernames(scope, version, usernames),
    },
  ];

  return (
    <section id={sectionId} className="scroll-mt-28">
      <div className="mb-3">
        <h2 className="text-base font-semibold text-[#1f2328]">Version drift</h2>
        <p className="mt-1 text-sm text-[#636c76]">
          Outdated version cohorts, ordered by the number of affected users.
        </p>
      </div>
      {!hasVersionData ? (
        <div className="rounded-md border border-[#d1d9e0] bg-[#f6f8fa] p-4">
          <div className="font-medium text-[#1f2328]">No version cohorts available</div>
          <p className="mt-1 text-sm text-[#636c76]">
            This report does not include JetBrains or VS Code version data.
          </p>
        </div>
      ) : rows.length > 0 ? (
        <MetricsTable
          data={rows}
          columns={columns}
          tableClassName="min-w-[900px] w-full text-left text-sm"
          tableContainerClassName="overflow-x-auto rounded-md border border-[#d1d9e0] bg-white"
          theadClassName="bg-[#f6f8fa] text-xs text-[#636c76]"
          rowClassName={() => 'hover:bg-[#f6f8fa]'}
          getRowKey={(row) => `${row.scope}-${row.version}`}
          initialCount={6}
          buttonCollapsedLabel={(total) => `Show all ${total} outdated versions`}
          buttonExpandedLabel="Show fewer versions"
        />
      ) : unclassifiedPlatforms.length > 0 ? (
        <div className="rounded-md border border-[#d1d9e0] bg-[#f6f8fa] p-4">
          <div className="font-medium text-[#1f2328]">No outdated versions identified</div>
          <p className="mt-1 text-sm text-[#636c76]">
            Classification is unavailable for {unclassifiedPlatforms.map(({ platform }) => platform).join(' and ')};
            no healthy status is inferred without release metadata.
          </p>
        </div>
      ) : (
        <div className="rounded-md border border-green-200 bg-green-50 p-4">
          <div className="font-medium text-green-800">No outdated versions detected</div>
          <p className="mt-1 text-sm text-green-700">
            All clients with available release metadata are within their current version window.
          </p>
        </div>
      )}
    </section>
  );
}

function ReleaseList({
  title,
  releases,
}: {
  title: string;
  releases: PluginVersion[];
}) {
  if (releases.length === 0) {
    return <p className="text-sm text-[#636c76]">No release reference is available.</p>;
  }

  return (
    <div>
      <h4 className="text-sm font-semibold text-[#1f2328]">{title}</h4>
      <ul className="mt-2 divide-y divide-[#d1d9e0] rounded-md border border-[#d1d9e0] bg-white">
        {releases.slice(0, 5).map((release) => (
          <li key={`${release.version}-${release.releaseDate}`} className="flex items-center justify-between gap-4 px-3 py-2 text-sm">
            <code className="text-[#1f2328]">{release.version}</code>
            <span className="text-xs text-[#636c76]">{formatDate(release.releaseDate)}</span>
          </li>
        ))}
      </ul>
      {releases.length > 5 && (
        <p className="mt-2 text-xs text-[#636c76]">
          Showing 5 of {releases.length} reference releases.
        </p>
      )}
    </div>
  );
}

function ReleaseMethodology({
  platforms,
  reportStartDay,
  vsCodeUpdatedAt,
  sectionId,
}: Omit<ClientVersionsDashboardProps, 'platforms' | 'sectionIds'> & {
  platforms: ClientPlatformHealth[];
  sectionId: string;
}) {
  return (
    <details
      id={sectionId}
      className="rounded-md border border-[#d1d9e0] bg-white scroll-mt-28"
    >
      <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-[#1f2328] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0969da]">
        How version status is evaluated
      </summary>
      <div className="border-t border-[#d1d9e0] p-4">
        <p className="max-w-3xl text-sm leading-6 text-[#636c76]">
          VS Code is evaluated against the stable train available at the report start
          ({formatReportDay(reportStartDay)}). JetBrains is evaluated against the latest 20 stable
          releases in the bundled marketplace metadata.
        </p>
        <div className="mt-5 grid gap-6 lg:grid-cols-2">
          {platforms.map((platform) => (
            <section
              key={platform.scope}
            >
              <div className="flex items-center gap-3">
                <PlatformMark scope={platform.scope} />
                <div>
                  <h3 className="font-semibold text-[#1f2328]">{platform.platform}</h3>
                  <p className="text-xs text-[#636c76]">{getMetadataLabel(platform)}</p>
                </div>
              </div>
              <p className="mt-3 text-sm leading-6 text-[#636c76]">{platform.methodology}</p>
              {platform.scope === 'vscode' && vsCodeUpdatedAt && (
                <p className="mt-1 text-xs text-[#636c76]">
                  Release metadata updated {formatDate(vsCodeUpdatedAt)}.
                </p>
              )}
              <div className="mt-4">
                <ReleaseList
                  title={platform.scope === 'vscode' ? 'Latest stable releases' : 'Current release window'}
                  releases={platform.referenceReleases}
                />
              </div>
            </section>
          ))}
        </div>
      </div>
    </details>
  );
}

export default function ClientVersionsDashboard({
  platforms,
  reportStartDay,
  vsCodeUpdatedAt,
  sectionIds,
}: ClientVersionsDashboardProps) {
  return (
    <div className="space-y-8">
      <HealthSummary platforms={platforms} sectionIds={sectionIds} />
      <VersionDriftTable platforms={platforms} sectionId={sectionIds.drift} />
      <ReleaseMethodology
        platforms={platforms}
        reportStartDay={reportStartDay}
        vsCodeUpdatedAt={vsCodeUpdatedAt}
        sectionId={sectionIds.methodology}
      />
    </div>
  );
}
