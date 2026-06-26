import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  derivePreviewMinor,
  isStableVsCodeVersion,
  parseTagMinor,
} from '../src/domain/vscodeVersionRules';

export const STABLE_RELEASES_WINDOW = 20;

interface SimpleVersionInfo {
  version: string;
  releaseDate: string;
}

interface JetBrainsUpdate {
  version: string;
  cdate: string; // epoch millis as string
}

interface MarketplaceVersion {
  version: string;
  lastUpdated: string;
}

interface MarketplaceExtension {
  versions?: MarketplaceVersion[];
}

interface MarketplaceResult {
  extensions?: MarketplaceExtension[];
}

interface MarketplaceResponse {
  results?: MarketplaceResult[];
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

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) {
    throw new Error(`Request failed ${res.status} for ${url}`);
  }
  return (await res.json()) as T;
}

/**
 * Parse the minor version number from a version like "v0.38.2" or "0.38.0".
 * Returns null if the tag does not match the expected format.
 */
export function parseMinorFromTag(tag: string): number | null {
  return parseTagMinor(tag);
}

function normalizeIsoTimestamp(timestamp: string): string {
  return timestamp.replace(/\.\d{1,7}Z$/, 'Z');
}

export function collectStableReleases(
  versions: MarketplaceVersion[],
  limit: number,
): StableRelease[] {
  return versions
    .filter((item) => isStableVsCodeVersion(item.version))
    .slice(0, limit)
    .map((item) => ({
      version: item.version,
      releaseDate: normalizeIsoTimestamp(item.lastUpdated),
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

async function fetchVsCodeData(): Promise<VsCodeData> {
  const marketplaceUrl =
    'https://marketplace.visualstudio.com/_apis/public/gallery/extensionquery?api-version=7.2-preview.1';
  const includeVersionsFlag = 1;

  const data = await fetchJson<MarketplaceResponse>(marketplaceUrl, {
    method: 'POST',
    headers: {
      Accept: 'application/json;api-version=7.2-preview.1;excludeUrls=true',
      'Content-Type': 'application/json',
      'User-Agent': 'copilot-user-level-statistics-viewer',
    },
    body: JSON.stringify({
      filters: [
        {
          criteria: [
            {
              filterType: 7,
              value: 'GitHub.copilot-chat',
            },
          ],
        },
      ],
      flags: includeVersionsFlag,
    }),
  });

  const versions = data.results?.[0]?.extensions?.[0]?.versions ?? [];
  const stableReleases = collectStableReleases(versions, STABLE_RELEASES_WINDOW);
  if (stableReleases.length === 0) {
    throw new Error('No stable release found in VS Code Marketplace for GitHub.copilot-chat');
  }

  const stableMinor = parseMinorFromTag(stableReleases[0].version);
  if (stableMinor === null) {
    throw new Error(`Cannot parse minor version from release: ${stableReleases[0].version}`);
  }

  const updatedAt = stableReleases[0].releaseDate;
  const previewMinor = derivePreviewMinor(stableMinor);

  return { stableMinor, previewMinor, updatedAt, stableReleases };
}

async function main(): Promise<void> {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirnameLocal = path.dirname(__filename);
    const outputDir = path.join(__dirnameLocal, '..', 'public', 'data');

    const [jbVersions, incomingVsCode] = await Promise.all([
      fetchJetBrainsVersions(),
      fetchVsCodeData(),
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
