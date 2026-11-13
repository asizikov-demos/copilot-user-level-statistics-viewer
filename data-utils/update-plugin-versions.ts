import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import {
  derivePreviewMinor,
  isStableVsCodeVersion,
  parseTagMinor,
} from '#domain/vscodeVersionRules';

export const STABLE_RELEASES_WINDOW = 20;

interface SimpleVersionInfo {
  version: string;
  releaseDate: string;
}

interface JetBrainsUpdate {
  version: string;
  cdate: string; // epoch millis as string
}

interface VsCodeRelease {
  editorVersion: string;
  version: string;
  releaseDate: string;
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
  vscodeReleases?: VsCodeRelease[];
}

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, options);
    if (res.ok) return (await res.json()) as T;
    if ((res.status !== 429 && res.status < 500) || attempt === 3) {
      throw new Error(`Request failed ${res.status} for ${url}`);
    }
    const retryAfter = Number(res.headers.get('retry-after'));
    const delay = Math.min(30_000, Math.max((Number.isFinite(retryAfter) ? retryAfter : 0) * 1000, 1000 * 2 ** attempt));
    console.warn(`Request failed ${res.status} for ${url}; retrying in ${delay}ms`);
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
}

/**
 * Parse the minor version number from a version like "v0.38.2" or "0.38.0".
 * Returns null if the tag does not match the expected format.
 */
export function parseMinorFromTag(tag: string): number | null {
  return parseTagMinor(tag);
}

/**
 * Returns true when vscode.json should be updated: the stable minor, preview
 * minor, or the rolling stable release history has changed.
 */
export function hasVsCodeDataChanged(existing: VsCodeData, incoming: VsCodeData): boolean {
  if (existing.stableMinor !== incoming.stableMinor) return true;
  if (existing.previewMinor !== incoming.previewMinor) return true;
  if (existing.stableReleases.length !== incoming.stableReleases.length) return true;
  if (incoming.stableReleases.some(
    (r, i) =>
      r.version !== existing.stableReleases[i].version ||
      r.releaseDate !== existing.stableReleases[i].releaseDate,
  )) return true;
  return JSON.stringify(existing.vscodeReleases ?? []) !== JSON.stringify(incoming.vscodeReleases ?? []);
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

export async function fetchVsCodeData(existing: VsCodeData): Promise<VsCodeData> {
  const feed = await fetchJson<unknown>('https://update.code.visualstudio.com/api/releases/stable');
  if (!Array.isArray(feed) || feed.length === 0 ||
      !feed.slice(0, 100).every((version) => typeof version === 'string' && /^\d+\.\d+\.\d+$/.test(version))) {
    throw new Error('Invalid VS Code stable release list');
  }
  const editorVersions: string[] = feed.slice(0, 100);

  const cached = new Map((existing.vscodeReleases ?? []).map((release) => [release.editorVersion, release]));
  const releases: VsCodeRelease[] = [];
  const versions = new Set<string>();

  // Read one extra distinct version so the oldest retained version has its first release date.
  for (let offset = 0; offset < editorVersions.length; offset += 2) {
    const batch = await Promise.all(editorVersions.slice(offset, offset + 2).map(async (editorVersion: string) => {
      const previous = cached.get(editorVersion);
      if (previous && isStableVsCodeVersion(previous.version) && Number.isFinite(Date.parse(previous.releaseDate))) {
        return previous;
      }
      const info = await fetchJson<{ productVersion?: string; version?: string; timestamp?: number }>(
        `https://update.code.visualstudio.com/api/versions/${editorVersion}/linux-x64/stable`,
      );
      if (info.productVersion !== editorVersion || !info.version || !/^[a-f0-9]{40}$/.test(info.version) ||
          typeof info.timestamp !== 'number' || !Number.isFinite(info.timestamp)) {
        throw new Error(`Invalid VS Code release metadata for ${editorVersion}`);
      }
      const manifest = await fetchJson<{ name?: string; publisher?: string; version?: string }>(
        `https://raw.githubusercontent.com/microsoft/vscode/${info.version}/extensions/copilot/package.json`,
      );
      if (manifest.name !== 'copilot-chat' || manifest.publisher !== 'GitHub' ||
          typeof manifest.version !== 'string' || !isStableVsCodeVersion(manifest.version)) {
        throw new Error(`Invalid bundled Copilot Chat version for VS Code ${editorVersion}`);
      }
      return {
        editorVersion,
        version: manifest.version,
        releaseDate: new Date(info.timestamp).toISOString(),
      };
    }));
    releases.push(...batch);
    batch.forEach((release) => versions.add(release.version));
    if (versions.size > STABLE_RELEASES_WINDOW) break;
  }

  if (versions.size <= STABLE_RELEASES_WINDOW) {
    throw new Error('Insufficient VS Code stable releases to build the Copilot Chat release window');
  }
  const byVersion = new Map<string, StableRelease>();
  for (const release of releases) {
    const previous = byVersion.get(release.version);
    if (!previous || release.releaseDate < previous.releaseDate) {
      byVersion.set(release.version, { version: release.version, releaseDate: release.releaseDate });
    }
  }
  const stableReleases = [...byVersion.values()]
    .sort((a, b) => b.releaseDate.localeCompare(a.releaseDate))
    .slice(0, STABLE_RELEASES_WINDOW);
  const stableMinor = parseMinorFromTag(stableReleases[0].version);
  if (stableMinor === null) {
    throw new Error(`Cannot parse minor version from release: ${stableReleases[0].version}`);
  }

  const updatedAt = stableReleases[0].releaseDate;
  const previewMinor = derivePreviewMinor(stableMinor);

  return { stableMinor, previewMinor, updatedAt, stableReleases, vscodeReleases: releases };
}

async function main(): Promise<void> {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirnameLocal = path.dirname(__filename);
    const outputDir = path.join(__dirnameLocal, '..', 'public', 'data');

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
            vscodeReleases: Array.isArray(parsed.vscodeReleases) ? parsed.vscodeReleases : [],
          };
        }
      } catch {
        // treat as missing
      }
    }

    const [jbVersions, incomingVsCode] = await Promise.all([
      fetchJetBrainsVersions(),
      fetchVsCodeData(existingVsCode),
    ]);

    const jetbrainsPath = path.join(outputDir, 'jetbrains.json');
    fs.writeFileSync(jetbrainsPath, JSON.stringify({ versions: jbVersions }, null, 2));
    console.log(`Updated ${jetbrainsPath} with ${jbVersions.length} versions`);

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

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  void main();
}
