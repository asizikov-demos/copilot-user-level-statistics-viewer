import { describe, it, expect } from 'vitest';
import { scanAllUserFlags } from '../userFlagScanner';
import type { UserDetailAccumulator } from '../userDetailCalculator';
import type { UserSummary, UserDayData } from '../../../types/metrics';
import { FLAG_NO_PREMIUM_MODELS, FLAG_QUOTA_EXHAUSTION } from '../../../types/userFlags';

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

function makeUserState(premium: number, standard: number, days: UserDayData[] = []) {
  return {
    totalPremiumModelRequests: premium,
    totalStandardModelRequests: standard,
    featureMap: new Map(),
    ideMap: new Map(),
    langFeatureMap: new Map(),
    modelFeatureMap: new Map(),
    pluginVersionMap: new Map(),
    cliVersionMap: new Map(),
    days,
  };
}

function makeAccumulator(entries: Array<[number, { totalPremiumModelRequests: number; totalStandardModelRequests: number }]>): UserDetailAccumulator {
  const users = new Map(entries.map(([id, counts]) => [id, makeUserState(counts.totalPremiumModelRequests, counts.totalStandardModelRequests)]));
  return { users, reportStartDay: '2024-01-01', reportEndDay: '2024-01-31' } as UserDetailAccumulator;
}

