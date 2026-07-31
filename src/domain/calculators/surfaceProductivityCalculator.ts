import type { CopilotMetrics } from '../../types/metrics';
import type {
  CopilotSurface,
  DailySurfaceProductivity,
  SurfaceCohort,
  SurfaceCohortSummary,
  SurfaceProductivityMetrics,
  SurfaceProductivitySummary,
} from '../../types/surfaceProductivity';
import { isCliFeature, isCopilotAppFeature } from '../featureCategories';
import { compareByDateAsc } from './statsCalculators';

interface SurfaceAccumulator {
  userIds: Set<number>;
  activeUserDays: Set<string>;
  locAdded: number;
  locDeleted: number;
}

interface DailySurfaceAccumulator {
  userIds: Set<number>;
  locAdded: number;
  locDeleted: number;
}

interface UserCohortAccumulator {
  activeDays: Set<string>;
  surfaces: Set<CopilotSurface>;
  locAdded: number;
  locDeleted: number;
}

export interface SurfaceProductivityAccumulator {
  allUserIds: Set<number>;
  surfaces: Record<CopilotSurface, SurfaceAccumulator>;
  daily: Map<string, Record<CopilotSurface, DailySurfaceAccumulator>>;
  users: Map<number, UserCohortAccumulator>;
}

const SURFACES: readonly CopilotSurface[] = ['ide', 'cli', 'copilotApp'];

function createSurfaceAccumulator(): SurfaceAccumulator {
  return {
    userIds: new Set(),
    activeUserDays: new Set(),
    locAdded: 0,
    locDeleted: 0,
  };
}

function createDailySurfaceAccumulator(): DailySurfaceAccumulator {
  return {
    userIds: new Set(),
    locAdded: 0,
    locDeleted: 0,
  };
}

function createDailyAccumulator(): Record<CopilotSurface, DailySurfaceAccumulator> {
  return {
    ide: createDailySurfaceAccumulator(),
    cli: createDailySurfaceAccumulator(),
    copilotApp: createDailySurfaceAccumulator(),
  };
}

export function createSurfaceProductivityAccumulator(): SurfaceProductivityAccumulator {
  return {
    allUserIds: new Set(),
    surfaces: {
      ide: createSurfaceAccumulator(),
      cli: createSurfaceAccumulator(),
      copilotApp: createSurfaceAccumulator(),
    },
    daily: new Map(),
    users: new Map(),
  };
}

function hasNonZeroValue(values: number[]): boolean {
  return values.some(value => value !== 0);
}

function hasIdeActivity(metric: CopilotMetrics): boolean {
  return metric.totals_by_ide.some(total => hasNonZeroValue([
    total.user_initiated_interaction_count,
    total.code_generation_activity_count,
    total.code_acceptance_activity_count,
    total.loc_added_sum,
    total.loc_deleted_sum,
    total.loc_suggested_to_add_sum,
    total.loc_suggested_to_delete_sum,
  ]));
}

function hasClientTotalsActivity(
  totals: CopilotMetrics['totals_by_cli'] | CopilotMetrics['totals_by_copilot_app']
): boolean {
  if (!totals) return false;
  return hasNonZeroValue([
    totals.session_count,
    totals.request_count,
    totals.prompt_count,
    totals.token_usage.output_tokens_sum,
    totals.token_usage.prompt_tokens_sum,
  ]);
}

function hasFeatureActivity(
  metric: CopilotMetrics,
  matchesFeature: (feature: string) => boolean
): boolean {
  return metric.totals_by_feature.some(total =>
    matchesFeature(total.feature)
    && hasNonZeroValue([
      total.user_initiated_interaction_count,
      total.code_generation_activity_count,
      total.code_acceptance_activity_count,
      total.loc_added_sum,
      total.loc_deleted_sum,
      total.loc_suggested_to_add_sum,
      total.loc_suggested_to_delete_sum,
    ])
  );
}

function getSurfaceActivity(metric: CopilotMetrics): Record<CopilotSurface, boolean> {
  return {
    ide: hasIdeActivity(metric),
    cli:
      metric.used_cli
      || hasClientTotalsActivity(metric.totals_by_cli)
      || hasFeatureActivity(metric, isCliFeature),
    copilotApp:
      (metric.used_copilot_app ?? false)
      || hasClientTotalsActivity(metric.totals_by_copilot_app)
      || hasFeatureActivity(metric, isCopilotAppFeature),
  };
}

function getSurfaceLoc(
  metric: CopilotMetrics
): Record<CopilotSurface, { locAdded: number; locDeleted: number }> {
  const ide = metric.totals_by_ide.reduce(
    (total, entry) => ({
      locAdded: total.locAdded + entry.loc_added_sum,
      locDeleted: total.locDeleted + entry.loc_deleted_sum,
    }),
    { locAdded: 0, locDeleted: 0 }
  );
  const cli = { locAdded: 0, locDeleted: 0 };
  const copilotApp = { locAdded: 0, locDeleted: 0 };

  for (const feature of metric.totals_by_feature) {
    if (isCliFeature(feature.feature)) {
      cli.locAdded += feature.loc_added_sum;
      cli.locDeleted += feature.loc_deleted_sum;
    }
    if (isCopilotAppFeature(feature.feature)) {
      copilotApp.locAdded += feature.loc_added_sum;
      copilotApp.locDeleted += feature.loc_deleted_sum;
    }
  }

  return { ide, cli, copilotApp };
}

