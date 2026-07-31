import { CopilotMetrics, type UserDayData } from '../../types/metrics';
import { isCliFeature } from '../featureCategories';
import { compareDatesAsc, compareByDateAsc } from './statsCalculators';
import { type AdoptionTrendEntry, computeAdoptionTrendFromUserSets } from './adoptionTrendHelpers';
import { type AggMetricTotals, accumulateAggMetricTotals } from './aggMetricTotals';

export interface CliFeatureTotals {
  interactions: number;
  generations: number;
  acceptances: number;
  locAdded: number;
  locDeleted: number;
  locSuggestedToAdd: number;
  locSuggestedToDelete: number;
}

export interface CliDayTotals extends CliFeatureTotals {
  promptCount: number;
  interactionCount: number;
}

export interface DailyCliSessionData {
  date: string;
  sessionCount: number;
  requestCount: number;
  promptCount: number;
  uniqueUsers: number;
}

export interface DailyCliTokenData {
  date: string;
  outputTokens: number;
  promptTokens: number;
  requestCount: number;
}

interface CliDailySessionAccumulator {
  sessionCount: number;
  requestCount: number;
  promptCount: number;
  users: Set<number>;
}

export interface CliUsageForDownstreamCalculations {
  readonly dailySessions: ReadonlyMap<
    string,
    {
      readonly sessionCount: number;
      readonly requestCount: number;
      readonly promptCount: number;
      readonly users: ReadonlySet<number>;
    }
  >;
}

export interface CliUsageAccumulator {
  dailySessions: Map<string, CliDailySessionAccumulator>;
  dailyTokens: Map<string, {
    outputTokens: number;
    promptTokens: number;
    requestCount: number;
  }>;
}

export function createCliUsageAccumulator(): CliUsageAccumulator {
  return {
    dailySessions: new Map(),
    dailyTokens: new Map(),
  };
}

export function computeCliFeatureTotals(totalsByFeature: UserDayData['totals_by_feature']): CliFeatureTotals {
  const totals: AggMetricTotals = {
    code_generation_activity_count: 0,
    code_acceptance_activity_count: 0,
    loc_added_sum: 0,
    loc_deleted_sum: 0,
    loc_suggested_to_add_sum: 0,
    loc_suggested_to_delete_sum: 0,
  };
  let interactions = 0;

  for (const feature of totalsByFeature) {
    if (!isCliFeature(feature.feature)) continue;
    interactions += feature.user_initiated_interaction_count;
    accumulateAggMetricTotals(totals, feature);
  }

  return {
    interactions,
    generations: totals.code_generation_activity_count,
    acceptances: totals.code_acceptance_activity_count,
    locAdded: totals.loc_added_sum,
    locDeleted: totals.loc_deleted_sum,
    locSuggestedToAdd: totals.loc_suggested_to_add_sum,
    locSuggestedToDelete: totals.loc_suggested_to_delete_sum,
  };
}

export function computeCliDayTotals(
  day?: Pick<UserDayData, 'totals_by_feature' | 'totals_by_cli'>
): CliDayTotals {
  const featureTotals = computeCliFeatureTotals(day?.totals_by_feature ?? []);
  const promptCount = day?.totals_by_cli?.prompt_count ?? 0;
  const interactionCount = featureTotals.interactions > 0 ? featureTotals.interactions : promptCount;

  return {
    ...featureTotals,
    promptCount,
    interactionCount,
  };
}

export function ensureCliDates(accumulator: CliUsageAccumulator, date: string): void {
  if (!accumulator.dailySessions.has(date)) {
    accumulator.dailySessions.set(date, {
      sessionCount: 0,
      requestCount: 0,
      promptCount: 0,
      users: new Set(),
    });
  }
  if (!accumulator.dailyTokens.has(date)) {
    accumulator.dailyTokens.set(date, { outputTokens: 0, promptTokens: 0, requestCount: 0 });
  }
}

export function accumulateCliUsage(
  accumulator: CliUsageAccumulator,
  date: string,
  userId: number,
  metric: CopilotMetrics
): void {
  const cli = metric.totals_by_cli;
  if (!cli) return;

  ensureCliDates(accumulator, date);

  const ds = accumulator.dailySessions.get(date)!;
  ds.sessionCount += cli.session_count;
  ds.requestCount += cli.request_count;
  ds.promptCount += cli.prompt_count;
  ds.users.add(userId);

  const dt = accumulator.dailyTokens.get(date)!;
  dt.outputTokens += cli.token_usage.output_tokens_sum;
  dt.promptTokens += cli.token_usage.prompt_tokens_sum;
  dt.requestCount += cli.request_count;
}

export function computeDailyCliSessionData(
  accumulator: CliUsageAccumulator
): DailyCliSessionData[] {
  return Array.from(accumulator.dailySessions.entries())
    .map(([date, data]) => ({
      date,
      sessionCount: data.sessionCount,
      requestCount: data.requestCount,
      promptCount: data.promptCount,
      uniqueUsers: data.users.size,
    }))
    .sort(compareByDateAsc);
}

export function computeDailyCliTokenData(
  accumulator: CliUsageAccumulator
): DailyCliTokenData[] {
  return Array.from(accumulator.dailyTokens.entries())
    .map(([date, data]) => ({
      date,
      outputTokens: data.outputTokens,
      promptTokens: data.promptTokens,
      requestCount: data.requestCount,
    }))
    .sort(compareByDateAsc);
}

export type DailyCliAdoptionTrend = AdoptionTrendEntry;

export function computeCliAdoptionTrend(
  accumulator: CliUsageAccumulator
): DailyCliAdoptionTrend[] {
  const sortedDateUserSets = Array.from(accumulator.dailySessions.entries())
    .sort(([a], [b]) => compareDatesAsc(a, b))
    .map(([date, data]) => ({ date, users: data.users }));

  return computeAdoptionTrendFromUserSets(sortedDateUserSets);
}
