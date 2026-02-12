import type { PluginVersionAnalysisData, PluginVersionEntry } from '../../types/metrics';

export interface PluginVersionAccumulator {
  jetbrainsVersions: Map<string, Set<string>>;
  vscodeVersions: Map<string, Set<string>>;
}

export function createPluginVersionAccumulator(): PluginVersionAccumulator {
  return {
    jetbrainsVersions: new Map(),
    vscodeVersions: new Map(),
  };
}

export function accumulatePluginVersion(
  accumulator: PluginVersionAccumulator,
  userLogin: string,
  ideTotal: {
    ide: string;
    last_known_plugin_version?: {
      sampled_at: string;
      plugin: string;
      plugin_version: string;
    };
  }
): void {
  const pluginInfo = ideTotal.last_known_plugin_version;
  if (!pluginInfo?.plugin_version) return;

  const rawVersion = pluginInfo.plugin_version;
  const lower = rawVersion.toLowerCase();

  if (ideTotal.ide === 'intellij') {
    if (lower.endsWith('-nightly')) return;
    if (!accumulator.jetbrainsVersions.has(rawVersion)) {
      accumulator.jetbrainsVersions.set(rawVersion, new Set());
    }
    accumulator.jetbrainsVersions.get(rawVersion)!.add(userLogin);
  }

  if (
    ideTotal.ide === 'vscode' &&
    pluginInfo.plugin === 'copilot-chat'
  ) {
    if (lower.endsWith('-insider') || lower.endsWith('-nightly')) return;
    if (!accumulator.vscodeVersions.has(rawVersion)) {
      accumulator.vscodeVersions.set(rawVersion, new Set());
    }
    accumulator.vscodeVersions.get(rawVersion)!.add(userLogin);
  }
}

function buildVersionEntries(
  versionMap: Map<string, Set<string>>
): { entries: PluginVersionEntry[]; totalUniqueUsers: number } {
  const allUsers = new Set<string>();
  const entries = Array.from(versionMap.entries())
    .map(([version, usernamesSet]) => {
      for (const u of usernamesSet) allUsers.add(u);
      return {
        version,
        userCount: usernamesSet.size,
        usernames: Array.from(usernamesSet).sort(),
      };
    })
    .sort((a, b) => b.userCount - a.userCount);

  return { entries, totalUniqueUsers: allUsers.size };
}

export function computePluginVersionData(
  accumulator: PluginVersionAccumulator
): PluginVersionAnalysisData {
  const jb = buildVersionEntries(accumulator.jetbrainsVersions);
  const vs = buildVersionEntries(accumulator.vscodeVersions);

  return {
    jetbrains: jb.entries,
    vscode: vs.entries,
    totalUniqueIntellijUsers: jb.totalUniqueUsers,
    totalUniqueVsCodeUsers: vs.totalUniqueUsers,
  };
}
