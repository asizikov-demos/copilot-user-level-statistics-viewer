const VERSION_RE = /^v?(\d+)\.(\d+)(?:\.(.+))?$/;
const TIMESTAMP_PATCH_RE = /^20\d{8}$/;
const NUMERIC_PATCH_RE = /^\d+$/;

export interface ParsedVsCodeVersion {
  major: number;
  minor: number;
  patch: string | null;
  isTimestampBuild: boolean;
}

export interface VersionLike {
  version: string;
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

export function isStableVsCodeVersion(version: string): boolean {
  const parsed = parseVsCodeVersion(version);
  if (parsed === null || parsed.patch === null) return false;
  return NUMERIC_PATCH_RE.test(parsed.patch) && !parsed.isTimestampBuild;
}

export function derivePreviewMinor(stableMinor: number): number {
  return stableMinor + 1;
}

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
