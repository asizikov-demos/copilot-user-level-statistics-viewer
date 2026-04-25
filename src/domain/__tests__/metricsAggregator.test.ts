import { describe, it, expect } from 'vitest';
import { aggregateMetrics } from '../metricsAggregator';
import type { CopilotMetrics } from '../../types/metrics';

describe('metricsAggregator', () => {
  const createBasicMetric = (overrides: Partial<CopilotMetrics> = {}): CopilotMetrics => ({
    report_start_day: '2024-01-01',
    report_end_day: '2024-01-31',
    day: '2024-01-15',
    enterprise_id: 'test-enterprise',
    user_id: 123,
    user_login: 'testuser',
    user_initiated_interaction_count: 10,
    code_generation_activity_count: 5,
    code_acceptance_activity_count: 3,
    loc_added_sum: 100,
    loc_deleted_sum: 20,
    loc_suggested_to_add_sum: 150,
    loc_suggested_to_delete_sum: 30,
    totals_by_ide: [],
    totals_by_feature: [],
    totals_by_language_feature: [],
    totals_by_language_model: [],
    totals_by_model_feature: [],
    used_agent: false,
    used_chat: true,
    used_cli: false,
    used_copilot_coding_agent: false,
    ...overrides,
  });

  describe('aggregateMetrics', () => {
    it('should handle empty metrics array gracefully', () => {
      const { aggregated } = aggregateMetrics([]);

      expect(aggregated).toBeDefined();
      expect(aggregated.stats.uniqueUsers).toBe(0);
      expect(aggregated.stats.totalRecords).toBe(0);
      expect(aggregated.userSummaries).toHaveLength(0);
      expect(aggregated.engagementData).toHaveLength(0);
    });

    it('should extract report date range from first record', () => {
      const metric1 = createBasicMetric({
        report_start_day: '2024-01-01',
        report_end_day: '2024-01-31',
      });
      const metric2 = createBasicMetric({
        report_start_day: '2024-02-01', // Different dates
        report_end_day: '2024-02-28',
      });

      const { aggregated } = aggregateMetrics([metric1, metric2]);

      // Should use dates from first record
      expect(aggregated.stats.reportStartDay).toBe('2024-01-01');
      expect(aggregated.stats.reportEndDay).toBe('2024-01-31');
    });

    it('should aggregate multiple records for same user across days', () => {
      const day1 = createBasicMetric({
        user_id: 123,
        user_login: 'testuser',
        day: '2024-01-15',
        loc_added_sum: 100,
        loc_deleted_sum: 20,
        user_initiated_interaction_count: 10,
      });

      const day2 = createBasicMetric({
        user_id: 123,
        user_login: 'testuser',
        day: '2024-01-16',
        loc_added_sum: 50,
        loc_deleted_sum: 10,
        user_initiated_interaction_count: 5,
      });

      const { aggregated } = aggregateMetrics([day1, day2]);

      expect(aggregated.stats.uniqueUsers).toBe(1);
      expect(aggregated.userSummaries).toHaveLength(1);

      const userSummary = aggregated.userSummaries[0];
      expect(userSummary.user_id).toBe(123);
      expect(userSummary.total_loc_added).toBe(150); // 100 + 50
      expect(userSummary.total_loc_deleted).toBe(30); // 20 + 10
      expect(userSummary.total_user_initiated_interactions).toBe(15); // 10 + 5
      expect(userSummary.days_active).toBe(2);
    });

    it('should track user feature flags correctly', () => {
      const agentUser = createBasicMetric({
        user_id: 1,
        used_agent: true,
        used_chat: false,
        used_cli: false,
      });

      const chatUser = createBasicMetric({
        user_id: 2,
        used_agent: false,
        used_chat: true,
        used_cli: false,
      });

      const cliUser = createBasicMetric({
        user_id: 3,
        used_agent: false,
        used_chat: false,
        used_cli: true,
      });

      const autoUser = createBasicMetric({
        user_id: 4,
        used_agent: false,
        used_chat: true,
        used_cli: false,
        totals_by_model_feature: [
          {
            model: 'auto',
            feature: 'agent_edit',
            user_initiated_interaction_count: 0,
            code_generation_activity_count: 1,
            code_acceptance_activity_count: 0,
            loc_added_sum: 1,
            loc_deleted_sum: 1,
            loc_suggested_to_add_sum: 0,
            loc_suggested_to_delete_sum: 0,
          },
        ],
      });

      const { aggregated } = aggregateMetrics([agentUser, chatUser, cliUser, autoUser]);

      expect(aggregated.stats.uniqueUsers).toBe(4);
      expect(aggregated.stats.agentUsers).toBe(1);
      expect(aggregated.stats.chatUsers).toBe(2);
      expect(aggregated.stats.cliUsers).toBe(1);

      const summaries = aggregated.userSummaries;
      expect(summaries.find(u => u.user_id === 1)?.used_agent).toBe(true);
      expect(summaries.find(u => u.user_id === 2)?.used_chat).toBe(true);
      expect(summaries.find(u => u.user_id === 3)?.used_cli).toBe(true);
      expect(summaries.find(u => u.user_id === 4)?.used_auto_mode).toBe(true);
    });

    it('should accumulate user flags across multiple days (OR logic)', () => {
      // User uses chat on day 1, agent on day 2
      const day1 = createBasicMetric({
        user_id: 123,
        day: '2024-01-15',
        used_agent: false,
        used_chat: true,
        used_cli: false,
      });

      const day2 = createBasicMetric({
        user_id: 123,
        day: '2024-01-16',
        used_agent: true,
        used_chat: false,
        used_cli: false,
      });

      const { aggregated } = aggregateMetrics([day1, day2]);

      const userSummary = aggregated.userSummaries[0];
      expect(userSummary.used_chat).toBe(true);
      expect(userSummary.used_agent).toBe(true);
      expect(userSummary.used_cli).toBe(false);
    });

    it('should create daily engagement data with unique users', () => {
      const user1Day1 = createBasicMetric({
        user_id: 1,
        day: '2024-01-15',
      });

      const user2Day1 = createBasicMetric({
        user_id: 2,
        day: '2024-01-15',
      });

      const user1Day2 = createBasicMetric({
        user_id: 1,
        day: '2024-01-16',
      });

      const { aggregated } = aggregateMetrics([user1Day1, user2Day1, user1Day2]);

      expect(aggregated.engagementData).toHaveLength(2);

      const day1Data = aggregated.engagementData.find(d => d.date === '2024-01-15');
      const day2Data = aggregated.engagementData.find(d => d.date === '2024-01-16');

      expect(day1Data?.activeUsers).toBe(2);
      expect(day2Data?.activeUsers).toBe(1);
    });

    it('should process IDE stats when provided', () => {
      const metric = createBasicMetric({
        totals_by_ide: [
          {
            ide: 'vscode',
            user_initiated_interaction_count: 10,
            code_generation_activity_count: 5,
            code_acceptance_activity_count: 3,
            loc_added_sum: 100,
            loc_deleted_sum: 20,
            loc_suggested_to_add_sum: 150,
            loc_suggested_to_delete_sum: 30,
          },
        ],
      });

      const { aggregated } = aggregateMetrics([metric]);

      expect(aggregated.ideStats).toBeDefined();
      expect(aggregated.ideStats.length).toBeGreaterThan(0);
    });

    it('should process language stats when provided', () => {
      const metric = createBasicMetric({
        totals_by_language_feature: [
          {
            language: 'typescript',
            feature: 'code_completion',
            code_generation_activity_count: 10,
            code_acceptance_activity_count: 5,
            loc_added_sum: 100,
            loc_deleted_sum: 20,
            loc_suggested_to_add_sum: 150,
            loc_suggested_to_delete_sum: 30,
          },
        ],
      });

      const { aggregated } = aggregateMetrics([metric]);

      expect(aggregated.languageStats).toBeDefined();
      expect(aggregated.languageStats.length).toBeGreaterThan(0);
    });

    it('should process model usage data when provided', () => {
      const metric = createBasicMetric({
        totals_by_model_feature: [
          {
            model: 'gpt-4o',
            feature: 'code_completion',
            user_initiated_interaction_count: 10,
            code_generation_activity_count: 5,
            code_acceptance_activity_count: 3,
            loc_added_sum: 100,
            loc_deleted_sum: 20,
            loc_suggested_to_add_sum: 150,
            loc_suggested_to_delete_sum: 30,
          },
        ],
      });

      const { aggregated } = aggregateMetrics([metric]);

      expect(aggregated.modelUsageData).toBeDefined();
      expect(aggregated.modelUsageData.length).toBeGreaterThan(0);
    });

    it('should compute Auto mode adoption trend from auto model usage', () => {
      const autoFeature = {
        model: 'auto',
        feature: 'chat_panel',
        user_initiated_interaction_count: 5,
        code_generation_activity_count: 0,
        code_acceptance_activity_count: 0,
        loc_added_sum: 0,
        loc_deleted_sum: 0,
        loc_suggested_to_add_sum: 0,
        loc_suggested_to_delete_sum: 0,
      };

      const day1User1 = createBasicMetric({
        user_id: 1,
        day: '2024-01-15',
        totals_by_model_feature: [autoFeature],
      });
      const day1User2 = createBasicMetric({
        user_id: 2,
        day: '2024-01-15',
        totals_by_model_feature: [autoFeature],
      });
      const day2User1 = createBasicMetric({
        user_id: 1,
        day: '2024-01-16',
        totals_by_model_feature: [autoFeature],
      });

      const { aggregated } = aggregateMetrics([day1User1, day1User2, day2User1]);

      expect(aggregated.modelBreakdownData.autoModeAdoptionTrend).toEqual([
        {
          date: '2024-01-15',
          newUsers: 2,
          returningUsers: 0,
          totalActiveUsers: 2,
          cumulativeUsers: 2,
        },
        {
          date: '2024-01-16',
          newUsers: 0,
          returningUsers: 1,
          totalActiveUsers: 1,
          cumulativeUsers: 2,
        },
      ]);
      expect(aggregated.modelBreakdownData.premiumModels.some(entry => entry.model === 'auto')).toBe(false);
      expect(aggregated.modelBreakdownData.premiumTotal).toBe(0);
    });

    it('should count Auto model activity even when user initiated interactions are zero', () => {
      const metric = createBasicMetric({
        user_id: 1,
        day: '2024-01-15',
        totals_by_model_feature: [
          {
            model: 'auto',
            feature: 'agent_edit',
            user_initiated_interaction_count: 0,
            code_generation_activity_count: 1,
            code_acceptance_activity_count: 0,
            loc_added_sum: 1,
            loc_deleted_sum: 1,
            loc_suggested_to_add_sum: 0,
            loc_suggested_to_delete_sum: 0,
          },
        ],
      });

      const { aggregated } = aggregateMetrics([metric]);

      expect(aggregated.modelBreakdownData.autoModels).toEqual([
        {
          model: 'auto',
          total: 1,
          dailyData: { '2024-01-15': 1 },
        },
      ]);
      expect(aggregated.modelBreakdownData.autoModeAdoptionTrend).toEqual([
        {
          date: '2024-01-15',
          newUsers: 1,
          returningUsers: 0,
          totalActiveUsers: 1,
          cumulativeUsers: 1,
        },
      ]);
      expect(aggregated.userSummaries[0].used_auto_mode).toBe(true);
    });

    it('should process feature adoption data when provided', () => {
      const metric = createBasicMetric({
        totals_by_feature: [
          {
            feature: 'code_completion',
            user_initiated_interaction_count: 10,
            code_generation_activity_count: 5,
            code_acceptance_activity_count: 3,
            loc_added_sum: 100,
            loc_deleted_sum: 20,
            loc_suggested_to_add_sum: 150,
            loc_suggested_to_delete_sum: 30,
          },
        ],
      });

      const { aggregated } = aggregateMetrics([metric]);

      expect(aggregated.featureAdoptionData).toBeDefined();
      expect(aggregated.featureAdoptionData.totalUsers).toBeGreaterThan(0);
    });

    it('should count CLI adoption from used_cli without relying on feature rows', () => {
      const metric = createBasicMetric({
        used_cli: true,
        totals_by_feature: [],
      });

      const { aggregated } = aggregateMetrics([metric]);

      expect(aggregated.featureAdoptionData.totalUsers).toBe(1);
      expect(aggregated.featureAdoptionData.cliUsers).toBe(1);
      expect(aggregated.featureAdoptionData.advancedUsers).toBe(1);
    });

    it('should count coding-agent-only users in feature adoption totals', () => {
      const metric = createBasicMetric({
        used_chat: false,
        used_agent: false,
        used_cli: false,
        used_copilot_coding_agent: true,
        totals_by_feature: [],
      });

      const { aggregated } = aggregateMetrics([metric]);

      expect(aggregated.stats.codingAgentUsers).toBe(1);
      expect(aggregated.featureAdoptionData.totalUsers).toBe(1);
      expect(aggregated.featureAdoptionData.codingAgentUsers).toBe(1);
      expect(aggregated.featureAdoptionData.advancedUsers).toBe(1);
    });

    it('should count cloud-agent-only users from the new cloud-agent flag', () => {
      const metric = createBasicMetric({
        used_chat: false,
        used_agent: false,
        used_cli: false,
        used_copilot_coding_agent: false,
        used_copilot_cloud_agent: true,
        totals_by_feature: [],
      });

      const { aggregated } = aggregateMetrics([metric]);

      expect(aggregated.stats.codingAgentUsers).toBe(1);
      expect(aggregated.featureAdoptionData.codingAgentUsers).toBe(1);
      expect(aggregated.featureAdoptionData.advancedUsers).toBe(1);
      expect(aggregated.userSummaries[0].used_copilot_coding_agent).toBe(true);
    });

    it('should prefer the new cloud-agent flag over the legacy coding-agent flag', () => {
      const metric = createBasicMetric({
        used_chat: false,
        used_agent: false,
        used_cli: false,
        used_copilot_coding_agent: true,
        used_copilot_cloud_agent: false,
        totals_by_feature: [],
      });

      const { aggregated } = aggregateMetrics([metric]);

      expect(aggregated.stats.codingAgentUsers).toBe(0);
      expect(aggregated.stats.completionOnlyUsers).toBe(1);
      expect(aggregated.featureAdoptionData.codingAgentUsers).toBe(0);
      expect(aggregated.userSummaries[0].used_copilot_coding_agent).toBe(false);
    });

    it('should exclude CLI users from completion-only counts when only used_cli marks CLI usage', () => {
      const metric = createBasicMetric({
        used_cli: true,
        used_chat: false,
        used_agent: false,
        totals_by_feature: [
          {
            feature: 'code_completion',
            user_initiated_interaction_count: 0,
            code_generation_activity_count: 5,
            code_acceptance_activity_count: 0,
            loc_added_sum: 0,
            loc_deleted_sum: 0,
            loc_suggested_to_add_sum: 5,
            loc_suggested_to_delete_sum: 0,
          },
        ],
      });

      const { aggregated } = aggregateMetrics([metric]);

      expect(aggregated.featureAdoptionData.cliUsers).toBe(1);
      expect(aggregated.featureAdoptionData.completionOnlyUsers).toBe(0);
    });

    it('should exclude coding-agent users from completion-only counts', () => {
      const metric = createBasicMetric({
        used_chat: false,
        used_agent: false,
        used_cli: false,
        used_copilot_coding_agent: true,
        totals_by_feature: [
          {
            feature: 'code_completion',
            user_initiated_interaction_count: 0,
            code_generation_activity_count: 5,
            code_acceptance_activity_count: 0,
            loc_added_sum: 0,
            loc_deleted_sum: 0,
            loc_suggested_to_add_sum: 5,
            loc_suggested_to_delete_sum: 0,
          },
        ],
      });

      const { aggregated } = aggregateMetrics([metric]);

      expect(aggregated.stats.codingAgentUsers).toBe(1);
      expect(aggregated.stats.completionOnlyUsers).toBe(0);
      expect(aggregated.featureAdoptionData.codingAgentUsers).toBe(1);
      expect(aggregated.featureAdoptionData.completionOnlyUsers).toBe(0);
    });

    it('should accumulate coding-agent usage across multiple days using OR logic', () => {
      const day1 = createBasicMetric({
        user_id: 123,
        day: '2024-01-15',
        used_copilot_coding_agent: false,
      });

      const day2 = createBasicMetric({
        user_id: 123,
        day: '2024-01-16',
        used_chat: false,
        used_copilot_coding_agent: true,
      });

      const { aggregated } = aggregateMetrics([day1, day2]);

      const userSummary = aggregated.userSummaries[0];
      expect(userSummary.used_copilot_coding_agent).toBe(true);
      expect(aggregated.stats.codingAgentUsers).toBe(1);
    });

    it('should process impact data when features have LOC', () => {
      const metric = createBasicMetric({
        totals_by_feature: [
          {
            feature: 'code_completion',
            user_initiated_interaction_count: 10,
            code_generation_activity_count: 5,
            code_acceptance_activity_count: 3,
            loc_added_sum: 100,
            loc_deleted_sum: 20,
            loc_suggested_to_add_sum: 150,
            loc_suggested_to_delete_sum: 30,
          },
        ],
      });

      const { aggregated } = aggregateMetrics([metric]);

      expect(aggregated.codeCompletionImpactData).toBeDefined();
      expect(aggregated.agentImpactData).toBeDefined();
      expect(aggregated.editModeImpactData).toBeDefined();
    });

    it('should compute daily adoption trend with new and returning users across surfaces', () => {
      const user1Day1 = createBasicMetric({
        user_id: 1,
        user_login: 'alice',
        day: '2024-01-15',
      });
      const user2Day1 = createBasicMetric({
        user_id: 2,
        user_login: 'bob',
        day: '2024-01-15',
      });
      const user1Day2 = createBasicMetric({
        user_id: 1,
        user_login: 'alice',
        day: '2024-01-16',
      });
      const user3Day2 = createBasicMetric({
        user_id: 3,
        user_login: 'charlie',
        day: '2024-01-16',
        used_cli: true,
        totals_by_cli: {
          session_count: 1,
          request_count: 2,
          prompt_count: 1,
          token_usage: { output_tokens_sum: 100, prompt_tokens_sum: 50, avg_tokens_per_request: 75 },
        },
      });

      const { aggregated } = aggregateMetrics([user1Day1, user2Day1, user1Day2, user3Day2]);

      expect(aggregated.dailyAdoptionTrend).toHaveLength(2);

      const day1 = aggregated.dailyAdoptionTrend.find(d => d.date === '2024-01-15')!;
      expect(day1.newUsers).toBe(2);
      expect(day1.returningUsers).toBe(0);
      expect(day1.totalActiveUsers).toBe(2);
      expect(day1.cumulativeUsers).toBe(2);

      const day2 = aggregated.dailyAdoptionTrend.find(d => d.date === '2024-01-16')!;
      expect(day2.newUsers).toBe(1); // charlie is new
      expect(day2.returningUsers).toBe(1); // alice is returning
      expect(day2.totalActiveUsers).toBe(2);
      expect(day2.cumulativeUsers).toBe(3);
    });
  });
});
