import type { CopilotMetrics } from '../../types/metrics';
import { getIDEMetadata } from '../../utils/ideMetadata';

export const CLIENT_TELEMETRY_ANNOUNCEMENT_URL =
  'https://github.blog/changelog/2026-10-06-update-your-ide-to-restore-agent-activity-in-copilot-usage-metrics/';

export interface ClientTelemetryWarning {
  ide: string;
  version: string;
  versionKind: 'ide' | 'plugin';
  userCount: number;
  action: 'upgrade' | 'verify';
  recommendation: string;
}

interface TelemetryPolicy {
  fixedVersion?: readonly [number, number, number];
  recommendation: string;
}

// The announcement gives fixed versions, not the first affected SDK-based releases.
const TELEMETRY_POLICIES: Readonly<Record<string, TelemetryPolicy>> = {
  vscode: {
    fixedVersion: [1, 139, 0],
    recommendation: 'Update VS Code to 1.139.0 or later.',
  },
  visualstudio: {
    fixedVersion: [18, 12, 0],
    recommendation: 'Update Visual Studio to 18.12 or later when available (expected October 2026).',
  },
  jetbrains: {
    recommendation: 'Check for the fixed JetBrains Copilot plugin release (expected late October 2026; version not yet announced).',
  },
  eclipse: {
    recommendation: 'Check for the fixed Eclipse Copilot plugin release (expected by November 2026; version not yet announced).',
  },
  xcode: {
    recommendation: 'Check for the fixed Xcode Copilot plugin release (expected by November 2026; version not yet announced).',
  },
};

const JETBRAINS_IDES = new Set([
  'jetbrains', 'pycharm', 'webstorm', 'rider', 'datagrip', 'android_studio',
  'goland', 'phpstorm', 'rubymine', 'clion', 'rustrover', 'aqua',
]);

type IdeTotal = CopilotMetrics['totals_by_ide'][number];
type WarningObservation = Omit<ClientTelemetryWarning, 'userCount'>;

function detectTelemetryRisk(ideTotal: IdeTotal): WarningObservation | null {
  const ide = getIDEMetadata(ideTotal.ide)?.canonicalKey;
  const policy = ide ? TELEMETRY_POLICIES[JETBRAINS_IDES.has(ide) ? 'jetbrains' : ide] : undefined;
  if (!ide || !policy) return null;

  const ideVersion = ideTotal.last_known_ide_version?.ide_version;
  const pluginVersion = ideTotal.last_known_plugin_version?.plugin_version;
  const versionKind = (policy.fixedVersion ? Boolean(ideVersion) : !pluginVersion)
    ? 'ide'
    : 'plugin';
  const version = versionKind === 'ide' ? ideVersion : pluginVersion;
  if (!version) return null;
  let action: ClientTelemetryWarning['action'] = 'verify';

  const fixedVersion = policy.fixedVersion;
  if (fixedVersion && ideVersion) {
    const match = /^(\d+)\.(\d+)(?:\.(\d+))?$/.exec(ideVersion.trim());
    if (match) {
      const parts = [Number(match[1]), Number(match[2]), Number(match[3] ?? 0)];
      const comparison = parts.findIndex((part, index) => part !== fixedVersion[index]);
      if (comparison === -1 || parts[comparison] > fixedVersion[comparison]) {
        return null;
      }
      action = 'upgrade';
    }
  }

  return { ide, version, versionKind, action, recommendation: policy.recommendation };
}

export type ClientTelemetryAccumulator = Map<
  string,
  { observation: WarningObservation; users: Set<number> }
>;

export function createClientTelemetryAccumulator(): ClientTelemetryAccumulator {
  return new Map();
}

export function accumulateClientTelemetry(
  accumulator: ClientTelemetryAccumulator,
  userId: number,
  ideTotal: IdeTotal,
): void {
  const observation = detectTelemetryRisk(ideTotal);
  if (!observation) return;
  const key = JSON.stringify([observation.ide, observation.versionKind, observation.version]);
  const existing = accumulator.get(key);
  if (existing) {
    existing.users.add(userId);
  } else {
    accumulator.set(key, { observation, users: new Set([userId]) });
  }
}

export function computeClientTelemetryWarnings(
  accumulator: ClientTelemetryAccumulator,
): ClientTelemetryWarning[] {
  return Array.from(accumulator.values())
    .map(({ observation, users }) => ({ ...observation, userCount: users.size }))
    .sort((a, b) => a.ide.localeCompare(b.ide) || a.version.localeCompare(b.version));
}
