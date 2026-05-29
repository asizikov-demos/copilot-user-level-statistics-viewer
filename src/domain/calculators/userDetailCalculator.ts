import type { CopilotMetrics, UserDayData } from '../../types/metrics';
import type { UserDetailedMetrics } from '../../types/aggregatedMetrics';
import {
  calculateJoinedImpactData,
  calculateDailyModelUsage,
  calculateAgentImpactData,
  calculateAskModeImpactData,
  calculateCodeCompletionImpactData,
  calculateCliImpactData,
} from './metricCalculators';
import { getModelMultiplier } from '../modelConfig';

interface FeatureAgg {
  feature: string;
  user_initiated_interaction_count: number;
  code_generation_activity_count: number;
  code_acceptance_activity_count: number;
  loc_added_sum: number;
  loc_deleted_sum: number;
  loc_suggested_to_add_sum: number;
  loc_suggested_to_delete_sum: number;
}

interface IDEAgg {
  ide: string;
  user_initiated_interaction_count: number;
  code_generation_activity_count: number;
  code_acceptance_activity_count: number;
  loc_added_sum: number;
  loc_deleted_sum: number;
  loc_suggested_to_add_sum: number;
  loc_suggested_to_delete_sum: number;
}

interface LangFeatureAgg {
  language: string;
  feature: string;
  code_generation_activity_count: number;
  code_acceptance_activity_count: number;
  loc_added_sum: number;
  loc_deleted_sum: number;
  loc_suggested_to_add_sum: number;
  loc_suggested_to_delete_sum: number;
}

interface ModelFeatureAgg {
  model: string;
  feature: string;
  user_initiated_interaction_count: number;
  code_generation_activity_count: number;
  code_acceptance_activity_count: number;
  loc_added_sum: number;
  loc_deleted_sum: number;
  loc_suggested_to_add_sum: number;
  loc_suggested_to_delete_sum: number;
}

interface PluginVersionEntry {
  plugin: string;
  plugin_version: string;
  sampled_at: string;
}

interface CliVersionEntry {
  cli_version: string;
  sampled_at: string;
}

interface UserAccState {
  totalStandardModelRequests: number;
  totalPremiumModelRequests: number;
  featureMap: Map<string, FeatureAgg>;
  ideMap: Map<string, IDEAgg>;
  langFeatureMap: Map<string, LangFeatureAgg>;
  modelFeatureMap: Map<string, ModelFeatureAgg>;
  pluginVersionMap: Map<string, PluginVersionEntry>;
  cliVersionMap: Map<string, CliVersionEntry>;
  days: UserDayData[];
}

export interface UserDetailAccumulator {
  users: Map<number, UserAccState>;
  reportStartDay: string;
  reportEndDay: string;
}

export function createUserDetailAccumulator(): UserDetailAccumulator {
  return {
    users: new Map(),
    reportStartDay: '',
    reportEndDay: '',
  };
}

function getOrCreateUserState(accumulator: UserDetailAccumulator, userId: number): UserAccState {
  let state = accumulator.users.get(userId);
  if (!state) {
    state = {
      totalStandardModelRequests: 0,
      totalPremiumModelRequests: 0,
      featureMap: new Map(),
      ideMap: new Map(),
      langFeatureMap: new Map(),
      modelFeatureMap: new Map(),
      pluginVersionMap: new Map(),
      cliVersionMap: new Map(),
      days: [],
    };
    accumulator.users.set(userId, state);
  }
  return state;
}

// Shared metric accumulation helpers

/** Fields shared by all four aggregate types: code-generation, acceptance, and LOC. */
interface AggMetricTotals {
  code_generation_activity_count: number;
  code_acceptance_activity_count: number;
  loc_added_sum: number;
  loc_deleted_sum: number;
  loc_suggested_to_add_sum: number;
  loc_suggested_to_delete_sum: number;
}

/** Extends AggMetricTotals with user-initiated interaction count (used by Feature, IDE, ModelFeature). */
interface InteractionAggMetricTotals extends AggMetricTotals {
  user_initiated_interaction_count: number;
}

/** Accumulates the 6 shared code-gen/acceptance/LOC fields in-place on `existing`. */
function accumulateAggMetricTotals(existing: AggMetricTotals, incoming: AggMetricTotals): void {
  existing.code_generation_activity_count += incoming.code_generation_activity_count;
  existing.code_acceptance_activity_count += incoming.code_acceptance_activity_count;
  existing.loc_added_sum += incoming.loc_added_sum;
  existing.loc_deleted_sum += incoming.loc_deleted_sum;
  existing.loc_suggested_to_add_sum += incoming.loc_suggested_to_add_sum;
  existing.loc_suggested_to_delete_sum += incoming.loc_suggested_to_delete_sum;
}

