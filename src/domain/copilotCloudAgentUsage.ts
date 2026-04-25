import type { CopilotMetrics } from '../types/metrics';

export function resolveCopilotCloudAgentUsage(metric: Pick<CopilotMetrics, 'used_copilot_coding_agent' | 'used_copilot_cloud_agent'>): boolean {
  return metric.used_copilot_cloud_agent ?? metric.used_copilot_coding_agent ?? false;
}
