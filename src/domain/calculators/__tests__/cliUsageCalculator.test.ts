import { describe, it, expect } from 'vitest';
import {
  createCliUsageAccumulator,
  ensureCliDates,
  accumulateCliUsage,
  computeDailyCliSessionData,
  computeDailyCliTokenData,
  computeCliFeatureTotals,
  computeCliDayTotals,
} from '../cliUsageCalculator';
import { makeMetric } from '../../../__tests__/factories/metrics';
import type { CopilotMetrics, UserDayData } from '../../../types/metrics';

function makeCliMetric(
  cli: { sessionCount: number; requestCount: number; promptCount: number; outputTokens: number; promptTokens: number },
  overrides: Partial<CopilotMetrics> = {}
): CopilotMetrics {
  return makeMetric({
    totals_by_cli: {
      session_count: cli.sessionCount,
      request_count: cli.requestCount,
      prompt_count: cli.promptCount,
      token_usage: {
        output_tokens_sum: cli.outputTokens,
        prompt_tokens_sum: cli.promptTokens,
        avg_tokens_per_request: cli.requestCount > 0
          ? (cli.outputTokens + cli.promptTokens) / cli.requestCount
          : 0,
      },
    },
    ...overrides,
  });
}

function makeUserDayData(overrides: Partial<UserDayData> = {}): UserDayData {
  return {
    day: '2024-01-15',
    user_initiated_interaction_count: 0,
    code_generation_activity_count: 0,
    code_acceptance_activity_count: 0,
    loc_added_sum: 0,
    loc_deleted_sum: 0,
    loc_suggested_to_add_sum: 0,
    loc_suggested_to_delete_sum: 0,
    used_copilot_coding_agent: false,
    used_copilot_code_review_active: false,
    used_copilot_code_review_passive: false,
    totals_by_feature: [],
    totals_by_ide: [],
    totals_by_language_feature: [],
    totals_by_language_model: [],
    totals_by_model_feature: [],
    ...overrides,
  };
}