/** Accumulates user-interaction count plus the 6 shared code-gen/acceptance/LOC fields in-place on `existing`. */
function accumulateInteractionAggMetricTotals(
  existing: InteractionAggMetricTotals,
  incoming: InteractionAggMetricTotals
): void {
  existing.user_initiated_interaction_count += incoming.user_initiated_interaction_count;
  accumulateAggMetricTotals(existing, incoming);
}

/**
 * Upserts an aggregate entry into a keyed map.
 * If the key exists, calls `accumulate` to merge `entry` into the existing record.
 * If not, inserts a shallow copy of `entry` as a new record.
 */
function upsertAggMapEntry<T extends object>(
  map: Map<string, T>,
  key: string,
  entry: T,
  accumulate: (existing: T, incoming: T) => void
): void {
  const existing = map.get(key);
  if (existing) {
    accumulate(existing, entry);
  } else {
    map.set(key, { ...entry } as T);
  }
}

export function accumulateUserDetail(
  accumulator: UserDetailAccumulator,
  metric: CopilotMetrics
): void {
  const userId = metric.user_id;
  const state = getOrCreateUserState(accumulator, userId);

  for (const mf of metric.totals_by_model_feature) {
    const model = mf.model.toLowerCase();
    const multiplier = getModelMultiplier(model);
    if (multiplier === 0) {
      state.totalStandardModelRequests += mf.user_initiated_interaction_count;
    } else {
      state.totalPremiumModelRequests += mf.user_initiated_interaction_count;
    }
  }

  for (const f of metric.totals_by_feature) {
    upsertAggMapEntry(state.featureMap, f.feature, f, accumulateInteractionAggMetricTotals);
  }

  for (const ide of metric.totals_by_ide) {
    const ideEntry: IDEAgg = {
      ide: ide.ide,
      user_initiated_interaction_count: ide.user_initiated_interaction_count,
      code_generation_activity_count: ide.code_generation_activity_count,
      code_acceptance_activity_count: ide.code_acceptance_activity_count,
      loc_added_sum: ide.loc_added_sum,
      loc_deleted_sum: ide.loc_deleted_sum,
      loc_suggested_to_add_sum: ide.loc_suggested_to_add_sum,
      loc_suggested_to_delete_sum: ide.loc_suggested_to_delete_sum,
    };
    upsertAggMapEntry(state.ideMap, ide.ide, ideEntry, accumulateInteractionAggMetricTotals);

    if (ide.last_known_plugin_version) {
      const pv = ide.last_known_plugin_version;
      const key = `${pv.plugin}-${pv.plugin_version}`;
      const existing = state.pluginVersionMap.get(key);
      if (!existing || new Date(pv.sampled_at).getTime() > new Date(existing.sampled_at).getTime()) {
        state.pluginVersionMap.set(key, { ...pv });
      }
    }
  }

  if (metric.totals_by_cli?.last_known_cli_version) {
    const cv = metric.totals_by_cli.last_known_cli_version;
    const key = cv.cli_version;
    const existing = state.cliVersionMap.get(key);
    if (!existing || new Date(cv.sampled_at).getTime() > new Date(existing.sampled_at).getTime()) {
      state.cliVersionMap.set(key, { ...cv });
    }
  }

  for (const lf of metric.totals_by_language_feature) {
    upsertAggMapEntry(state.langFeatureMap, `${lf.language}-${lf.feature}`, lf, accumulateAggMetricTotals);
  }

  for (const mf of metric.totals_by_model_feature) {
    upsertAggMapEntry(state.modelFeatureMap, `${mf.model}-${mf.feature}`, mf, accumulateInteractionAggMetricTotals);
  }

  state.days.push({
    day: metric.day,
    user_initiated_interaction_count: metric.user_initiated_interaction_count,
    code_generation_activity_count: metric.code_generation_activity_count,
    code_acceptance_activity_count: metric.code_acceptance_activity_count,
    loc_added_sum: metric.loc_added_sum,
    loc_deleted_sum: metric.loc_deleted_sum,
    loc_suggested_to_add_sum: metric.loc_suggested_to_add_sum,
    loc_suggested_to_delete_sum: metric.loc_suggested_to_delete_sum,
    totals_by_feature: metric.totals_by_feature.map((f) => ({ ...f })),
    totals_by_ide: metric.totals_by_ide.map((ide) => ({
      ide: ide.ide,
      user_initiated_interaction_count: ide.user_initiated_interaction_count,
      code_generation_activity_count: ide.code_generation_activity_count,
      code_acceptance_activity_count: ide.code_acceptance_activity_count,
      loc_added_sum: ide.loc_added_sum,
      loc_deleted_sum: ide.loc_deleted_sum,
      loc_suggested_to_add_sum: ide.loc_suggested_to_add_sum,
      loc_suggested_to_delete_sum: ide.loc_suggested_to_delete_sum,
      last_known_plugin_version: ide.last_known_plugin_version
        ? { ...ide.last_known_plugin_version }
        : undefined,
    })),
    totals_by_language_feature: metric.totals_by_language_feature.map((lf) => ({ ...lf })),
    totals_by_language_model: metric.totals_by_language_model.map((lm) => ({ ...lm })),
    totals_by_model_feature: metric.totals_by_model_feature.map((mf) => ({ ...mf })),
    totals_by_cli: metric.totals_by_cli ? {
      session_count: metric.totals_by_cli.session_count,
      request_count: metric.totals_by_cli.request_count,
      prompt_count: metric.totals_by_cli.prompt_count,
      token_usage: { ...metric.totals_by_cli.token_usage },
      last_known_cli_version: metric.totals_by_cli.last_known_cli_version
        ? { ...metric.totals_by_cli.last_known_cli_version }
        : undefined,
    } : undefined,
  });
}

