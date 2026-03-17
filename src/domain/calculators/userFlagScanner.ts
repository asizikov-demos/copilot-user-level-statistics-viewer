import type { UserSummary } from '../../types/metrics';
import type { UserFlag } from '../../types/userFlags';
import { FLAG_NO_PREMIUM_MODELS } from '../../types/userFlags';
import type { UserDetailAccumulator } from './userDetailCalculator';

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

const scanners: Array<(state: UserAccState) => UserFlag | null> = [
  scanNoPremiumModels,
];

export function scanAllUserFlags(
  userDetailAccumulator: UserDetailAccumulator,
  userSummaries: UserSummary[],
): void {
  for (const summary of userSummaries) {
    const state = userDetailAccumulator.users.get(summary.user_id);
    if (!state) continue;

    for (const scanner of scanners) {
      const flag = scanner(state);
      if (flag) {
        summary.flags.push(flag);
      }
    }
  }
}
