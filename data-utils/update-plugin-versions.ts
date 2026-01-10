import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const MAX_VERSION_HISTORY = 20;

interface SimpleVersionInfo {
  version: string;
  releaseDate: string;
}

interface JetBrainsUpdate {
  version: string;
  cdate: string; // epoch millis as string
}

interface VsCodeExtensionQueryResult {
  results: Array<{
    extensions: Array<{
      versions: Array<{
        version: string;
        lastUpdated: string;
      }>;
    }>;
  }>;
}

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) {
    throw new Error(`Request failed ${res.status} for ${url}`);
  }
  return (await res.json()) as T;
}

async function fetchJetBrainsVersions(): Promise<SimpleVersionInfo[]> {
  const url = `https://plugins.jetbrains.com/api/plugins/17718/updates?channel=&size=${MAX_VERSION_HISTORY}`;
  const data = await fetchJson<JetBrainsUpdate[]>(url);

  return data
    .map((item) => ({
      version: item.version,
      releaseDate: new Date(Number(item.cdate)).toISOString(),
    }))
    .slice(0, MAX_VERSION_HISTORY);
}

async function fetchVsCodeVersions(): Promise<SimpleVersionInfo[]> {
  const body = {
    filters: [
      {
        criteria: [
          {
            filterType: 7,
            value: 'github.copilot-chat',
          },
        ],
        pageNumber: 1,
        pageSize: MAX_VERSION_HISTORY,
        sortBy: 0,
        sortOrder: 0,
      },
    ],
    flags: 914,
  };

  const res = await fetch(
    'https://marketplace.visualstudio.com/_apis/public/gallery/extensionquery?api-version=7.1-preview.1',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json;api-version=7.1-preview.1;excludeUrls=true',
      },
      body: JSON.stringify(body),
    },
  );

  if (!res.ok) {
    throw new Error(`VS Code marketplace request failed: ${res.status}`);
  }

  const json = (await res.json()) as VsCodeExtensionQueryResult;
  const ext = json.results?.[0]?.extensions?.[0];
  if (!ext) {
    throw new Error('Extension github.copilot-chat not found in VS Code marketplace response');
  }

  const versions = ext.versions ?? [];
  const normalized = versions.slice(0, MAX_VERSION_HISTORY).map((v) => ({
    version: v.version,
    releaseDate: new Date(v.lastUpdated).toISOString(),
  }));

  return normalized;
}

function mergeVsCodeVersions(
  existing: SimpleVersionInfo[],
  latest: SimpleVersionInfo[],
  maxVersions = MAX_VERSION_HISTORY,
): SimpleVersionInfo[] {
  const map = new Map<string, SimpleVersionInfo>();

  for (const v of existing) {
    map.set(v.version, v);
  }

  for (const v of latest) {
    map.set(v.version, v);
  }

  const merged = Array.from(map.values());

  merged.sort((a, b) => {
    const timeA = new Date(a.releaseDate).getTime();
    const timeB = new Date(b.releaseDate).getTime();
    return timeB - timeA;
  });

  return merged.slice(0, maxVersions);
}

async function main(): Promise<void> {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirnameLocal = path.dirname(__filename);
    const [jbVersions, latestVsCodeVersions] = await Promise.all([
      fetchJetBrainsVersions(),
      fetchVsCodeVersions(),
    ]);

    const outputDir = path.join(__dirnameLocal, '..', 'public', 'data');

    const jetbrainsPath = path.join(outputDir, 'jetbrains.json');
    const vscodePath = path.join(outputDir, 'vscode.json');

    let existingVsCodeVersions: SimpleVersionInfo[] = [];
    if (fs.existsSync(vscodePath)) {
      try {
        const raw = fs.readFileSync(vscodePath, 'utf8');
        const parsed = JSON.parse(raw) as { versions?: SimpleVersionInfo[] };
        if (Array.isArray(parsed.versions)) {
          existingVsCodeVersions = parsed.versions;
        }
      } catch {
        existingVsCodeVersions = [];
      }
    }

    const mergedVsCodeVersions = mergeVsCodeVersions(
      existingVsCodeVersions,
      latestVsCodeVersions,
      MAX_VERSION_HISTORY,
    );

    const jetbrainsPayload = { versions: jbVersions };
    const vscodePayload = { versions: mergedVsCodeVersions };

    fs.writeFileSync(jetbrainsPath, JSON.stringify(jetbrainsPayload, null, 2));
    fs.writeFileSync(vscodePath, JSON.stringify(vscodePayload, null, 2));

    console.log(`Updated ${jetbrainsPath} with ${jbVersions.length} versions`);
    console.log(
      `Updated ${vscodePath} with ${mergedVsCodeVersions.length} versions (rolling history)`,
    );
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  }
}

void main();