export function accumulateSurfaceProductivity(
  accumulator: SurfaceProductivityAccumulator,
  metric: CopilotMetrics
): void {
  const userDayKey = `${metric.day}:${metric.user_id}`;
  const activity = getSurfaceActivity(metric);
  if (!SURFACES.some(surface => activity[surface])) return;

  const loc = getSurfaceLoc(metric);
  const daily = accumulator.daily.get(metric.day) ?? createDailyAccumulator();
  const user = accumulator.users.get(metric.user_id) ?? {
    activeDays: new Set<string>(),
    surfaces: new Set<CopilotSurface>(),
    locAdded: 0,
    locDeleted: 0,
  };

  accumulator.allUserIds.add(metric.user_id);
  user.activeDays.add(metric.day);
  user.locAdded += metric.loc_added_sum;
  user.locDeleted += metric.loc_deleted_sum;

  for (const surface of SURFACES) {
    if (!activity[surface]) continue;

    const surfaceAccumulator = accumulator.surfaces[surface];
    surfaceAccumulator.userIds.add(metric.user_id);
    surfaceAccumulator.activeUserDays.add(userDayKey);
    surfaceAccumulator.locAdded += loc[surface].locAdded;
    surfaceAccumulator.locDeleted += loc[surface].locDeleted;

    daily[surface].userIds.add(metric.user_id);
    daily[surface].locAdded += loc[surface].locAdded;
    daily[surface].locDeleted += loc[surface].locDeleted;
    user.surfaces.add(surface);
  }

  accumulator.daily.set(metric.day, daily);
  accumulator.users.set(metric.user_id, user);
}

function round(value: number, precision = 1): number {
  const multiplier = 10 ** precision;
  return Math.round(value * multiplier) / multiplier;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const midpoint = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[midpoint];
  return round((sorted[midpoint - 1] + sorted[midpoint]) / 2);
}

function getCohort(surfaces: Set<CopilotSurface>): SurfaceCohort | null {
  if (surfaces.size > 1) return 'multiSurface';
  if (surfaces.has('ide')) return 'ideOnly';
  if (surfaces.has('cli')) return 'cliOnly';
  if (surfaces.has('copilotApp')) return 'copilotAppOnly';
  return null;
}

function finalizeSurfaceSummaries(
  accumulator: SurfaceProductivityAccumulator
): SurfaceProductivitySummary[] {
  const totalActiveUsers = accumulator.allUserIds.size;

  return SURFACES.map(surface => {
    const data = accumulator.surfaces[surface];
    const uniqueUsers = data.userIds.size;
    const activeUserDays = data.activeUserDays.size;
    const netLocImpact = data.locAdded - data.locDeleted;

    return {
      surface,
      uniqueUsers,
      reachPercentage:
        totalActiveUsers > 0 ? round((uniqueUsers / totalActiveUsers) * 100) : 0,
      activeUserDays,
      activeDaysPerUser:
        uniqueUsers > 0 ? round(activeUserDays / uniqueUsers) : 0,
      locAdded: data.locAdded,
      locDeleted: data.locDeleted,
      netLocImpact,
      netLocPerActiveDay:
        activeUserDays > 0 ? round(netLocImpact / activeUserDays) : 0,
    };
  });
}

function finalizeDailyProductivity(
  accumulator: SurfaceProductivityAccumulator
): DailySurfaceProductivity[] {
  return Array.from(accumulator.daily.entries())
    .map(([date, surfaces]) => ({
      date,
      surfaces: {
        ide: {
          activeUsers: surfaces.ide.userIds.size,
          locAdded: surfaces.ide.locAdded,
          locDeleted: surfaces.ide.locDeleted,
          netLocImpact: surfaces.ide.locAdded - surfaces.ide.locDeleted,
        },
        cli: {
          activeUsers: surfaces.cli.userIds.size,
          locAdded: surfaces.cli.locAdded,
          locDeleted: surfaces.cli.locDeleted,
          netLocImpact: surfaces.cli.locAdded - surfaces.cli.locDeleted,
        },
        copilotApp: {
          activeUsers: surfaces.copilotApp.userIds.size,
          locAdded: surfaces.copilotApp.locAdded,
          locDeleted: surfaces.copilotApp.locDeleted,
          netLocImpact:
            surfaces.copilotApp.locAdded - surfaces.copilotApp.locDeleted,
        },
      },
    }))
    .sort(compareByDateAsc);
}

function finalizeCohortSummaries(
  accumulator: SurfaceProductivityAccumulator
): SurfaceCohortSummary[] {
  const cohortUsers = new Map<SurfaceCohort, UserCohortAccumulator[]>([
    ['ideOnly', []],
    ['cliOnly', []],
    ['copilotAppOnly', []],
    ['multiSurface', []],
  ]);

  for (const user of accumulator.users.values()) {
    const cohort = getCohort(user.surfaces);
    if (cohort) cohortUsers.get(cohort)!.push(user);
  }

  return Array.from(cohortUsers.entries()).map(([cohort, users]) => ({
    cohort,
    users: users.length,
    medianActiveDays: median(users.map(user => user.activeDays.size)),
    medianNetLocImpact: median(
      users.map(user => user.locAdded - user.locDeleted)
    ),
  }));
}

export function finalizeSurfaceProductivity(
  accumulator: SurfaceProductivityAccumulator
): SurfaceProductivityMetrics {
  return {
    totalActiveUsers: accumulator.allUserIds.size,
    surfaceSummaries: finalizeSurfaceSummaries(accumulator),
    dailyProductivity: finalizeDailyProductivity(accumulator),
    cohortSummaries: finalizeCohortSummaries(accumulator),
  };
}
