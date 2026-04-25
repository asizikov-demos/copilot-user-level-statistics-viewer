import { describe, it, expect } from 'vitest';
import {
  createUserDetailAccumulator,
  accumulateUserDetail,
  computeSingleUserDetailedMetrics,
} from '../userDetailCalculator';
import type { CopilotMetrics } from '../../../types/metrics';

function createMetric(overrides: Partial<CopilotMetrics> = {}): CopilotMetrics {
  return {
    report_start_day: '2024-01-01',
    report_end_day: '2024-01-31',
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

describe('userDetailCalculator', () => {
  describe('createUserDetailAccumulator', () => {
    it('should return an empty accumulator', () => {
      const acc = createUserDetailAccumulator();
      expect(acc.users.size).toBe(0);
      expect(acc.reportStartDay).toBe('');
      expect(acc.reportEndDay).toBe('');
    });
  });

  describe('accumulateUserDetail — model request classification', () => {
    it('should count standard model requests (multiplier 0)', () => {
      const acc = createUserDetailAccumulator();
      acc.reportStartDay = '2024-01-01';
      acc.reportEndDay = '2024-01-31';

      accumulateUserDetail(acc, createMetric({
        totals_by_model_feature: [{
          model: 'gpt-4o', feature: 'code_completion',
          user_initiated_interaction_count: 20,
          code_generation_activity_count: 0, code_acceptance_activity_count: 0,
          loc_added_sum: 0, loc_deleted_sum: 0,
          loc_suggested_to_add_sum: 0, loc_suggested_to_delete_sum: 0,
        }],
      }));

      const state = acc.users.get(1)!;
      expect(state.totalStandardModelRequests).toBe(20);
      expect(state.totalPremiumModelRequests).toBe(0);
    });

    it('should count unknown models as premium', () => {
      const acc = createUserDetailAccumulator();
      acc.reportStartDay = '2024-01-01';
      acc.reportEndDay = '2024-01-31';

      accumulateUserDetail(acc, createMetric({
        totals_by_model_feature: [{
          model: 'unknown', feature: 'code_completion',
          user_initiated_interaction_count: 10,
          code_generation_activity_count: 0, code_acceptance_activity_count: 0,
          loc_added_sum: 0, loc_deleted_sum: 0,
          loc_suggested_to_add_sum: 0, loc_suggested_to_delete_sum: 0,
        }],
      }));

      const state = acc.users.get(1)!;
      expect(state.totalStandardModelRequests).toBe(0);
      expect(state.totalPremiumModelRequests).toBe(10);
    });

    it('should count empty model names as premium', () => {
      const acc = createUserDetailAccumulator();
      acc.reportStartDay = '2024-01-01';
      acc.reportEndDay = '2024-01-31';

      accumulateUserDetail(acc, createMetric({
        totals_by_model_feature: [{
          model: '', feature: 'code_completion',
          user_initiated_interaction_count: 5,
          code_generation_activity_count: 0, code_acceptance_activity_count: 0,
          loc_added_sum: 0, loc_deleted_sum: 0,
          loc_suggested_to_add_sum: 0, loc_suggested_to_delete_sum: 0,
        }],
      }));

      const state = acc.users.get(1)!;
      expect(state.totalStandardModelRequests).toBe(0);
      expect(state.totalPremiumModelRequests).toBe(5);
    });
  });

  describe('accumulateUserDetail — CLI data stored in days', () => {
    it('should store totals_by_cli in the day entry when present', () => {
      const acc = createUserDetailAccumulator();
      acc.reportStartDay = '2024-01-01';
      acc.reportEndDay = '2024-01-31';

      const metric = createMetric({
        totals_by_cli: {
          session_count: 5,
          request_count: 20,
          prompt_count: 15,
          token_usage: {
            output_tokens_sum: 1000,
            prompt_tokens_sum: 500,
            avg_tokens_per_request: 75,
          },
        },
      });

      accumulateUserDetail(acc, metric);

      const result = computeSingleUserDetailedMetrics(acc, 1);
      expect(result).not.toBeNull();

      const day = result!.days[0];
      expect(day.totals_by_cli).toBeDefined();
      expect(day.totals_by_cli!.session_count).toBe(5);
      expect(day.totals_by_cli!.request_count).toBe(20);
      expect(day.totals_by_cli!.prompt_count).toBe(15);
      expect(day.totals_by_cli!.token_usage.output_tokens_sum).toBe(1000);
      expect(day.totals_by_cli!.token_usage.prompt_tokens_sum).toBe(500);
      expect(day.totals_by_cli!.token_usage.avg_tokens_per_request).toBe(75);
    });

    it('should handle zero-value CLI token usage', () => {
      const acc = createUserDetailAccumulator();
      acc.reportStartDay = '2024-01-01';
      acc.reportEndDay = '2024-01-31';

      const metric = createMetric({
        totals_by_cli: {
          session_count: 0,
          request_count: 0,
          prompt_count: 0,
          token_usage: {
            output_tokens_sum: 0,
            prompt_tokens_sum: 0,
            avg_tokens_per_request: 0,
          },
        },
      });

      accumulateUserDetail(acc, metric);

      const result = computeSingleUserDetailedMetrics(acc, 1);
      const day = result!.days[0];
      expect(day.totals_by_cli).toBeDefined();
      expect(day.totals_by_cli!.session_count).toBe(0);
      expect(day.totals_by_cli!.token_usage.output_tokens_sum).toBe(0);
    });
  });

  describe('accumulateUserDetail — CLI data absent', () => {
    it('should set totals_by_cli to undefined when not present on the metric', () => {
      const acc = createUserDetailAccumulator();
      acc.reportStartDay = '2024-01-01';
      acc.reportEndDay = '2024-01-31';

      const metric = createMetric();

      accumulateUserDetail(acc, metric);

      const result = computeSingleUserDetailedMetrics(acc, 1);
      expect(result).not.toBeNull();
      expect(result!.days[0].totals_by_cli).toBeUndefined();
    });
  });

  describe('CLI version tracking', () => {
    it('should populate cliVersions when last_known_cli_version is present', () => {
      const acc = createUserDetailAccumulator();
      acc.reportStartDay = '2024-01-01';
      acc.reportEndDay = '2024-01-31';

      const metric = createMetric({
        totals_by_cli: {
          session_count: 1,
          request_count: 1,
          prompt_count: 1,
          token_usage: {
            output_tokens_sum: 10,
            prompt_tokens_sum: 5,
            avg_tokens_per_request: 15,
          },
          last_known_cli_version: {
            cli_version: '1.2.3',
            sampled_at: '2024-01-15T10:00:00Z',
          },
        },
      });

      accumulateUserDetail(acc, metric);

      const result = computeSingleUserDetailedMetrics(acc, 1);
      expect(result!.cliVersions).toHaveLength(1);
      expect(result!.cliVersions[0].cli_version).toBe('1.2.3');
      expect(result!.cliVersions[0].sampled_at).toBe('2024-01-15T10:00:00Z');
    });

    it('should return empty cliVersions when no cli version info exists', () => {
      const acc = createUserDetailAccumulator();
      acc.reportStartDay = '2024-01-01';
      acc.reportEndDay = '2024-01-31';

      accumulateUserDetail(acc, createMetric());

      const result = computeSingleUserDetailedMetrics(acc, 1);
      expect(result!.cliVersions).toEqual([]);
    });

    it('should return empty cliVersions when totals_by_cli exists but has no version', () => {
      const acc = createUserDetailAccumulator();
      acc.reportStartDay = '2024-01-01';
      acc.reportEndDay = '2024-01-31';

      accumulateUserDetail(acc, createMetric({
        totals_by_cli: {
          session_count: 1,
          request_count: 1,
          prompt_count: 1,
          token_usage: {
            output_tokens_sum: 10,
            prompt_tokens_sum: 5,
            avg_tokens_per_request: 15,
          },
        },
      }));

      const result = computeSingleUserDetailedMetrics(acc, 1);
      expect(result!.cliVersions).toEqual([]);
    });
  });

  describe('CLI version deduplication', () => {
    it('should deduplicate same CLI version keeping the latest sampled_at', () => {
      const acc = createUserDetailAccumulator();
      acc.reportStartDay = '2024-01-01';
      acc.reportEndDay = '2024-01-31';

      const metricDay1 = createMetric({
        day: '2024-01-10',
        totals_by_cli: {
          session_count: 1,
          request_count: 1,
          prompt_count: 1,
          token_usage: { output_tokens_sum: 10, prompt_tokens_sum: 5, avg_tokens_per_request: 15 },
          last_known_cli_version: {
            cli_version: '1.0.0',
            sampled_at: '2024-01-10T08:00:00Z',
          },
        },
      });

      const metricDay2 = createMetric({
        day: '2024-01-15',
        totals_by_cli: {
          session_count: 2,
          request_count: 3,
          prompt_count: 2,
          token_usage: { output_tokens_sum: 20, prompt_tokens_sum: 10, avg_tokens_per_request: 10 },
          last_known_cli_version: {
            cli_version: '1.0.0',
            sampled_at: '2024-01-15T12:00:00Z',
          },
        },
      });

      accumulateUserDetail(acc, metricDay1);
      accumulateUserDetail(acc, metricDay2);

      const result = computeSingleUserDetailedMetrics(acc, 1);
      expect(result!.cliVersions).toHaveLength(1);
      expect(result!.cliVersions[0].cli_version).toBe('1.0.0');
      expect(result!.cliVersions[0].sampled_at).toBe('2024-01-15T12:00:00Z');
    });
  });

  describe('Multiple CLI versions', () => {
    it('should track different CLI versions as separate entries sorted by sampled_at desc', () => {
      const acc = createUserDetailAccumulator();
      acc.reportStartDay = '2024-01-01';
      acc.reportEndDay = '2024-01-31';

      const metricV1 = createMetric({
        day: '2024-01-10',
        totals_by_cli: {
          session_count: 1,
          request_count: 1,
          prompt_count: 1,
          token_usage: { output_tokens_sum: 10, prompt_tokens_sum: 5, avg_tokens_per_request: 15 },
          last_known_cli_version: {
            cli_version: '1.0.0',
            sampled_at: '2024-01-10T08:00:00Z',
          },
        },
      });

      const metricV2 = createMetric({
        day: '2024-01-20',
        totals_by_cli: {
          session_count: 3,
          request_count: 5,
          prompt_count: 4,
          token_usage: { output_tokens_sum: 50, prompt_tokens_sum: 30, avg_tokens_per_request: 16 },
          last_known_cli_version: {
            cli_version: '2.0.0',
            sampled_at: '2024-01-20T14:00:00Z',
          },
        },
      });

      accumulateUserDetail(acc, metricV1);
      accumulateUserDetail(acc, metricV2);

      const result = computeSingleUserDetailedMetrics(acc, 1);
      expect(result!.cliVersions).toHaveLength(2);
      // Sorted desc by sampled_at: v2 first, then v1
      expect(result!.cliVersions[0].cli_version).toBe('2.0.0');
      expect(result!.cliVersions[1].cli_version).toBe('1.0.0');
    });
  });

  describe('adaptDaysAsMetrics - used_cli passthrough via dailyCliImpact', () => {
    it('should produce non-empty dailyCliImpact when CLI data includes copilot_cli feature', () => {
      const acc = createUserDetailAccumulator();
      acc.reportStartDay = '2024-01-01';
      acc.reportEndDay = '2024-01-31';

      const metric = createMetric({
        totals_by_cli: {
          session_count: 3,
          request_count: 10,
          prompt_count: 8,
          token_usage: { output_tokens_sum: 500, prompt_tokens_sum: 200, avg_tokens_per_request: 70 },
        },
        totals_by_feature: [
          {
            feature: 'copilot_cli',
            user_initiated_interaction_count: 5,
            code_generation_activity_count: 3,
            code_acceptance_activity_count: 2,
            loc_added_sum: 100,
            loc_deleted_sum: 20,
            loc_suggested_to_add_sum: 120,
            loc_suggested_to_delete_sum: 30,
          },
        ],
      });

      accumulateUserDetail(acc, metric);

      const result = computeSingleUserDetailedMetrics(acc, 1);
      expect(result!.dailyCliImpact.length).toBeGreaterThan(0);
      expect(result!.dailyCliImpact[0].locAdded).toBe(100);
      expect(result!.dailyCliImpact[0].locDeleted).toBe(20);
    });

    it('should produce empty dailyCliImpact when no CLI feature is present', () => {
      const acc = createUserDetailAccumulator();
      acc.reportStartDay = '2024-01-01';
      acc.reportEndDay = '2024-01-31';

      const metric = createMetric({
        totals_by_feature: [
          {
            feature: 'code_completion',
            user_initiated_interaction_count: 10,
            code_generation_activity_count: 8,
            code_acceptance_activity_count: 6,
            loc_added_sum: 200,
            loc_deleted_sum: 50,
            loc_suggested_to_add_sum: 250,
            loc_suggested_to_delete_sum: 60,
          },
        ],
      });

      accumulateUserDetail(acc, metric);

      const result = computeSingleUserDetailedMetrics(acc, 1);
      const cliWithLoc = result!.dailyCliImpact.filter(d => d.locAdded > 0 || d.locDeleted > 0);
      expect(cliWithLoc).toHaveLength(0);
    });
  });

  describe('IDE aggregates alongside CLI data', () => {
    it('should produce correct ideAggregates AND cliVersions from a single metric', () => {
      const acc = createUserDetailAccumulator();
      acc.reportStartDay = '2024-01-01';
      acc.reportEndDay = '2024-01-31';

      const metric = createMetric({
        totals_by_ide: [
          {
            ide: 'vscode',
            user_initiated_interaction_count: 50,
            code_generation_activity_count: 30,
            code_acceptance_activity_count: 20,
            loc_added_sum: 300,
            loc_deleted_sum: 80,
            loc_suggested_to_add_sum: 400,
            loc_suggested_to_delete_sum: 100,
            last_known_plugin_version: {
              plugin: 'copilot',
              plugin_version: '1.5.0',
              sampled_at: '2024-01-15T09:00:00Z',
            },
          },
        ],
        totals_by_cli: {
          session_count: 3,
          request_count: 10,
          prompt_count: 8,
          token_usage: { output_tokens_sum: 500, prompt_tokens_sum: 200, avg_tokens_per_request: 70 },
          last_known_cli_version: {
            cli_version: '0.9.0',
            sampled_at: '2024-01-15T10:00:00Z',
          },
        },
      });

      accumulateUserDetail(acc, metric);

      const result = computeSingleUserDetailedMetrics(acc, 1);
      expect(result).not.toBeNull();

      // IDE aggregates
      expect(result!.ideAggregates).toHaveLength(1);
      expect(result!.ideAggregates[0].ide).toBe('vscode');
      expect(result!.ideAggregates[0].user_initiated_interaction_count).toBe(50);
      expect(result!.ideAggregates[0].loc_added_sum).toBe(300);

      // Plugin versions
      expect(result!.pluginVersions).toHaveLength(1);
      expect(result!.pluginVersions[0].plugin).toBe('copilot');
      expect(result!.pluginVersions[0].plugin_version).toBe('1.5.0');

      // CLI versions
      expect(result!.cliVersions).toHaveLength(1);
      expect(result!.cliVersions[0].cli_version).toBe('0.9.0');

      // Day should have both IDE and CLI data
      const day = result!.days[0];
      expect(day.totals_by_ide).toHaveLength(1);
      expect(day.totals_by_cli).toBeDefined();
      expect(day.totals_by_cli!.session_count).toBe(3);
    });

    it('should aggregate IDE data across multiple days while tracking CLI versions', () => {
      const acc = createUserDetailAccumulator();
      acc.reportStartDay = '2024-01-01';
      acc.reportEndDay = '2024-01-31';

      const day1 = createMetric({
        day: '2024-01-10',
        totals_by_ide: [
          {
            ide: 'vscode',
            user_initiated_interaction_count: 10,
            code_generation_activity_count: 5,
            code_acceptance_activity_count: 3,
            loc_added_sum: 50,
            loc_deleted_sum: 10,
            loc_suggested_to_add_sum: 60,
            loc_suggested_to_delete_sum: 12,
          },
        ],
        totals_by_cli: {
          session_count: 1,
          request_count: 2,
          prompt_count: 1,
          token_usage: { output_tokens_sum: 100, prompt_tokens_sum: 50, avg_tokens_per_request: 75 },
          last_known_cli_version: {
            cli_version: '1.0.0',
            sampled_at: '2024-01-10T08:00:00Z',
          },
        },
      });

      const day2 = createMetric({
        day: '2024-01-20',
        totals_by_ide: [
          {
            ide: 'vscode',
            user_initiated_interaction_count: 20,
            code_generation_activity_count: 15,
            code_acceptance_activity_count: 10,
            loc_added_sum: 100,
            loc_deleted_sum: 30,
            loc_suggested_to_add_sum: 120,
            loc_suggested_to_delete_sum: 35,
          },
        ],
        totals_by_cli: {
          session_count: 4,
          request_count: 8,
          prompt_count: 6,
          token_usage: { output_tokens_sum: 400, prompt_tokens_sum: 200, avg_tokens_per_request: 75 },
          last_known_cli_version: {
            cli_version: '2.0.0',
            sampled_at: '2024-01-20T08:00:00Z',
          },
        },
      });

      accumulateUserDetail(acc, day1);
      accumulateUserDetail(acc, day2);

      const result = computeSingleUserDetailedMetrics(acc, 1);

      // IDE aggregates should be summed
      expect(result!.ideAggregates).toHaveLength(1);
      expect(result!.ideAggregates[0].ide).toBe('vscode');
      expect(result!.ideAggregates[0].user_initiated_interaction_count).toBe(30);
      expect(result!.ideAggregates[0].loc_added_sum).toBe(150);

      // CLI versions should both appear
      expect(result!.cliVersions).toHaveLength(2);

      // Days should both be stored
      expect(result!.days).toHaveLength(2);
    });
  });

  describe('computeSingleUserDetailedMetrics', () => {
    it('should return null for a non-existent user', () => {
      const acc = createUserDetailAccumulator();
      expect(computeSingleUserDetailedMetrics(acc, 999)).toBeNull();
    });

    it('should include reportStartDay and reportEndDay from accumulator', () => {
      const acc = createUserDetailAccumulator();
      acc.reportStartDay = '2024-01-01';
      acc.reportEndDay = '2024-01-31';

      accumulateUserDetail(acc, createMetric());

      const result = computeSingleUserDetailedMetrics(acc, 1);
      expect(result!.reportStartDay).toBe('2024-01-01');
      expect(result!.reportEndDay).toBe('2024-01-31');
    });
  });
});
