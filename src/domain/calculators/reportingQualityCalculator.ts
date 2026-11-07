import type { CopilotMetrics } from '../../types/metrics';
import type { ClientTelemetryStatus, ComponentRequirement, ReportingQualityCounts, ReportingQualityMetrics } from '../../types/reportingQuality';
import { generateDateRange } from '../../utils/formatters';

export function getClientTelemetryStatus(value: boolean | null | undefined): ClientTelemetryStatus {
  return value === false ? 'missing' : value === true ? 'received' : 'unreported';
}

function requirementRows(value: CopilotMetrics['usage_metrics_requirements']): ComponentRequirement[] | null {
  if (value == null) return null;
  return (['unmet', 'unknown', 'met'] as const).flatMap(status =>
    Array.from(new Set(value[status])).map(component => ({ component, status }))
  );
}

interface CountsAccumulator {
  recordCount: number;
  telemetryReportedRecords: number;
  requirementsReportedRecords: number;
  missingTelemetryUsers: Set<number>;
  belowMinimumUsers: Set<number>;
}

interface UserAccumulator {
  userId: number;
  userLogin: string;
  missingDays: Set<string>;
  belowMinimumDays: Set<string>;
  components: Set<string>;
  lastIssueDay: string;
}

export interface ReportingQualityAccumulator {
  reportStartDay: string;
  reportEndDay: string;
  summary: CountsAccumulator;
  daily: Map<string, CountsAccumulator>;
  components: Map<string, { unmet: Set<number>; unknown: Set<number> }>;
  users: Map<number, UserAccumulator>;
}

function createCounts(): CountsAccumulator {
  return {
    recordCount: 0,
    telemetryReportedRecords: 0,
    requirementsReportedRecords: 0,
    missingTelemetryUsers: new Set(),
    belowMinimumUsers: new Set(),
  };
}

export function createReportingQualityAccumulator(): ReportingQualityAccumulator {
  return {
    reportStartDay: '',
    reportEndDay: '',
    summary: createCounts(),
    daily: new Map(),
    components: new Map(),
    users: new Map(),
  };
}

export function accumulateReportingQuality(
  accumulator: ReportingQualityAccumulator,
  metric: CopilotMetrics,
): void {
  for (const day of [metric.report_start_day, metric.report_end_day, metric.day]) {
    if (!day) continue;
    if (!accumulator.reportStartDay || day < accumulator.reportStartDay) accumulator.reportStartDay = day;
    if (!accumulator.reportEndDay || day > accumulator.reportEndDay) accumulator.reportEndDay = day;
  }
  let daily = accumulator.daily.get(metric.day);
  if (!daily) {
    daily = createCounts();
    accumulator.daily.set(metric.day, daily);
  }
  const requirements = requirementRows(metric.usage_metrics_requirements);
  const missingTelemetry = getClientTelemetryStatus(metric.client_telemetry_present) === 'missing';
  const belowMinimum = requirements != null && requirements.some(row => row.status === 'unmet');
  for (const counts of [accumulator.summary, daily]) {
    counts.recordCount++;
    if (metric.client_telemetry_present != null) counts.telemetryReportedRecords++;
    if (requirements != null) counts.requirementsReportedRecords++;
    if (missingTelemetry) counts.missingTelemetryUsers.add(metric.user_id);
    if (belowMinimum) counts.belowMinimumUsers.add(metric.user_id);
  }
  if (requirements != null) {
    for (const { component, status } of requirements) {
      let entry = accumulator.components.get(component);
      if (!entry) {
        entry = { unmet: new Set(), unknown: new Set() };
        accumulator.components.set(component, entry);
      }
      if (status !== 'met') entry[status].add(metric.user_id);
    }
  }
  if (!missingTelemetry && !belowMinimum) return;
  let user = accumulator.users.get(metric.user_id);
  if (!user) {
    user = {
      userId: metric.user_id,
      userLogin: metric.user_login,
      missingDays: new Set(),
      belowMinimumDays: new Set(),
      components: new Set(),
      lastIssueDay: metric.day,
    };
    accumulator.users.set(metric.user_id, user);
  }
  if (metric.day >= user.lastIssueDay) {
    user.userLogin = metric.user_login;
    user.lastIssueDay = metric.day;
  }
  if (missingTelemetry) user.missingDays.add(metric.day);
  if (belowMinimum && requirements != null) {
    user.belowMinimumDays.add(metric.day);
    for (const row of requirements) {
      if (row.status === 'unmet') user.components.add(row.component);
    }
  }
}

function finalizeCounts(counts: CountsAccumulator): ReportingQualityCounts {
  return {
    recordCount: counts.recordCount,
    telemetryReportedRecords: counts.telemetryReportedRecords,
    requirementsReportedRecords: counts.requirementsReportedRecords,
    missingTelemetryUsers: counts.telemetryReportedRecords > 0 ? counts.missingTelemetryUsers.size : null,
    belowMinimumUsers: counts.requirementsReportedRecords > 0 ? counts.belowMinimumUsers.size : null,
  };
}

function lastDay(days: Set<string>): string | null {
  return Array.from(days).sort().at(-1) ?? null;
}

export function computeReportingQuality(accumulator: ReportingQualityAccumulator): ReportingQualityMetrics {
  const dates = new Set([
    ...generateDateRange(accumulator.reportStartDay, accumulator.reportEndDay),
    ...accumulator.daily.keys(),
  ]);
  return {
    reportStartDay: accumulator.reportStartDay,
    reportEndDay: accumulator.reportEndDay,
    summary: finalizeCounts(accumulator.summary),
    daily: Array.from(dates).sort().map(day => ({
      day,
      ...finalizeCounts(accumulator.daily.get(day) ?? createCounts()),
    })),
    components: Array.from(accumulator.components, ([component, statuses]) => ({
      component,
      unmetUsers: statuses.unmet.size,
      unknownUsers: statuses.unknown.size,
    })).sort((a, b) => b.unmetUsers - a.unmetUsers || a.component.localeCompare(b.component)),
    affectedUsers: Array.from(accumulator.users.values(), user => ({
      userId: user.userId,
      userLogin: user.userLogin,
      missingTelemetryDays: user.missingDays.size,
      belowMinimumDays: user.belowMinimumDays.size,
      affectedComponents: Array.from(user.components).sort(),
      lastMissingTelemetryDay: lastDay(user.missingDays),
      lastBelowMinimumDay: lastDay(user.belowMinimumDays),
      lastIssueDay: user.lastIssueDay,
    })).sort((a, b) => b.lastIssueDay.localeCompare(a.lastIssueDay) || a.userId - b.userId),
  };
}
