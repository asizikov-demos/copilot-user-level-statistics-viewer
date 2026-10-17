'use client';

import { Banner, Details, Label } from '@primer/react';
import { ChevronRightIcon } from '@primer/octicons-react';
import type { PluginVersion } from '../../../hooks/usePluginVersions';
import { getIDEIcon } from '../../icons/IDEIcons';
import EmptyState from '../../ui/EmptyState';
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
    unknown: 'border-default bg-muted text-muted',
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
          : 'border-default bg-muted'
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
      className="overflow-hidden rounded-lg border border-default bg-default scroll-mt-28"
    >
      <div
        className={`flex flex-col gap-5 border-b border-default p-5 sm:flex-row sm:items-center sm:justify-between ${
          kind === 'attention'
            ? 'bg-attention-muted'
            : kind === 'healthy'
              ? 'bg-green-50'
              : 'bg-muted'
        }`}
      >
        <div className="flex gap-3">
          <StatusIcon kind={kind} />
          <div>
            <h2 className="font-semibold text-default">
              {!hasData
                ? 'No client version data available'
                : hasUnclassifiedPlatform
                  ? 'Some client versions could not be evaluated'
                  : totalOutdatedUsers > 0
                    ? `${totalOutdatedUsers.toLocaleString()} ${totalOutdatedUsers === 1 ? 'user needs' : 'users need'} attention`
                    : 'All classified clients are current'}
            </h2>
            <p className={`mt-1 text-sm ${kind === 'attention' ? 'text-attention' : 'text-muted'}`}>
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
          <div className={`text-sm ${kind === 'attention' ? 'text-attention' : 'text-muted'}`}>
            <span className="font-semibold">{coverage}%</span> current-user coverage
          </div>
        )}
      </div>

      <div className="divide-y divide-default">
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
                  <h3 className="font-semibold text-default">{platform.platform}</h3>
                  <p className="text-xs text-muted">{getMetadataLabel(platform)}</p>
                </div>
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between gap-3 text-xs">
                  <span className="font-medium text-default">
                    {platform.currentUsers === null
                      ? 'Classification unavailable'
                      : `${platform.currentUsers.toLocaleString()} current`}
                  </span>
                  <span className="text-muted">{platform.totalUsers.toLocaleString()} users</span>
                </div>
                {currentPercentage === null ? (
                  <div className="h-2 overflow-hidden rounded-full bg-[var(--borderColor-default)]" aria-hidden="true" />
                ) : (
                  <div
                    className="flex h-2 overflow-hidden rounded-full bg-[var(--borderColor-muted)]"
                    role="img"
                    aria-label={`${Math.round(currentPercentage)}% of ${platform.platform} users are current${unclassifiedPercentage > 0 ? `; ${Math.round(unclassifiedPercentage)}% are unclassified` : ''}`}
                  >
                    <div className="bg-success-emphasis" style={{ width: `${currentPercentage}%` }} />
                    {unclassifiedPercentage > 0 && (
                      <div className="bg-[var(--borderColor-emphasis)]" style={{ width: `${unclassifiedPercentage}%` }} />
                    )}
                    <div className="flex-1 bg-attention-emphasis" />
                  </div>
                )}
              </div>
              <div className="text-sm md:text-right">
                {platform.outdatedUsers === null ? (
                  <span className="text-muted">{platform.uniqueVersions} versions observed</span>
                ) : platform.outdatedUsers > 0 ? (
                  <a
                    href={`#${sectionIds.drift}`}
                    className="font-medium text-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-outlineColor)]"
                  >
                    Review {platform.outdatedUsers.toLocaleString()} {platform.outdatedUsers === 1 ? 'user' : 'users'}
                  </a>
                ) : (platform.unclassifiedUsers ?? 0) > 0 ? (
                  <span className="text-muted">
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
      className: 'px-4 py-3 font-medium text-default whitespace-nowrap',
      renderCell: ({ platform }) => platform,
    },
    {
      id: 'version',
      header: 'Version',
      className: 'px-4 py-3 font-mono text-default whitespace-nowrap',
      renderCell: ({ version }) => version,
    },
    {
      id: 'status',
      header: 'Status',
      className: 'px-4 py-3 whitespace-nowrap',
      renderCell: () => <Label variant="danger">Outdated</Label>,
    },
    {
      id: 'users',
      header: 'Users',
      className: 'px-4 py-3 font-semibold tabular-nums text-default whitespace-nowrap',
      renderCell: ({ userCount }) => userCount.toLocaleString(),
    },
    {
      id: 'reason',
      header: 'Why it matters',
      className: 'px-4 py-3 text-muted whitespace-nowrap',
      renderCell: ({ reason }) => reason,
    },
    {
      id: 'usernames',
      header: 'Affected users',
      className: 'px-4 py-3 text-default min-w-64',
      renderCell: ({ scope, version, usernames }) =>
        renderVersionUsernames(scope, version, usernames),
    },
  ];

  return (
    <section id={sectionId} className="scroll-mt-28">
      <div className="mb-3">
        <h2 className="text-base font-semibold text-default">Version drift</h2>
        <p className="mt-1 text-sm text-muted">
          Outdated version cohorts, ordered by the number of affected users.
        </p>
      </div>
      {!hasVersionData ? (
        <EmptyState
          border
          heading="No version cohorts available"
          description="This report does not include JetBrains or VS Code version data."
        />
      ) : rows.length > 0 ? (
        <MetricsTable
          data={rows}
          columns={columns}
          tableClassName="min-w-[900px] w-full text-left text-sm"
          tableContainerClassName="overflow-x-auto rounded-md border border-default bg-default"
          theadClassName="bg-muted text-xs text-muted"
          rowClassName={() => 'hover:bg-muted'}
          getRowKey={(row) => `${row.scope}-${row.version}`}
          initialCount={6}
          buttonCollapsedLabel={(total) => `Show all ${total} outdated versions`}
          buttonExpandedLabel="Show fewer versions"
        />
      ) : unclassifiedPlatforms.length > 0 ? (
        <EmptyState
          border
          heading="No outdated versions identified"
          description={
            <>
              Classification is unavailable for {unclassifiedPlatforms.map(({ platform }) => platform).join(' and ')};
              no healthy status is inferred without release metadata.
            </>
          }
        />
      ) : (
        <Banner variant="success">
          <Banner.Title as="h3">No outdated versions detected</Banner.Title>
          <Banner.Description>
            All clients with available release metadata are within their current version window.
          </Banner.Description>
        </Banner>
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
    return <p className="text-sm text-muted">No release reference is available.</p>;
  }

  return (
    <div>
      <h4 className="text-sm font-semibold text-default">{title}</h4>
      <ul className="mt-2 divide-y divide-default rounded-md border border-default bg-default">
        {releases.slice(0, 5).map((release) => (
          <li key={`${release.version}-${release.releaseDate}`} className="flex items-center justify-between gap-4 px-3 py-2 text-sm">
            <code className="text-default">{release.version}</code>
            <span className="text-xs text-muted">{formatDate(release.releaseDate)}</span>
          </li>
        ))}
      </ul>
      {releases.length > 5 && (
        <p className="mt-2 text-xs text-muted">
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
    <Details
      id={sectionId}
      className="group rounded-md border border-default bg-default scroll-mt-28"
    >
      <Details.Summary className="flex cursor-pointer items-center gap-2 px-4 py-3 text-sm font-medium text-default focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-outlineColor)]">
        <ChevronRightIcon className="text-muted transition-transform group-open:rotate-90" aria-hidden="true" />
        How version status is evaluated
      </Details.Summary>
      <div className="border-t border-default p-4">
        <p className="max-w-3xl text-sm leading-6 text-muted">
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
                  <h3 className="font-semibold text-default">{platform.platform}</h3>
                  <p className="text-xs text-muted">{getMetadataLabel(platform)}</p>
                </div>
              </div>
              <p className="mt-3 text-sm leading-6 text-muted">{platform.methodology}</p>
              {platform.scope === 'vscode' && vsCodeUpdatedAt && (
                <p className="mt-1 text-xs text-muted">
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
    </Details>
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
