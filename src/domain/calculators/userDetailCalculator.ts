import type { CopilotMetrics, UserDayData } from '../../types/metrics';
import type { UserDetailedMetrics } from '../../types/aggregatedMetrics';
import {
  calculateDailyPRUAnalysis,
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

interface UserAccState {
  totalStandardModelRequests: number;
  totalPremiumModelRequests: number;
  featureMap: Map<string, FeatureAgg>;
  ideMap: Map<string, IDEAgg>;
  langFeatureMap: Map<string, LangFeatureAgg>;
  modelFeatureMap: Map<string, ModelFeatureAgg>;
  pluginVersionMap: Map<string, PluginVersionEntry>;
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
      days: [],
    };
    accumulator.users.set(userId, state);
  }
  return state;
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
    if (model !== 'unknown' && model !== '') {
      if (multiplier === 0) {
        state.totalStandardModelRequests += mf.user_initiated_interaction_count;
      } else {
        state.totalPremiumModelRequests += mf.user_initiated_interaction_count;
      }
    }
  }

  for (const f of metric.totals_by_feature) {
    const existing = state.featureMap.get(f.feature);
    if (existing) {
      existing.user_initiated_interaction_count += f.user_initiated_interaction_count;
      existing.code_generation_activity_count += f.code_generation_activity_count;
      existing.code_acceptance_activity_count += f.code_acceptance_activity_count;
      existing.loc_added_sum += f.loc_added_sum;
      existing.loc_deleted_sum += f.loc_deleted_sum;
      existing.loc_suggested_to_add_sum += f.loc_suggested_to_add_sum;
      existing.loc_suggested_to_delete_sum += f.loc_suggested_to_delete_sum;
    } else {
      state.featureMap.set(f.feature, { ...f });
    }
  }

  for (const ide of metric.totals_by_ide) {
    const existing = state.ideMap.get(ide.ide);
    if (existing) {
      existing.user_initiated_interaction_count += ide.user_initiated_interaction_count;
      existing.code_generation_activity_count += ide.code_generation_activity_count;
      existing.code_acceptance_activity_count += ide.code_acceptance_activity_count;
      existing.loc_added_sum += ide.loc_added_sum;
      existing.loc_deleted_sum += ide.loc_deleted_sum;
      existing.loc_suggested_to_add_sum += ide.loc_suggested_to_add_sum;
      existing.loc_suggested_to_delete_sum += ide.loc_suggested_to_delete_sum;
    } else {
      state.ideMap.set(ide.ide, {
        ide: ide.ide,
        user_initiated_interaction_count: ide.user_initiated_interaction_count,
        code_generation_activity_count: ide.code_generation_activity_count,
        code_acceptance_activity_count: ide.code_acceptance_activity_count,
        loc_added_sum: ide.loc_added_sum,
        loc_deleted_sum: ide.loc_deleted_sum,
        loc_suggested_to_add_sum: ide.loc_suggested_to_add_sum,
        loc_suggested_to_delete_sum: ide.loc_suggested_to_delete_sum,
      });
    }

    if (ide.last_known_plugin_version) {
      const pv = ide.last_known_plugin_version;
      const key = `${pv.plugin}-${pv.plugin_version}`;
      const existing = state.pluginVersionMap.get(key);
      if (!existing || new Date(pv.sampled_at).getTime() > new Date(existing.sampled_at).getTime()) {
        state.pluginVersionMap.set(key, { ...pv });
      }
    }
  }

  for (const lf of metric.totals_by_language_feature) {
    const key = `${lf.language}-${lf.feature}`;
    const existing = state.langFeatureMap.get(key);
    if (existing) {
      existing.code_generation_activity_count += lf.code_generation_activity_count;
      existing.code_acceptance_activity_count += lf.code_acceptance_activity_count;
      existing.loc_added_sum += lf.loc_added_sum;
      existing.loc_deleted_sum += lf.loc_deleted_sum;
      existing.loc_suggested_to_add_sum += lf.loc_suggested_to_add_sum;
      existing.loc_suggested_to_delete_sum += lf.loc_suggested_to_delete_sum;
    } else {
      state.langFeatureMap.set(key, { ...lf });
    }
  }

  for (const mf of metric.totals_by_model_feature) {
    const key = `${mf.model}-${mf.feature}`;
    const existing = state.modelFeatureMap.get(key);
    if (existing) {
      existing.user_initiated_interaction_count += mf.user_initiated_interaction_count;
      existing.code_generation_activity_count += mf.code_generation_activity_count;
      existing.code_acceptance_activity_count += mf.code_acceptance_activity_count;
      existing.loc_added_sum += mf.loc_added_sum;
      existing.loc_deleted_sum += mf.loc_deleted_sum;
      existing.loc_suggested_to_add_sum += mf.loc_suggested_to_add_sum;
      existing.loc_suggested_to_delete_sum += mf.loc_suggested_to_delete_sum;
    } else {
      state.modelFeatureMap.set(key, { ...mf });
    }
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
    used_agent: false,
    used_chat: false,
    used_cli: false,
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
    dailyPRUAnalysis: calculateDailyPRUAnalysis(adaptedMetrics),
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
