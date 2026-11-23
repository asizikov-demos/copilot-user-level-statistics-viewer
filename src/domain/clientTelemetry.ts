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