function makeDay(day: string, models: Array<{ model: string; interactions: number }>): UserDayData {
  return {
    day,
    user_initiated_interaction_count: models.reduce((s, m) => s + m.interactions, 0),
    code_generation_activity_count: 0,
    code_acceptance_activity_count: 0,
    loc_added_sum: 0,
    loc_deleted_sum: 0,
    loc_suggested_to_add_sum: 0,
    loc_suggested_to_delete_sum: 0,
    totals_by_feature: [],
    totals_by_ide: [],
    totals_by_language_feature: [],
    totals_by_language_model: [],
    totals_by_model_feature: models.map(m => ({
      model: m.model,
      feature: 'chat_panel_agent_mode',
      user_initiated_interaction_count: m.interactions,
      code_generation_activity_count: 0,
      code_acceptance_activity_count: 0,
      loc_added_sum: 0,
      loc_deleted_sum: 0,
      loc_suggested_to_add_sum: 0,
      loc_suggested_to_delete_sum: 0,
    })),
    used_agent: false,
    used_chat: false,
    used_cli: false,
  };
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

  describe('quota-exhaustion scanner', () => {
    it('should flag a user whose standard models dominate the last week of the month', () => {
      // User has premium usage overall, but in last week of Jan standard dominates
      const days = [
        // Early/mid January: premium usage
        makeDay('2024-01-10', [{ model: 'claude-3.5-sonnet', interactions: 20 }]),
        makeDay('2024-01-15', [{ model: 'claude-3.5-sonnet', interactions: 15 }]),
        // Last week of January: mostly standard (gpt-4o has multiplier 0)
        makeDay('2024-01-25', [{ model: 'gpt-4o', interactions: 30 }]),
        makeDay('2024-01-26', [{ model: 'gpt-4o', interactions: 25 }]),
        makeDay('2024-01-27', [{ model: 'gpt-4o', interactions: 20 }]),
        makeDay('2024-01-28', [{ model: 'gpt-4o', interactions: 15 }]),
        makeDay('2024-01-29', [{ model: 'gpt-4o', interactions: 10 }]),
        makeDay('2024-01-30', [{ model: 'gpt-4o', interactions: 10 }]),
        makeDay('2024-01-31', [{ model: 'gpt-4o', interactions: 10 }]),
        // February (needed so range crosses month boundary)
        makeDay('2024-02-01', [{ model: 'gpt-4o', interactions: 5 }]),
      ];
      const users = new Map([[1, makeUserState(35, 125, days)]]);
      const accumulator = { users, reportStartDay: '2024-01-10', reportEndDay: '2024-02-01' } as UserDetailAccumulator;
      const summaries = [makeUserSummary({ user_id: 1 })];

      scanAllUserFlags(accumulator, summaries);

      const quotaFlag = summaries[0].flags.find(f => f.kind === FLAG_QUOTA_EXHAUSTION);
      expect(quotaFlag).toBeDefined();
      expect(quotaFlag!.label).toBe('Possible premium quota exhaustion');
      expect(quotaFlag!.severity).toBe('warning');
    });

    it('should not flag a user who only uses base models', () => {
      // Standard-only user with same end-of-month pattern — should NOT trigger quota flag
      const days = [
        makeDay('2024-01-25', [{ model: 'gpt-4o', interactions: 30 }]),
        makeDay('2024-01-31', [{ model: 'gpt-4o', interactions: 20 }]),
        makeDay('2024-02-01', [{ model: 'gpt-4o', interactions: 5 }]),
      ];
      const users = new Map([[1, makeUserState(0, 55, days)]]);
      const accumulator = { users, reportStartDay: '2024-01-25', reportEndDay: '2024-02-01' } as UserDetailAccumulator;
      const summaries = [makeUserSummary({ user_id: 1 })];

      scanAllUserFlags(accumulator, summaries);

      const quotaFlag = summaries[0].flags.find(f => f.kind === FLAG_QUOTA_EXHAUSTION);
      expect(quotaFlag).toBeUndefined();
      // Should still get the no-premium flag though
      expect(summaries[0].flags.find(f => f.kind === FLAG_NO_PREMIUM_MODELS)).toBeDefined();
    });

    it('should not flag a user whose premium usage is consistent through month end', () => {
      // Premium usage doesn't drop at end of month
      const days = [
        makeDay('2024-01-25', [{ model: 'claude-3.5-sonnet', interactions: 30 }]),
        makeDay('2024-01-26', [{ model: 'claude-3.5-sonnet', interactions: 25 }]),
        makeDay('2024-01-27', [{ model: 'claude-3.5-sonnet', interactions: 20 }]),
        makeDay('2024-01-28', [{ model: 'claude-3.5-sonnet', interactions: 15 }]),
        makeDay('2024-01-29', [{ model: 'claude-3.5-sonnet', interactions: 20 }]),
        makeDay('2024-01-30', [{ model: 'claude-3.5-sonnet', interactions: 18 }]),
        makeDay('2024-01-31', [{ model: 'claude-3.5-sonnet', interactions: 22 }]),
        makeDay('2024-02-01', [{ model: 'claude-3.5-sonnet', interactions: 10 }]),
      ];
      const users = new Map([[1, makeUserState(160, 0, days)]]);
      const accumulator = { users, reportStartDay: '2024-01-25', reportEndDay: '2024-02-01' } as UserDetailAccumulator;
      const summaries = [makeUserSummary({ user_id: 1 })];

      scanAllUserFlags(accumulator, summaries);

      const quotaFlag = summaries[0].flags.find(f => f.kind === FLAG_QUOTA_EXHAUSTION);
      expect(quotaFlag).toBeUndefined();
    });

    it('should not flag a user when data does not cross a month boundary', () => {
      const days = [
        makeDay('2024-01-10', [{ model: 'claude-3.5-sonnet', interactions: 10 }]),
        makeDay('2024-01-25', [{ model: 'gpt-4o', interactions: 30 }]),
      ];
      const users = new Map([[1, makeUserState(10, 30, days)]]);
      const accumulator = { users, reportStartDay: '2024-01-10', reportEndDay: '2024-01-25' } as UserDetailAccumulator;
      const summaries = [makeUserSummary({ user_id: 1 })];

      scanAllUserFlags(accumulator, summaries);

      const quotaFlag = summaries[0].flags.find(f => f.kind === FLAG_QUOTA_EXHAUSTION);
      expect(quotaFlag).toBeUndefined();
    });

    it('should detect quota exhaustion even when user has no activity on report end date', () => {
      // Report range ends on Feb 2, but user has no activity after Jan 31.
      // The scanner must pad the end date so the month boundary is detected.
      const days = [
        makeDay('2024-01-10', [{ model: 'claude-3.5-sonnet', interactions: 20 }]),
        makeDay('2024-01-25', [{ model: 'gpt-4o', interactions: 30 }]),
        makeDay('2024-01-26', [{ model: 'gpt-4o', interactions: 25 }]),
        makeDay('2024-01-27', [{ model: 'gpt-4o', interactions: 20 }]),
        makeDay('2024-01-28', [{ model: 'gpt-4o', interactions: 15 }]),
        makeDay('2024-01-29', [{ model: 'gpt-4o', interactions: 10 }]),
        makeDay('2024-01-30', [{ model: 'gpt-4o', interactions: 10 }]),
        makeDay('2024-01-31', [{ model: 'gpt-4o', interactions: 10 }]),
      ];
      const users = new Map([[1, makeUserState(20, 120, days)]]);
      const accumulator = { users, reportStartDay: '2024-01-10', reportEndDay: '2024-02-02' } as UserDetailAccumulator;
      const summaries = [makeUserSummary({ user_id: 1 })];

      scanAllUserFlags(accumulator, summaries);

      const quotaFlag = summaries[0].flags.find(f => f.kind === FLAG_QUOTA_EXHAUSTION);
      expect(quotaFlag).toBeDefined();
      expect(quotaFlag!.label).toBe('Possible premium quota exhaustion');
    });
  });
});
