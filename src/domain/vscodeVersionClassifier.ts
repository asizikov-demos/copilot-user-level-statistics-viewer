export type VsCodeVersionClassification =
  | 'stable'
  | 'prerelease'
  | 'latest-preview'
  | 'outdated'
  | 'unknown';

const VERSION_RE = /^(\d+)\.(\d+)(?:\.(.+))?$/;
const TIMESTAMP_PATCH_RE = /^20\d{8}$/;

export interface ParsedVsCodeVersion {
  major: number;
  minor: number;
  patch: string | null;
  isTimestampBuild: boolean;
}

export function parseVsCodeVersion(version: string): ParsedVsCodeVersion | null {
  const match = version.match(VERSION_RE);
  if (!match) return null;

  const major = Number.parseInt(match[1], 10);
  const minor = Number.parseInt(match[2], 10);
  const patch = match[3] ?? null;

  if (Number.isNaN(major) || Number.isNaN(minor)) {
    return null;
  }

  return {
    major,
    minor,
    patch,
    isTimestampBuild: patch !== null && TIMESTAMP_PATCH_RE.test(patch),
  };
}

export function parseVersionMinor(version: string): number | null {
  return parseVsCodeVersion(version)?.minor ?? null;
}

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

export interface VersionLike {
  version: string;
}

/**
 * Derives the current stable minor from a legacy rolling list of versions when
 * the data source does not provide an explicit stableMinor field.
 *
 * Strategy: the minor with the most entries is the established stable train.
 * Preview trains typically have only a handful of entries in the window.
 *
 * Returns null if no valid versions are provided.
 */
export function deriveCurrentStableMinor(versions: VersionLike[]): number | null {
  if (versions.length === 0) return null;

  const minorCounts = new Map<number, number>();
  for (const { version } of versions) {
    const minor = parseVersionMinor(version);
    if (minor !== null) {
      minorCounts.set(minor, (minorCounts.get(minor) ?? 0) + 1);
    }
  }

  if (minorCounts.size === 0) return null;

  const sorted = Array.from(minorCounts.entries()).sort((a, b) => b[1] - a[1]);
  return sorted[0][0];
}
