import {
  classifyVsCodeVersion,
  parseReportDayInclusiveEnd,
  resolveCurrentStableMinorAtDate,
} from '../../../domain/vscodeVersionClassifier';
import type { PluginVersion } from '../../../hooks/usePluginVersions';
import type { PluginVersionEntry } from '../../../types/metrics';

export type ClientVersionScope = 'jetbrains' | 'vscode';
export type ClientVersionMetadataState =
  | 'loading'
  | 'error'
  | 'unavailable'
  | 'historical-gap'
  | 'ready';

export interface OutdatedClientVersion extends PluginVersionEntry {
  scope: ClientVersionScope;
  platform: string;
  releaseDate: string | null;
  reason: string;
}

export interface ClientPlatformHealth {
  scope: ClientVersionScope;
  platform: string;
  totalUsers: number;
  usernames: string[];
  currentUsers: number | null;
  outdatedUsers: number | null;
  unclassifiedUsers: number | null;
  unclassifiedUsernames: string[];
  uniqueVersions: number;
  metadataState: ClientVersionMetadataState;
  thresholdLabel: string;
  methodology: string;
  outdatedVersions: OutdatedClientVersion[];
  referenceReleases: PluginVersion[];
}

interface JetBrainsHealthInput {
  versionAnalysis: PluginVersionEntry[];
  totalUsers: number;
  releases: PluginVersion[];
  isLoading: boolean;
  error: string | null;
}

interface VsCodeHealthInput {
  versionAnalysis: PluginVersionEntry[];
  totalUsers: number;
  stableReleases: PluginVersion[];
  isLoading: boolean;
  error: string | null;
  currentStableMinor: number | null;
  currentPreviewMinor: number | null;
  reportStartDay: string;
}

function countUniqueUsers(entries: PluginVersionEntry[]): number {
  return new Set(entries.flatMap((entry) => entry.usernames)).size;
}

function collectUniqueUsernames(entries: PluginVersionEntry[]): string[] {
  return [...new Set(entries.flatMap((entry) => entry.usernames))];
}

function createReleaseDateMap(releases: PluginVersion[]): Map<string, string> {
  const releaseDates = new Map<string, string>();
  for (const release of releases) {
    if (!releaseDates.has(release.version)) {
      releaseDates.set(release.version, release.releaseDate);
    }
  }
  return releaseDates;
}

export function analyzeJetBrainsHealth({
  versionAnalysis,
  totalUsers,
  releases,
  isLoading,
  error,
}: JetBrainsHealthInput): ClientPlatformHealth {
  const stableReleases = releases.filter(
    ({ version }) => !version.toLowerCase().endsWith('-nightly'),
  );
  const referenceReleases = stableReleases.slice(0, 20);
  const metadataState: ClientVersionMetadataState = isLoading
    ? 'loading'
    : error
      ? 'error'
      : referenceReleases.length === 0
        ? 'unavailable'
        : 'ready';

  if (metadataState !== 'ready') {
    return {
      scope: 'jetbrains',
      platform: 'JetBrains',
      totalUsers,
      usernames: collectUniqueUsernames(versionAnalysis),
      currentUsers: null,
      outdatedUsers: null,
      unclassifiedUsers: totalUsers,
      unclassifiedUsernames: collectUniqueUsernames(versionAnalysis),
      uniqueVersions: versionAnalysis.length,
      metadataState,
      thresholdLabel: 'Latest 20 stable releases',
      methodology: 'Versions are compared with the latest 20 stable releases from the JetBrains Marketplace.',
      outdatedVersions: [],
      referenceReleases,
    };
  }

  const recentVersions = new Set(referenceReleases.map(({ version }) => version));
  const releaseDates = createReleaseDateMap(stableReleases);
  const outdatedEntries = versionAnalysis.filter(({ version }) => !recentVersions.has(version));
  const outdatedUsers = countUniqueUsers(outdatedEntries);

  return {
    scope: 'jetbrains',
    platform: 'JetBrains',
    totalUsers,
    usernames: collectUniqueUsernames(versionAnalysis),
    currentUsers: Math.max(0, totalUsers - outdatedUsers),
    outdatedUsers,
    unclassifiedUsers: 0,
    unclassifiedUsernames: [],
    uniqueVersions: versionAnalysis.length,
    metadataState,
    thresholdLabel: 'Latest 20 stable releases',
    methodology: 'Versions outside the latest 20 stable releases from the JetBrains Marketplace are classified as outdated.',
    outdatedVersions: outdatedEntries.map((entry) => ({
      ...entry,
      scope: 'jetbrains',
      platform: 'JetBrains',
      releaseDate: releaseDates.get(entry.version) ?? null,
      reason: 'Outside latest 20 stable releases',
    })),
    referenceReleases,
  };
}

