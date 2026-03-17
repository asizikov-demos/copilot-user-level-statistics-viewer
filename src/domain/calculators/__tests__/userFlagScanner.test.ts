import { describe, it, expect } from 'vitest';
import { scanAllUserFlags } from '../userFlagScanner';
import type { UserDetailAccumulator } from '../userDetailCalculator';
import type { UserSummary } from '../../../types/metrics';
import { FLAG_NO_PREMIUM_MODELS } from '../../../types/userFlags';

function makeUserSummary(overrides: Partial<UserSummary> & { user_id: number }): UserSummary {
  return {
    user_login: `user-${overrides.user_id}`,
    total_user_initiated_interactions: 0,
    total_code_generation_activities: 0,
    total_code_acceptance_activities: 0,
    total_loc_added: 0,
    total_loc_deleted: 0,
    total_loc_suggested_to_add: 0,
    total_loc_suggested_to_delete: 0,
    days_active: 0,
    used_agent: false,
    used_chat: false,
    used_cli: false,
    flags: [],
    ...overrides,
  };
}

function makeUserState(premium: number, standard: number) {
  return {
    totalPremiumModelRequests: premium,
    totalStandardModelRequests: standard,
    featureMap: new Map(),
    ideMap: new Map(),
    langFeatureMap: new Map(),
    modelFeatureMap: new Map(),
    pluginVersionMap: new Map(),
    cliVersionMap: new Map(),
    days: [],
  };
}

function makeAccumulator(entries: Array<[number, { totalPremiumModelRequests: number; totalStandardModelRequests: number }]>): UserDetailAccumulator {
  const users = new Map(entries.map(([id, counts]) => [id, makeUserState(counts.totalPremiumModelRequests, counts.totalStandardModelRequests)]));
  return { users, reportStartDay: '2024-01-01', reportEndDay: '2024-01-31' } as UserDetailAccumulator;
}

describe('userFlagScanner', () => {
  describe('no-premium-models scanner', () => {
    it('should flag a user with only standard model requests', () => {
      const accumulator = makeAccumulator([[1, { totalPremiumModelRequests: 0, totalStandardModelRequests: 50 }]]);
      const summaries = [makeUserSummary({ user_id: 1 })];

      scanAllUserFlags(accumulator, summaries);

      expect(summaries[0].flags).toHaveLength(1);
      expect(summaries[0].flags[0]).toEqual({
        kind: FLAG_NO_PREMIUM_MODELS,
        label: 'Uses base models only',
        severity: 'warning',
      });
    });

    it('should not flag a user with premium model requests', () => {
      const accumulator = makeAccumulator([[1, { totalPremiumModelRequests: 10, totalStandardModelRequests: 40 }]]);
      const summaries = [makeUserSummary({ user_id: 1 })];

      scanAllUserFlags(accumulator, summaries);

      expect(summaries[0].flags).toHaveLength(0);
    });

    it('should not flag a user with zero activity', () => {
      const accumulator = makeAccumulator([[1, { totalPremiumModelRequests: 0, totalStandardModelRequests: 0 }]]);
      const summaries = [makeUserSummary({ user_id: 1 })];

      scanAllUserFlags(accumulator, summaries);

      expect(summaries[0].flags).toHaveLength(0);
    });

    it('should not flag a user with only premium model requests', () => {
      const accumulator = makeAccumulator([[1, { totalPremiumModelRequests: 30, totalStandardModelRequests: 0 }]]);
      const summaries = [makeUserSummary({ user_id: 1 })];

      scanAllUserFlags(accumulator, summaries);

      expect(summaries[0].flags).toHaveLength(0);
    });

    it('should not flag a user with unknown models counted as premium', () => {
      const accumulator = makeAccumulator([[1, { totalPremiumModelRequests: 15, totalStandardModelRequests: 50 }]]);
      const summaries = [makeUserSummary({ user_id: 1 })];

      scanAllUserFlags(accumulator, summaries);

      expect(summaries[0].flags).toHaveLength(0);
    });
  });

  describe('scanAllUserFlags', () => {
    it('should populate flags on matching summaries only', () => {
      const accumulator = makeAccumulator([
        [1, { totalPremiumModelRequests: 0, totalStandardModelRequests: 50 }],
        [2, { totalPremiumModelRequests: 10, totalStandardModelRequests: 40 }],
        [3, { totalPremiumModelRequests: 0, totalStandardModelRequests: 20 }],
      ]);
      const summaries = [
        makeUserSummary({ user_id: 1 }),
        makeUserSummary({ user_id: 2 }),
        makeUserSummary({ user_id: 3 }),
      ];

      scanAllUserFlags(accumulator, summaries);

      expect(summaries[0].flags).toHaveLength(1);
      expect(summaries[0].flags[0].kind).toBe(FLAG_NO_PREMIUM_MODELS);
      expect(summaries[1].flags).toHaveLength(0);
      expect(summaries[2].flags).toHaveLength(1);
      expect(summaries[2].flags[0].kind).toBe(FLAG_NO_PREMIUM_MODELS);
    });

    it('should handle users missing from accumulator gracefully', () => {
      const accumulator = makeAccumulator([]);
      const summaries = [makeUserSummary({ user_id: 999 })];

      scanAllUserFlags(accumulator, summaries);

      expect(summaries[0].flags).toHaveLength(0);
    });

    it('should not duplicate flags when called multiple times', () => {
      const accumulator = makeAccumulator([[1, { totalPremiumModelRequests: 0, totalStandardModelRequests: 50 }]]);
      const summaries = [makeUserSummary({ user_id: 1 })];

      scanAllUserFlags(accumulator, summaries);
      scanAllUserFlags(accumulator, summaries);

      expect(summaries[0].flags).toHaveLength(1);
    });
  });
});
