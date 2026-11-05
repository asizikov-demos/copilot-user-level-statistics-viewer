import type { CopilotMetrics, LocalByokUsageData } from '../../types/metrics';
import { compareDatesAsc } from './statsCalculators';

export interface LocalByokAccumulator {
  sessionsByDate: Map<string, Map<string, number>>;
  sessionsBySurface: Map<string, number>;
  userIds: Set<number>;
  totalSessions: number;
  totalRequests: number;
}

export function createLocalByokAccumulator(): LocalByokAccumulator {
  return {
    sessionsByDate: new Map(),
    sessionsBySurface: new Map(),
    userIds: new Set(),
    totalSessions: 0,
    totalRequests: 0,
  };
}

export function accumulateLocalByok(
  accumulator: LocalByokAccumulator,
  metric: Pick<CopilotMetrics, 'day' | 'user_id' | 'totals_by_local_byok'>
): void {
  const entries = metric.totals_by_local_byok;
  if (!Array.isArray(entries) || entries.length === 0) return;

  let hasActivity = false;
  for (const entry of entries) {
    const sessions = entry.session_count || 0;
    const requests = entry.request_count || 0;
    if (sessions === 0 && requests === 0) continue;
    hasActivity = true;

    const surface = entry.surface || 'unknown';
    let daySurfaces = accumulator.sessionsByDate.get(metric.day);
    if (!daySurfaces) {
      daySurfaces = new Map();
      accumulator.sessionsByDate.set(metric.day, daySurfaces);
    }
    daySurfaces.set(surface, (daySurfaces.get(surface) || 0) + sessions);
    accumulator.sessionsBySurface.set(
      surface,
      (accumulator.sessionsBySurface.get(surface) || 0) + sessions
    );
    accumulator.totalSessions += sessions;
    accumulator.totalRequests += requests;
  }

  if (hasActivity) {
    accumulator.userIds.add(metric.user_id);
  }
}

export function computeLocalByokUsageData(accumulator: LocalByokAccumulator): LocalByokUsageData {
  const surfaces = Array.from(accumulator.sessionsBySurface.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([surface]) => surface);

  const daily = Array.from(accumulator.sessionsByDate.entries())
    .sort(([a], [b]) => compareDatesAsc(a, b))
    .map(([date, bySurface]) => ({
      date,
      sessionsBySurface: Object.fromEntries(bySurface),
    }));

  return {
    surfaces,
    daily,
    totalSessions: accumulator.totalSessions,
    totalRequests: accumulator.totalRequests,
    totalUsers: accumulator.userIds.size,
  };
}
