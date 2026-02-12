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

export interface UserDetailAccumulator {
  userMetrics: Map<number, CopilotMetrics[]>;
  reportStartDay: string;
  reportEndDay: string;
}

export function createUserDetailAccumulator(): UserDetailAccumulator {
  return {
    userMetrics: new Map(),
    reportStartDay: '',
    reportEndDay: '',
  };
}

export function accumulateUserDetail(
  accumulator: UserDetailAccumulator,
  metric: CopilotMetrics
): void {
  const userId = metric.user_id;
  if (!accumulator.userMetrics.has(userId)) {
    accumulator.userMetrics.set(userId, []);
  }
  accumulator.userMetrics.get(userId)!.push(metric);
}

export function computeUserDetailedMetrics(
  accumulator: UserDetailAccumulator
): Map<number, UserDetailedMetrics> {
  const result = new Map<number, UserDetailedMetrics>();

  for (const [userId, metrics] of accumulator.userMetrics) {
    result.set(userId, buildUserDetails(metrics, accumulator.reportStartDay, accumulator.reportEndDay));
  }

  return result;
}

function buildUserDetails(
  userMetrics: CopilotMetrics[],
  reportStartDay: string,
  reportEndDay: string
): UserDetailedMetrics {
  let totalStandardModelRequests = 0;
  let totalPremiumModelRequests = 0;

  const featureMap = new Map<string, {
    feature: string;
    user_initiated_interaction_count: number;
    code_generation_activity_count: number;
    code_acceptance_activity_count: number;
    loc_added_sum: number;
    loc_deleted_sum: number;
    loc_suggested_to_add_sum: number;
    loc_suggested_to_delete_sum: number;
  }>();

  const ideMap = new Map<string, {
    ide: string;
    user_initiated_interaction_count: number;
    code_generation_activity_count: number;
    code_acceptance_activity_count: number;
    loc_added_sum: number;
    loc_deleted_sum: number;
    loc_suggested_to_add_sum: number;
    loc_suggested_to_delete_sum: number;
  }>();

  const langFeatureMap = new Map<string, {
    language: string;
    feature: string;
    code_generation_activity_count: number;
    code_acceptance_activity_count: number;
    loc_added_sum: number;
    loc_deleted_sum: number;
    loc_suggested_to_add_sum: number;
    loc_suggested_to_delete_sum: number;
  }>();

  const modelFeatureMap = new Map<string, {
    model: string;
    feature: string;
    user_initiated_interaction_count: number;
    code_generation_activity_count: number;
    code_acceptance_activity_count: number;
    loc_added_sum: number;
    loc_deleted_sum: number;
    loc_suggested_to_add_sum: number;
    loc_suggested_to_delete_sum: number;
  }>();

  const pluginVersionMap = new Map<string, {
    plugin: string;
    plugin_version: string;
    sampled_at: string;
  }>();

  const days: UserDayData[] = [];

  for (const metric of userMetrics) {
    for (const mf of metric.totals_by_model_feature) {
      const model = mf.model.toLowerCase();
      const multiplier = getModelMultiplier(model);
      if (model !== 'unknown' && model !== '') {
        if (multiplier === 0) {
          totalStandardModelRequests += mf.user_initiated_interaction_count;
        } else {
          totalPremiumModelRequests += mf.user_initiated_interaction_count;
        }
      }
    }

    for (const f of metric.totals_by_feature) {
      const existing = featureMap.get(f.feature);
      if (existing) {
        existing.user_initiated_interaction_count += f.user_initiated_interaction_count;
        existing.code_generation_activity_count += f.code_generation_activity_count;
        existing.code_acceptance_activity_count += f.code_acceptance_activity_count;
        existing.loc_added_sum += f.loc_added_sum;
        existing.loc_deleted_sum += f.loc_deleted_sum;
        existing.loc_suggested_to_add_sum += f.loc_suggested_to_add_sum;
        existing.loc_suggested_to_delete_sum += f.loc_suggested_to_delete_sum;
      } else {
        featureMap.set(f.feature, { ...f });
      }
    }

    for (const ide of metric.totals_by_ide) {
      const existing = ideMap.get(ide.ide);
      if (existing) {
        existing.user_initiated_interaction_count += ide.user_initiated_interaction_count;
        existing.code_generation_activity_count += ide.code_generation_activity_count;
        existing.code_acceptance_activity_count += ide.code_acceptance_activity_count;
        existing.loc_added_sum += ide.loc_added_sum;
        existing.loc_deleted_sum += ide.loc_deleted_sum;
        existing.loc_suggested_to_add_sum += ide.loc_suggested_to_add_sum;
        existing.loc_suggested_to_delete_sum += ide.loc_suggested_to_delete_sum;
      } else {
        ideMap.set(ide.ide, {
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
        const existing = pluginVersionMap.get(key);
        if (!existing || new Date(pv.sampled_at).getTime() > new Date(existing.sampled_at).getTime()) {
          pluginVersionMap.set(key, { ...pv });
        }
      }
    }

    for (const lf of metric.totals_by_language_feature) {
      const key = `${lf.language}-${lf.feature}`;
      const existing = langFeatureMap.get(key);
      if (existing) {
        existing.code_generation_activity_count += lf.code_generation_activity_count;
        existing.code_acceptance_activity_count += lf.code_acceptance_activity_count;
        existing.loc_added_sum += lf.loc_added_sum;
        existing.loc_deleted_sum += lf.loc_deleted_sum;
        existing.loc_suggested_to_add_sum += lf.loc_suggested_to_add_sum;
        existing.loc_suggested_to_delete_sum += lf.loc_suggested_to_delete_sum;
      } else {
        langFeatureMap.set(key, { ...lf });
      }
    }

    for (const mf of metric.totals_by_model_feature) {
      const key = `${mf.model}-${mf.feature}`;
      const existing = modelFeatureMap.get(key);
      if (existing) {
        existing.user_initiated_interaction_count += mf.user_initiated_interaction_count;
        existing.code_generation_activity_count += mf.code_generation_activity_count;
        existing.code_acceptance_activity_count += mf.code_acceptance_activity_count;
        existing.loc_added_sum += mf.loc_added_sum;
        existing.loc_deleted_sum += mf.loc_deleted_sum;
        existing.loc_suggested_to_add_sum += mf.loc_suggested_to_add_sum;
        existing.loc_suggested_to_delete_sum += mf.loc_suggested_to_delete_sum;
      } else {
        modelFeatureMap.set(key, { ...mf });
      }
    }

    days.push({
      day: metric.day,
      user_initiated_interaction_count: metric.user_initiated_interaction_count,
      code_generation_activity_count: metric.code_generation_activity_count,
      code_acceptance_activity_count: metric.code_acceptance_activity_count,
      loc_added_sum: metric.loc_added_sum,
      loc_deleted_sum: metric.loc_deleted_sum,
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

  const pluginVersions = Array.from(pluginVersionMap.values()).sort(
    (a, b) => new Date(b.sampled_at).getTime() - new Date(a.sampled_at).getTime()
  );

  return {
    totalStandardModelRequests,
    totalPremiumModelRequests,
    featureAggregates: Array.from(featureMap.values()),
    ideAggregates: Array.from(ideMap.values()),
    languageFeatureAggregates: Array.from(langFeatureMap.values()),
    modelFeatureAggregates: Array.from(modelFeatureMap.values()),
    pluginVersions,
    dailyPRUAnalysis: calculateDailyPRUAnalysis(userMetrics),
    dailyCombinedImpact: calculateJoinedImpactData(userMetrics),
    dailyModelUsage: calculateDailyModelUsage(userMetrics),
    dailyAgentImpact: calculateAgentImpactData(userMetrics),
    dailyAskModeImpact: calculateAskModeImpactData(userMetrics),
    dailyCompletionImpact: calculateCodeCompletionImpactData(userMetrics),
    dailyCliImpact: calculateCliImpactData(userMetrics),
    days,
    reportStartDay,
    reportEndDay,
  };
}
