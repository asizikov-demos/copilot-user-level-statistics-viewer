import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export const STABLE_RELEASES_WINDOW = 20;

interface SimpleVersionInfo {
  version: string;
  releaseDate: string;
}

interface JetBrainsUpdate {
  version: string;
  cdate: string; // epoch millis as string
}

export interface StableRelease {
  version: string;
  releaseDate: string;
}

export interface VsCodeData {
  stableMinor: number;
  previewMinor: number;
  updatedAt: string;
  stableReleases: StableRelease[];
}

export interface GitHubRelease {
  tag_name: string;
  prerelease: boolean;
  draft: boolean;
  published_at: string | null;
  created_at: string;
}

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) {
    throw new Error(`Request failed ${res.status} for ${url}`);
  }
  return (await res.json()) as T;
}

/**
 * Parse the minor version number from a GitHub tag like "v0.38.2" or "0.38.0".
 * Returns null if the tag does not match the expected format.
 */
export function parseMinorFromTag(tag: string): number | null {
  const match = tag.match(/^v?(\d+)\.(\d+)/);
  if (!match) return null;
  return parseInt(match[2], 10);
}

/**
 * Find the most-recently published stable (non-prerelease, non-draft) release.
 */
export function findLatestStableRelease(releases: GitHubRelease[]): GitHubRelease | null {
  return releases.find((r) => !r.prerelease && !r.draft) ?? null;
}

/**
 * Collect up to `limit` stable (non-prerelease, non-draft) releases from a
 * GitHub releases list (newest-first order) and map them to StableRelease records.
 */
export function collectStableReleases(releases: GitHubRelease[], limit: number): StableRelease[] {
  return releases
    .filter((r) => !r.prerelease && !r.draft)
    .slice(0, limit)
    .map((r) => ({
      version: r.tag_name.replace(/^v/, ''),
      releaseDate: (r.published_at ?? r.created_at).replace(/\.\d{3}Z$/, 'Z'),
    }));
}

/**
 * Returns true when vscode.json should be updated: the stable minor, preview
 * minor, or the rolling stable release history has changed.
 */
export function hasVsCodeDataChanged(existing: VsCodeData, incoming: VsCodeData): boolean {
  if (existing.stableMinor !== incoming.stableMinor) return true;
  if (existing.previewMinor !== incoming.previewMinor) return true;
  if (existing.stableReleases.length !== incoming.stableReleases.length) return true;
  return incoming.stableReleases.some(
    (r, i) =>
      r.version !== existing.stableReleases[i].version ||
      r.releaseDate !== existing.stableReleases[i].releaseDate,
  );
}

async function fetchJetBrainsVersions(): Promise<SimpleVersionInfo[]> {
  const MAX = 20;
  const url = `https://plugins.jetbrains.com/api/plugins/17718/updates?channel=&size=${MAX}`;
  const data = await fetchJson<JetBrainsUpdate[]>(url);

  return data
    .map((item) => ({
      version: item.version,
      releaseDate: new Date(Number(item.cdate)).toISOString(),
    }))
    .slice(0, MAX);
}

async function fetchVsCodeData(githubToken?: string): Promise<VsCodeData> {
  const url =
    'https://api.github.com/repos/microsoft/vscode-copilot-chat/releases?per_page=100';

  const headers: HeadersInit = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'copilot-user-level-statistics-viewer',
  };
  if (githubToken) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${githubToken}`;
  }

  const releases = await fetchJson<GitHubRelease[]>(url, { headers });

  const stableReleases = collectStableReleases(releases, STABLE_RELEASES_WINDOW);
  if (stableReleases.length === 0) {
    throw new Error('No stable release found in microsoft/vscode-copilot-chat releases');
  }

  const stableMinor = parseMinorFromTag(stableReleases[0].version);
  if (stableMinor === null) {
    throw new Error(`Cannot parse minor version from release: ${stableReleases[0].version}`);
  }

  const updatedAt = stableReleases[0].releaseDate;
  const previewMinor = stableMinor + 1;

  return { stableMinor, previewMinor, updatedAt, stableReleases };
}

async function main(): Promise<void> {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirnameLocal = path.dirname(__filename);
    const outputDir = path.join(__dirnameLocal, '..', 'public', 'data');

    const githubToken = process.env.GITHUB_TOKEN;

    const [jbVersions, incomingVsCode] = await Promise.all([
      fetchJetBrainsVersions(),
      fetchVsCodeData(githubToken),
    ]);

    // JetBrains — always update with latest rolling list
    const jetbrainsPath = path.join(outputDir, 'jetbrains.json');
    fs.writeFileSync(jetbrainsPath, JSON.stringify({ versions: jbVersions }, null, 2));
    console.log(`Updated ${jetbrainsPath} with ${jbVersions.length} versions`);

    // VS Code — only update when stable release history or minors change
    const vscodePath = path.join(outputDir, 'vscode.json');
    let existingVsCode: VsCodeData = {
      stableMinor: 0,
      previewMinor: 1,
      updatedAt: '',
      stableReleases: [],
    };
    if (fs.existsSync(vscodePath)) {
      try {
        const raw = fs.readFileSync(vscodePath, 'utf8');
        const parsed = JSON.parse(raw) as Partial<VsCodeData>;
        if (typeof parsed.stableMinor === 'number') {
          existingVsCode = {
            stableMinor: parsed.stableMinor,
            previewMinor:
              typeof parsed.previewMinor === 'number' ? parsed.previewMinor : parsed.stableMinor + 1,
            updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : '',
            stableReleases: Array.isArray(parsed.stableReleases) ? parsed.stableReleases : [],
          };
        }
      } catch {
        // treat as missing
      }
    }

    if (hasVsCodeDataChanged(existingVsCode, incomingVsCode)) {
      fs.writeFileSync(vscodePath, JSON.stringify(incomingVsCode, null, 2));
      console.log(
        `Updated ${vscodePath}: stable minor ${existingVsCode.stableMinor} → ${incomingVsCode.stableMinor}, ` +
          `${incomingVsCode.stableReleases.length} stable releases (latest: ${incomingVsCode.stableReleases[0]?.version ?? 'none'})`,
      );
    } else {
      console.log(
        `${vscodePath} unchanged (stable minor ${existingVsCode.stableMinor}, ${existingVsCode.stableReleases.length} releases)`,
      );
    }
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  }
}

void main();
