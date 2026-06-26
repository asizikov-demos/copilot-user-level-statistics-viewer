export type VsCodeVersionClassification =
  | 'stable'
  | 'prerelease'
  | 'latest-preview'
  | 'outdated'
  | 'unknown';

import {
  deriveCurrentStableMinor,
  parseVersionMinor,
  parseVsCodeVersion,
  type ParsedVsCodeVersion,
  type VersionLike,
} from './vscodeVersionRules';

export { parseVsCodeVersion, parseVersionMinor, deriveCurrentStableMinor, type ParsedVsCodeVersion, type VersionLike };

export function classifyVsCodeVersion(
  version: string,
  currentStableMinor: number,
  currentPreviewMinor = currentStableMinor + 1,
): VsCodeVersionClassification {
  const parsed = parseVsCodeVersion(version);
  if (!parsed) return 'unknown';

  if (parsed.minor < currentStableMinor) return 'outdated';
  if (parsed.minor === currentPreviewMinor) return 'latest-preview';
  if (parsed.minor !== currentStableMinor) return 'unknown';

  if (parsed.patch === null) return 'stable';
  if (parsed.isTimestampBuild) return 'prerelease';

  return 'stable';
}

export interface DatedVersionLike extends VersionLike {
  releaseDate: string;
}

export function parseReportDayInclusiveEnd(reportDay: string): Date | null {
  const dayMatch = reportDay.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!dayMatch) return null;

  const [, year, month, day] = dayMatch;
  const yearNumber = Number(year);
  const monthNumber = Number(month);
  const dayNumber = Number(day);
  const parsed = new Date(Date.UTC(yearNumber, monthNumber - 1, dayNumber, 23, 59, 59, 999));

  if (
    parsed.getUTCFullYear() !== yearNumber
    || parsed.getUTCMonth() !== monthNumber - 1
    || parsed.getUTCDate() !== dayNumber
  ) {
    return null;
  }

  return parsed;
}

export function resolveCurrentStableMinorAtDate(
  stableReleases: DatedVersionLike[],
  reportDay: string,
): number | null {
  const cutoff = parseReportDayInclusiveEnd(reportDay);
  if (cutoff === null) return null;

  let effectiveStableMinor: number | null = null;

  for (const release of stableReleases) {
    const parsedVersion = parseVsCodeVersion(release.version);
    if (parsedVersion === null || parsedVersion.isTimestampBuild) continue;

    const releaseDate = new Date(release.releaseDate);
    const releaseTime = releaseDate.getTime();
    if (Number.isNaN(releaseTime) || releaseTime > cutoff.getTime()) continue;

    if (effectiveStableMinor === null || parsedVersion.minor > effectiveStableMinor) {
      effectiveStableMinor = parsedVersion.minor;
    }
  }

  return effectiveStableMinor;
}