function adaptDaysAsMetrics(days: UserDayData[], userId: number, reportStartDay: string, reportEndDay: string): CopilotMetrics[] {
  return days.map(day => ({
    report_start_day: reportStartDay,
    report_end_day: reportEndDay,
    day: day.day,
    enterprise_id: '',
    user_id: userId,
    user_login: '',
    user_initiated_interaction_count: day.user_initiated_interaction_count,
    code_generation_activity_count: day.code_generation_activity_count,
    code_acceptance_activity_count: day.code_acceptance_activity_count,
    loc_added_sum: day.loc_added_sum,
    loc_deleted_sum: day.loc_deleted_sum,
    loc_suggested_to_add_sum: day.loc_suggested_to_add_sum,
    loc_suggested_to_delete_sum: day.loc_suggested_to_delete_sum,
    totals_by_ide: day.totals_by_ide,
    totals_by_feature: day.totals_by_feature,
    totals_by_language_feature: day.totals_by_language_feature,
    totals_by_language_model: day.totals_by_language_model,
    totals_by_model_feature: day.totals_by_model_feature,
    totals_by_cli: day.totals_by_cli,
    used_agent: false,
    used_chat: false,
    used_cli: !!day.totals_by_cli,
    used_copilot_coding_agent: false,
  }));
}

export function computeUserDetailedMetrics(
  accumulator: UserDetailAccumulator
): Map<number, UserDetailedMetrics> {
  const result = new Map<number, UserDetailedMetrics>();

  for (const [userId] of accumulator.users) {
    const details = computeSingleUserDetailedMetrics(accumulator, userId);
    if (details) {
      result.set(userId, details);
    }
  }

  return result;
}

export function computeSingleUserDetailedMetrics(
  accumulator: UserDetailAccumulator,
  userId: number
): UserDetailedMetrics | null {
  const state = accumulator.users.get(userId);
  if (!state) return null;

  const pluginVersions = Array.from(state.pluginVersionMap.values()).sort(
    (a, b) => new Date(b.sampled_at).getTime() - new Date(a.sampled_at).getTime()
  );

  const cliVersions = Array.from(state.cliVersionMap.values()).sort(
    (a, b) => new Date(b.sampled_at).getTime() - new Date(a.sampled_at).getTime()
  );

  const adaptedMetrics = adaptDaysAsMetrics(
    state.days, userId, accumulator.reportStartDay, accumulator.reportEndDay
  );

  return {
    totalStandardModelRequests: state.totalStandardModelRequests,
    totalPremiumModelRequests: state.totalPremiumModelRequests,
    featureAggregates: Array.from(state.featureMap.values()),
    ideAggregates: Array.from(state.ideMap.values()),
    languageFeatureAggregates: Array.from(state.langFeatureMap.values()),
    modelFeatureAggregates: Array.from(state.modelFeatureMap.values()),
    pluginVersions,
    cliVersions,
    dailyCombinedImpact: calculateJoinedImpactData(adaptedMetrics),
    dailyModelUsage: calculateDailyModelUsage(adaptedMetrics),
    dailyAgentImpact: calculateAgentImpactData(adaptedMetrics),
    dailyAskModeImpact: calculateAskModeImpactData(adaptedMetrics),
    dailyCompletionImpact: calculateCodeCompletionImpactData(adaptedMetrics),
    dailyCliImpact: calculateCliImpactData(adaptedMetrics),
    days: state.days,
    reportStartDay: accumulator.reportStartDay,
    reportEndDay: accumulator.reportEndDay,
  };
}