function findEarliestReleaseDate(releases: PluginVersion[]): string | null {
  let earliest: string | null = null;
  let earliestTime = Number.POSITIVE_INFINITY;

  for (const release of releases) {
    const releaseTime = new Date(release.releaseDate).getTime();
    if (!Number.isNaN(releaseTime) && releaseTime < earliestTime) {
      earliest = release.releaseDate;
      earliestTime = releaseTime;
    }
  }

  return earliest;
}

export function analyzeVsCodeHealth({
  versionAnalysis,
  totalUsers,
  stableReleases,
  isLoading,
  error,
  currentStableMinor,
  currentPreviewMinor,
  reportStartDay,
}: VsCodeHealthInput): ClientPlatformHealth {
  const releaseWindowMinor = resolveCurrentStableMinorAtDate(stableReleases, reportStartDay);
  const effectiveStableMinor =
    releaseWindowMinor ?? (stableReleases.length === 0 ? currentStableMinor : null);
  const parsedReportStartDay = parseReportDayInclusiveEnd(reportStartDay);
  const earliestReleaseDate = findEarliestReleaseDate(stableReleases);
  const hasHistoricalGap =
    !isLoading
    && !error
    && currentStableMinor !== null
    && effectiveStableMinor === null
    && parsedReportStartDay !== null
    && earliestReleaseDate !== null
    && parsedReportStartDay.getTime() < new Date(earliestReleaseDate).getTime();
  const metadataState: ClientVersionMetadataState = isLoading
    ? 'loading'
    : error
      ? 'error'
      : hasHistoricalGap
        ? 'historical-gap'
        : effectiveStableMinor === null
          ? 'unavailable'
          : 'ready';
  const previewMinor =
    effectiveStableMinor !== null
    && currentStableMinor !== null
    && currentPreviewMinor !== null
    && effectiveStableMinor === currentStableMinor
      ? currentPreviewMinor
      : effectiveStableMinor === null
        ? null
        : effectiveStableMinor + 1;
  const thresholdLabel =
    effectiveStableMinor === null
      ? 'Stable train unavailable'
      : `Stable train 0.${effectiveStableMinor}`;

  if (metadataState !== 'ready' || effectiveStableMinor === null) {
    return {
      scope: 'vscode',
      platform: 'VS Code',
      totalUsers,
      usernames: collectUniqueUsernames(versionAnalysis),
      currentUsers: null,
      outdatedUsers: null,
      unclassifiedUsers: totalUsers,
      unclassifiedUsernames: collectUniqueUsernames(versionAnalysis),
      uniqueVersions: versionAnalysis.length,
      metadataState,
      thresholdLabel,
      methodology: hasHistoricalGap
        ? `This report predates the bundled VS Code release history, which starts on ${earliestReleaseDate}.`
        : 'Versions are evaluated against the stable release train available at the start of the report window.',
      outdatedVersions: [],
      referenceReleases: stableReleases.slice(0, 20),
    };
  }

  const releaseDates = createReleaseDateMap(stableReleases);
  const classifiedEntries = versionAnalysis.map((entry) => ({
    entry,
    classification: classifyVsCodeVersion(
      entry.version,
      effectiveStableMinor,
      previewMinor ?? effectiveStableMinor + 1,
    ),
  }));
  const outdatedEntries = classifiedEntries
    .filter(({ classification }) => classification === 'outdated')
    .map(({ entry }) => entry);
  const unknownEntries = classifiedEntries
    .filter(({ classification }) => classification === 'unknown')
    .map(({ entry }) => entry);
  const outdatedUsernames = new Set(outdatedEntries.flatMap(({ usernames }) => usernames));
  const unclassifiedUsernames = collectUniqueUsernames(unknownEntries).filter(
    (username) => !outdatedUsernames.has(username),
  );
  const outdatedUsers = countUniqueUsers(outdatedEntries);
  const unclassifiedUsers = unclassifiedUsernames.length;

  return {
    scope: 'vscode',
    platform: 'VS Code',
    totalUsers,
    usernames: collectUniqueUsernames(versionAnalysis),
    currentUsers: Math.max(0, totalUsers - outdatedUsers - unclassifiedUsers),
    outdatedUsers,
    unclassifiedUsers,
    unclassifiedUsernames,
    uniqueVersions: versionAnalysis.length,
    metadataState,
    thresholdLabel,
    methodology: `Versions earlier than stable train 0.${effectiveStableMinor}, available at the start of this report window, are classified as outdated. Timestamp builds are treated as pre-release versions.`,
    outdatedVersions: outdatedEntries.map((entry) => ({
      ...entry,
      scope: 'vscode',
      platform: 'VS Code',
      releaseDate: releaseDates.get(entry.version) ?? null,
      reason: `Earlier than stable 0.${effectiveStableMinor}`,
    })),
    referenceReleases: stableReleases.slice(0, 20),
  };
}

export function countUniqueUsersAcrossPlatforms(
  platforms: ClientPlatformHealth[],
  selector: (platform: ClientPlatformHealth) => PluginVersionEntry[],
): number {
  return new Set(
    platforms.flatMap((platform) =>
      selector(platform).flatMap((entry) => entry.usernames),
    ),
  ).size;
}
