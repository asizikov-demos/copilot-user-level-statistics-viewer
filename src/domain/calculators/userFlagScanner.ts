import type { UserSummary } from '../../types/metrics';
import type { UserFlag } from '../../types/userFlags';
import { FLAG_NO_PREMIUM_MODELS, FLAG_QUOTA_EXHAUSTION } from '../../types/userFlags';
import type { UserDetailAccumulator } from './userDetailCalculator';
import { getModelMultiplier } from '../modelConfig';
import { computeBillingCycleInsight } from '../pruAdoptionInsights';

type UserAccState = UserDetailAccumulator['users'] extends Map<number, infer V> ? V : never;

function scanNoPremiumModels(state: UserAccState): UserFlag | null {
  const hasActivity = state.totalStandardModelRequests > 0 || state.totalPremiumModelRequests > 0;
  if (hasActivity && state.totalPremiumModelRequests === 0) {
    return {
      kind: FLAG_NO_PREMIUM_MODELS,
      label: 'Uses base models only',
      severity: 'warning',
    };
  }
  return null;
}

function buildDailyModelUsageFromDays(days: UserAccState['days']) {
  const dailyMap = new Map<string, { pruModels: number; standardModels: number; unknownModels: number }>();
  for (const day of days) {
    for (const entry of day.totals_by_model_feature) {
      const modelLower = entry.model.toLowerCase();
      const interactions = entry.user_initiated_interaction_count;
      if (!dailyMap.has(day.day)) {
        dailyMap.set(day.day, { pruModels: 0, standardModels: 0, unknownModels: 0 });
      }
      const record = dailyMap.get(day.day)!;
      if (modelLower === 'unknown' || modelLower === '') {
        record.unknownModels += interactions;
      } else if (getModelMultiplier(modelLower) === 0) {
        record.standardModels += interactions;
      } else {
        record.pruModels += interactions;
      }
    }
  }
  return Array.from(dailyMap, ([date, counts]) => ({ date, ...counts }));
}

function scanQuotaExhaustion(state: UserAccState): UserFlag | null {
  if (state.totalPremiumModelRequests === 0) return null;

  const dailyUsage = buildDailyModelUsageFromDays(state.days);
  const insight = computeBillingCycleInsight(dailyUsage);
  if (!insight) return null;

  return {
    kind: FLAG_QUOTA_EXHAUSTION,
    label: 'Possible premium quota exhaustion',
    severity: 'warning',
  };
}

const scanners: Array<(state: UserAccState) => UserFlag | null> = [
  scanNoPremiumModels,
  scanQuotaExhaustion,
];

export function scanAllUserFlags(
  userDetailAccumulator: UserDetailAccumulator,
  userSummaries: UserSummary[],
): void {
  for (const summary of userSummaries) {
    const state = userDetailAccumulator.users.get(summary.user_id);
    if (!state) continue;

    summary.flags = [];
    for (const scanner of scanners) {
      const flag = scanner(state);
      if (flag) {
        summary.flags.push(flag);
      }
    }
  }
}
