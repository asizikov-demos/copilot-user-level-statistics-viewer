import type { CopilotMetrics } from '../../types/metrics';
import type { VSCodeAgentUsage, VSCodeAgentUsageSummary } from '../../types/vscodeAgent';

interface UsageAccumulator {
  activeUsers: Set<number>;
  summary: VSCodeAgentUsageSummary;
}

export interface VSCodeAgentUsageAccumulator {
  total: UsageAccumulator;
  daily: Map<string, UsageAccumulator>;
}

function createUsageAccumulator(): UsageAccumulator {
  return {
    activeUsers: new Set(),
    summary: {
      activeUsers: null,
      sessionCount: null,
      userMessages: null,
      recordCount: 0,
      usageReportedRecords: 0,
      sessionsReportedRecords: 0,
      messagesReportedRecords: 0,
    },
  };
}

export function createVSCodeAgentUsageAccumulator(): VSCodeAgentUsageAccumulator {
  return { total: createUsageAccumulator(), daily: new Map() };
}

type UsageRecord = Pick<CopilotMetrics,
  'day' | 'user_id' | 'used_vscode_agent' | 'totals_by_vscode_agent'>;

function accumulateUsage(accumulator: UsageAccumulator, metric: UsageRecord): void {
  const { summary, activeUsers } = accumulator;
  summary.recordCount++;
  if (metric.used_vscode_agent != null) {
    summary.usageReportedRecords++;
    if (metric.used_vscode_agent) activeUsers.add(metric.user_id);
    summary.activeUsers = activeUsers.size;
  }
  const totals = metric.totals_by_vscode_agent;
  if (totals?.session_count != null) {
    summary.sessionsReportedRecords++;
    summary.sessionCount = (summary.sessionCount ?? 0) + totals.session_count;
  }
  if (totals?.total_user_messages != null) {
    summary.messagesReportedRecords++;
    summary.userMessages = (summary.userMessages ?? 0) + totals.total_user_messages;
  }
}

export function accumulateVSCodeAgentUsage(
  accumulator: VSCodeAgentUsageAccumulator,
  metric: UsageRecord,
): void {
  let daily = accumulator.daily.get(metric.day);
  if (!daily) {
    daily = createUsageAccumulator();
    accumulator.daily.set(metric.day, daily);
  }
  accumulateUsage(accumulator.total, metric);
  accumulateUsage(daily, metric);
}

export function computeVSCodeAgentUsage(
  accumulator: VSCodeAgentUsageAccumulator,
): VSCodeAgentUsage {
  return {
    summary: { ...accumulator.total.summary },
    daily: Array.from(accumulator.daily, ([date, entry]) => ({
      date,
      ...entry.summary,
    })).sort((a, b) => a.date.localeCompare(b.date)),
  };
}