describe('cliUsageCalculator', () => {
  describe('computeCliFeatureTotals', () => {
    it('should aggregate only CLI feature totals including suggested LOC fields', () => {
      const day = makeUserDayData({
        totals_by_feature: [
          {
            feature: 'copilot_cli',
            user_initiated_interaction_count: 2,
            code_generation_activity_count: 3,
            code_acceptance_activity_count: 4,
            loc_added_sum: 5,
            loc_deleted_sum: 6,
            loc_suggested_to_add_sum: 7,
            loc_suggested_to_delete_sum: 8,
          },
          {
            feature: 'cli_agent',
            user_initiated_interaction_count: 10,
            code_generation_activity_count: 11,
            code_acceptance_activity_count: 12,
            loc_added_sum: 13,
            loc_deleted_sum: 14,
            loc_suggested_to_add_sum: 15,
            loc_suggested_to_delete_sum: 16,
          },
          {
            feature: 'code_completions',
            user_initiated_interaction_count: 100,
            code_generation_activity_count: 100,
            code_acceptance_activity_count: 100,
            loc_added_sum: 100,
            loc_deleted_sum: 100,
            loc_suggested_to_add_sum: 100,
            loc_suggested_to_delete_sum: 100,
          },
        ],
      });

      const totals = computeCliFeatureTotals(day.totals_by_feature);

      expect(totals).toEqual({
        interactions: 12,
        generations: 14,
        acceptances: 16,
        locAdded: 18,
        locDeleted: 20,
        locSuggestedToAdd: 22,
        locSuggestedToDelete: 24,
      });
    });
  });

  describe('computeCliDayTotals', () => {
    it('should fallback to prompt count when cli feature interactions are zero', () => {
      const day = makeUserDayData({
        totals_by_feature: [{
          feature: 'code_completions',
          user_initiated_interaction_count: 0,
          code_generation_activity_count: 1,
          code_acceptance_activity_count: 1,
          loc_added_sum: 1,
          loc_deleted_sum: 1,
          loc_suggested_to_add_sum: 1,
          loc_suggested_to_delete_sum: 1,
        }],
        totals_by_cli: {
          session_count: 1,
          request_count: 2,
          prompt_count: 9,
          token_usage: {
            output_tokens_sum: 10,
            prompt_tokens_sum: 11,
            avg_tokens_per_request: 10.5,
          },
        },
      });

      const totals = computeCliDayTotals(day);

      expect(totals.interactions).toBe(0);
      expect(totals.promptCount).toBe(9);
      expect(totals.interactionCount).toBe(9);
    });

    it('should use cli feature interactions when present', () => {
      const day = makeUserDayData({
        totals_by_feature: [{
          feature: 'copilot_cli',
          user_initiated_interaction_count: 5,
          code_generation_activity_count: 1,
          code_acceptance_activity_count: 2,
          loc_added_sum: 3,
          loc_deleted_sum: 4,
          loc_suggested_to_add_sum: 6,
          loc_suggested_to_delete_sum: 7,
        }],
        totals_by_cli: {
          session_count: 1,
          request_count: 2,
          prompt_count: 20,
          token_usage: {
            output_tokens_sum: 10,
            prompt_tokens_sum: 11,
            avg_tokens_per_request: 10.5,
          },
        },
      });

      const totals = computeCliDayTotals(day);

      expect(totals.promptCount).toBe(20);
      expect(totals.interactions).toBe(5);
      expect(totals.interactionCount).toBe(5);
      expect(totals.locSuggestedToAdd).toBe(6);
      expect(totals.locSuggestedToDelete).toBe(7);
    });
  });

  describe('ensureCliDates', () => {
    it('should initialize empty entries for a new date', () => {
      const acc = createCliUsageAccumulator();
      ensureCliDates(acc, '2024-01-15');

      expect(acc.dailySessions.has('2024-01-15')).toBe(true);
      expect(acc.dailyTokens.has('2024-01-15')).toBe(true);

      const sessions = acc.dailySessions.get('2024-01-15')!;
      expect(sessions.sessionCount).toBe(0);
      expect(sessions.requestCount).toBe(0);
      expect(sessions.promptCount).toBe(0);
      expect(sessions.users.size).toBe(0);

      const tokens = acc.dailyTokens.get('2024-01-15')!;
      expect(tokens.outputTokens).toBe(0);
      expect(tokens.promptTokens).toBe(0);
    });

    it('should not overwrite existing data', () => {
      const acc = createCliUsageAccumulator();
      ensureCliDates(acc, '2024-01-15');

      const sessions = acc.dailySessions.get('2024-01-15')!;
      sessions.sessionCount = 5;

      ensureCliDates(acc, '2024-01-15');
      expect(acc.dailySessions.get('2024-01-15')!.sessionCount).toBe(5);
    });
  });

  describe('accumulateCliUsage', () => {
    it('should skip metrics without totals_by_cli', () => {
      const acc = createCliUsageAccumulator();
      const metric = makeMetric();

      accumulateCliUsage(acc, '2024-01-15', 1, metric);

      expect(acc.dailySessions.size).toBe(0);
      expect(acc.dailyTokens.size).toBe(0);
    });

    it('should accumulate session data from a single user', () => {
      const acc = createCliUsageAccumulator();
      const metric = makeCliMetric({
        sessionCount: 3,
        requestCount: 10,
        promptCount: 7,
        outputTokens: 500,
        promptTokens: 200,
      });

      accumulateCliUsage(acc, '2024-01-15', 1, metric);

      const sessions = acc.dailySessions.get('2024-01-15')!;
      expect(sessions.sessionCount).toBe(3);
      expect(sessions.requestCount).toBe(10);
      expect(sessions.promptCount).toBe(7);
      expect(sessions.users.size).toBe(1);

      const tokens = acc.dailyTokens.get('2024-01-15')!;
      expect(tokens.outputTokens).toBe(500);
      expect(tokens.promptTokens).toBe(200);
    });

    it('should aggregate data from multiple users on the same day', () => {
      const acc = createCliUsageAccumulator();

      accumulateCliUsage(acc, '2024-01-15', 1, makeCliMetric({
        sessionCount: 2, requestCount: 5, promptCount: 3,
        outputTokens: 100, promptTokens: 50,
      }));
      accumulateCliUsage(acc, '2024-01-15', 2, makeCliMetric({
        sessionCount: 4, requestCount: 8, promptCount: 6,
        outputTokens: 300, promptTokens: 150,
      }));

      const sessions = acc.dailySessions.get('2024-01-15')!;
      expect(sessions.sessionCount).toBe(6);
      expect(sessions.requestCount).toBe(13);
      expect(sessions.promptCount).toBe(9);
      expect(sessions.users.size).toBe(2);

      const tokens = acc.dailyTokens.get('2024-01-15')!;
      expect(tokens.outputTokens).toBe(400);
      expect(tokens.promptTokens).toBe(200);
    });

    it('should count unique users (same user appearing twice counts once)', () => {
      const acc = createCliUsageAccumulator();

      accumulateCliUsage(acc, '2024-01-15', 1, makeCliMetric({
        sessionCount: 1, requestCount: 2, promptCount: 1,
        outputTokens: 50, promptTokens: 20,
      }));
      accumulateCliUsage(acc, '2024-01-15', 1, makeCliMetric({
        sessionCount: 1, requestCount: 3, promptCount: 2,
        outputTokens: 70, promptTokens: 30,
      }));

      const sessions = acc.dailySessions.get('2024-01-15')!;
      expect(sessions.sessionCount).toBe(2);
      expect(sessions.users.size).toBe(1);
    });

    it('should work when ensureCliDates was called beforehand', () => {
      const acc = createCliUsageAccumulator();
      ensureCliDates(acc, '2024-01-15');

      accumulateCliUsage(acc, '2024-01-15', 1, makeCliMetric({
        sessionCount: 5, requestCount: 10, promptCount: 8,
        outputTokens: 1000, promptTokens: 400,
      }));

      const sessions = acc.dailySessions.get('2024-01-15')!;
      expect(sessions.sessionCount).toBe(5);
      expect(sessions.requestCount).toBe(10);
    });
  });

  describe('computeDailyCliSessionData', () => {
    it('should return empty array for empty accumulator', () => {
      const acc = createCliUsageAccumulator();
      expect(computeDailyCliSessionData(acc)).toEqual([]);
    });

    it('should convert accumulator to sorted array', () => {
      const acc = createCliUsageAccumulator();

      accumulateCliUsage(acc, '2024-01-17', 1, makeCliMetric({
        sessionCount: 1, requestCount: 2, promptCount: 1,
        outputTokens: 50, promptTokens: 20,
      }));
      accumulateCliUsage(acc, '2024-01-15', 2, makeCliMetric({
        sessionCount: 3, requestCount: 5, promptCount: 4,
        outputTokens: 100, promptTokens: 50,
      }));
      accumulateCliUsage(acc, '2024-01-16', 1, makeCliMetric({
        sessionCount: 2, requestCount: 4, promptCount: 3,
        outputTokens: 80, promptTokens: 30,
      }));

      const result = computeDailyCliSessionData(acc);

      expect(result).toHaveLength(3);
      expect(result[0].date).toBe('2024-01-15');
      expect(result[1].date).toBe('2024-01-16');
      expect(result[2].date).toBe('2024-01-17');
    });

    it('should map uniqueUsers from Set size', () => {
      const acc = createCliUsageAccumulator();

      accumulateCliUsage(acc, '2024-01-15', 1, makeCliMetric({
        sessionCount: 1, requestCount: 1, promptCount: 1,
        outputTokens: 10, promptTokens: 5,
      }));
      accumulateCliUsage(acc, '2024-01-15', 2, makeCliMetric({
        sessionCount: 1, requestCount: 1, promptCount: 1,
        outputTokens: 10, promptTokens: 5,
      }));
      accumulateCliUsage(acc, '2024-01-15', 3, makeCliMetric({
        sessionCount: 1, requestCount: 1, promptCount: 1,
        outputTokens: 10, promptTokens: 5,
      }));

      const result = computeDailyCliSessionData(acc);
      expect(result[0].uniqueUsers).toBe(3);
    });
  });

  describe('computeDailyCliTokenData', () => {
    it('should return empty array for empty accumulator', () => {
      const acc = createCliUsageAccumulator();
      expect(computeDailyCliTokenData(acc)).toEqual([]);
    });

    it('should aggregate and sort token data by date', () => {
      const acc = createCliUsageAccumulator();

      accumulateCliUsage(acc, '2024-01-16', 1, makeCliMetric({
        sessionCount: 1, requestCount: 1, promptCount: 1,
        outputTokens: 200, promptTokens: 100,
      }));
      accumulateCliUsage(acc, '2024-01-15', 1, makeCliMetric({
        sessionCount: 1, requestCount: 1, promptCount: 1,
        outputTokens: 500, promptTokens: 300,
      }));

      const result = computeDailyCliTokenData(acc);

      expect(result).toHaveLength(2);
      expect(result[0].date).toBe('2024-01-15');
      expect(result[0].outputTokens).toBe(500);
      expect(result[0].promptTokens).toBe(300);
      expect(result[0].requestCount).toBe(1);
      expect(result[1].date).toBe('2024-01-16');
      expect(result[1].outputTokens).toBe(200);
      expect(result[1].promptTokens).toBe(100);
      expect(result[1].requestCount).toBe(1);
    });

    it('should aggregate tokens from multiple users on the same day', () => {
      const acc = createCliUsageAccumulator();

      accumulateCliUsage(acc, '2024-01-15', 1, makeCliMetric({
        sessionCount: 1, requestCount: 1, promptCount: 1,
        outputTokens: 1000, promptTokens: 500,
      }));
      accumulateCliUsage(acc, '2024-01-15', 2, makeCliMetric({
        sessionCount: 1, requestCount: 1, promptCount: 1,
        outputTokens: 2000, promptTokens: 800,
      }));

      const result = computeDailyCliTokenData(acc);

      expect(result).toHaveLength(1);
      expect(result[0].outputTokens).toBe(3000);
      expect(result[0].promptTokens).toBe(1300);
      expect(result[0].requestCount).toBe(2);
    });
  });
});
