import { describe, it, expect } from 'vitest';
import {
  createCliUsageAccumulator,
  ensureCliDates,
  accumulateCliUsage,
  computeDailyCliSessionData,
  computeDailyCliTokenData,
} from '../cliUsageCalculator';
import type { CopilotMetrics } from '../../../types/metrics';

function makeMetric(overrides: Partial<CopilotMetrics> = {}): CopilotMetrics {
  return {
    report_start_day: '2024-01-01',
    report_end_day: '2024-01-15',
    day: '2024-01-15',
    enterprise_id: 'test-enterprise',
    user_id: 1,
    user_login: 'testuser',
    user_initiated_interaction_count: 0,
    code_generation_activity_count: 0,
    code_acceptance_activity_count: 0,
    loc_added_sum: 0,
    loc_deleted_sum: 0,
    loc_suggested_to_add_sum: 0,
    loc_suggested_to_delete_sum: 0,
    totals_by_ide: [],
    totals_by_feature: [],
    totals_by_language_feature: [],
    totals_by_language_model: [],
    totals_by_model_feature: [],
    used_agent: false,
    used_chat: false,
    used_cli: false,
    ...overrides,
  };
}

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

describe('cliUsageCalculator', () => {
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
      expect(result[1].date).toBe('2024-01-16');
      expect(result[1].outputTokens).toBe(200);
      expect(result[1].promptTokens).toBe(100);
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
    });
  });
});
