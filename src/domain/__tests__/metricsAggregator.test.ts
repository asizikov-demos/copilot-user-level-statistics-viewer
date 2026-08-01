import { describe, it, expect } from 'vitest';
import { aggregateMetrics } from '../metricsAggregator';
import type { CopilotMetrics } from '../../types/metrics';
import { makeMetric } from '../../__tests__/factories/metrics';
import { computeSingleUserDetailedMetrics } from '../calculators/userDetailCalculator';

describe('metricsAggregator', () => {
  const createBasicMetric = (overrides: Partial<CopilotMetrics> = {}): CopilotMetrics =>
    makeMetric({
      user_id: 123,
      user_initiated_interaction_count: 10,
      code_generation_activity_count: 5,
      code_acceptance_activity_count: 3,
      loc_added_sum: 100,
      loc_deleted_sum: 20,
      loc_suggested_to_add_sum: 150,
      loc_suggested_to_delete_sum: 30,
      used_chat: true,
      ...overrides,
    });

  describe('aggregateMetrics', () => {
    it('should handle empty metrics array gracefully', () => {
      const { aggregated } = aggregateMetrics([]);

      expect(aggregated).toBeDefined();
      expect(aggregated.overview.stats.uniqueUsers).toBe(0);
      expect(aggregated.overview.stats.totalRecords).toBe(0);
      expect(aggregated.users.userSummaries).toHaveLength(0);
      expect(aggregated.overview.engagementData).toHaveLength(0);
    });

    it('should count distinct cloud-agent and code-review days and net LOC per user', () => {
      const day1 = createBasicMetric({
        day: '2024-01-15',
        loc_added_sum: 100,
        loc_deleted_sum: 40,
        used_copilot_coding_agent: true,
        used_copilot_code_review_active: true,
      });
      const day2 = createBasicMetric({
        day: '2024-01-16',
        loc_added_sum: 50,
        loc_deleted_sum: 10,
        used_copilot_coding_agent: true,
        used_copilot_code_review_passive: true,
      });
      const day3 = createBasicMetric({
        day: '2024-01-17',
        loc_added_sum: 0,
        loc_deleted_sum: 0,
        used_copilot_coding_agent: false,
        used_copilot_code_review_active: false,
        used_copilot_code_review_passive: false,
      });

      const { aggregated } = aggregateMetrics([day1, day2, day3]);
      const summary = aggregated.users.userSummaries[0];

      expect(summary.cloud_agent_days).toBe(2);
      expect(summary.code_review_days).toBe(2);
      expect(summary.days_active).toBe(3);
      expect(summary.net_loc_contribution).toBe(150 - 50);
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
      expect(aggregated.overview.stats.reportStartDay).toBe('2024-01-01');
      expect(aggregated.overview.stats.reportEndDay).toBe('2024-01-31');
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

      expect(aggregated.overview.stats.uniqueUsers).toBe(1);
      expect(aggregated.users.userSummaries).toHaveLength(1);

      const userSummary = aggregated.users.userSummaries[0];
      expect(userSummary.user_id).toBe(123);
      expect(userSummary.total_loc_added).toBe(150); // 100 + 50
      expect(userSummary.total_loc_deleted).toBe(30); // 20 + 10
      expect(userSummary.total_user_initiated_interactions).toBe(15); // 10 + 5
      expect(userSummary.days_active).toBe(2);
    });

    it('should return a user-detail accumulator aligned with aggregate user summaries', () => {
      const userOneDayOne = createBasicMetric({
        user_id: 123,
        user_login: 'user-one',
        day: '2024-01-15',
        report_start_day: '2024-01-01',
        report_end_day: '2024-01-31',
        user_initiated_interaction_count: 10,
        ai_credits_used: 1.25,
        totals_by_model_feature: [
          {
            model: 'gpt-4o',
            feature: 'chat_panel_ask_mode',
            user_initiated_interaction_count: 7,
            code_generation_activity_count: 0,
            code_acceptance_activity_count: 0,
            loc_added_sum: 0,
            loc_deleted_sum: 0,
            loc_suggested_to_add_sum: 0,
            loc_suggested_to_delete_sum: 0,
          },
        ],
      });
      const userOneDayTwo = createBasicMetric({
        user_id: 123,
        user_login: 'user-one',
        day: '2024-01-16',
        user_initiated_interaction_count: 5,
        ai_credits_used: 2.75,
        totals_by_model_feature: [
          {
            model: 'claude-sonnet-4.6',
            feature: 'agent_edit',
            user_initiated_interaction_count: 3,
            code_generation_activity_count: 0,
            code_acceptance_activity_count: 0,
            loc_added_sum: 0,
            loc_deleted_sum: 0,
            loc_suggested_to_add_sum: 0,
            loc_suggested_to_delete_sum: 0,
          },
        ],
      });
      const userTwo = createBasicMetric({
        user_id: 456,
        user_login: 'user-two',
        user_initiated_interaction_count: 100,
        ai_credits_used: 9,
      });

      const { aggregated, userDetailAccumulator } = aggregateMetrics([userOneDayOne, userTwo, userOneDayTwo]);
      const summary = aggregated.users.userSummaries.find(user => user.user_id === 123);
      const details = computeSingleUserDetailedMetrics(userDetailAccumulator, 123);

      expect(summary?.total_user_initiated_interactions).toBe(15);
      expect(summary?.total_ai_credits_used).toBe(4);
      expect(summary?.days_active).toBe(2);
      expect(details?.totalModelRequests).toBe(10);
      expect(details?.total_ai_credits_used).toBe(summary?.total_ai_credits_used);
      expect(details?.days.map(day => day.day)).toEqual(['2024-01-15', '2024-01-16']);
      expect(details?.reportStartDay).toBe(aggregated.overview.stats.reportStartDay);
      expect(details?.reportEndDay).toBe(aggregated.overview.stats.reportEndDay);
      expect(computeSingleUserDetailedMetrics(userDetailAccumulator, 999)).toBeNull();
    });

    it('should select the top user client by interaction count', () => {
      const ideTotal = (ide: string, interactions: number) => ({
        ide,
        user_initiated_interaction_count: interactions,
        code_generation_activity_count: 0,
        code_acceptance_activity_count: 0,
        loc_added_sum: 0,
        loc_deleted_sum: 0,
        loc_suggested_to_add_sum: 0,
        loc_suggested_to_delete_sum: 0,
      });
      const day1 = createBasicMetric({
        user_id: 123,
        day: '2024-01-15',
        totals_by_ide: [ideTotal('vscode', 3), ideTotal('intellij', 8)],
      });
      const day2 = createBasicMetric({
        user_id: 123,
        day: '2024-01-16',
        totals_by_ide: [ideTotal('vscode', 7), ideTotal('intellij', 1)],
      });
      const inactiveClientDay = createBasicMetric({
        user_id: 456,
        day: '2024-01-15',
        totals_by_ide: [ideTotal('vscode', 0)],
      });

      const { aggregated } = aggregateMetrics([day1, day2, inactiveClientDay]);

      expect(aggregated.users.userSummaries.find(user => user.user_id === 123)?.top_client).toBe('vscode');
      expect(aggregated.users.userSummaries.find(user => user.user_id === 456)?.top_client).toBeNull();
    });

    it('should include CLI activity when selecting the top user client', () => {
      const ideTotal = (ide: string, interactions: number) => ({
        ide,
        user_initiated_interaction_count: interactions,
        code_generation_activity_count: 0,
        code_acceptance_activity_count: 0,
        loc_added_sum: 0,
        loc_deleted_sum: 0,
        loc_suggested_to_add_sum: 0,
        loc_suggested_to_delete_sum: 0,
      });
      const cliOnly = createBasicMetric({
        user_id: 123,
        used_cli: true,
        totals_by_cli: {
          session_count: 3,
          request_count: 12,
          prompt_count: 9,
          token_usage: {
            output_tokens_sum: 0,
            prompt_tokens_sum: 0,
            avg_tokens_per_request: 0,
          },
        },
      });
      const cliTop = createBasicMetric({
        user_id: 456,
        used_cli: true,
        totals_by_ide: [ideTotal('vscode', 4)],
        totals_by_cli: {
          session_count: 3,
          request_count: 12,
          prompt_count: 9,
          token_usage: {
            output_tokens_sum: 0,
            prompt_tokens_sum: 0,
            avg_tokens_per_request: 0,
          },
        },
      });

      const { aggregated } = aggregateMetrics([cliOnly, cliTop]);

      expect(aggregated.users.userSummaries.find(user => user.user_id === 123)?.top_client).toBe('copilot_cli');
      expect(aggregated.users.userSummaries.find(user => user.user_id === 456)?.top_client).toBe('copilot_cli');
    });

    it('should aggregate AI credits per user across days', () => {
      const day1 = createBasicMetric({
        user_id: 123,
        day: '2024-01-15',
        ai_credits_used: 55.053015,
      });
      const day2 = createBasicMetric({
        user_id: 123,
        day: '2024-01-16',
        ai_credits_used: 4.946985,
      });

      const { aggregated } = aggregateMetrics([day1, day2]);

      expect(aggregated.users.userSummaries[0].total_ai_credits_used).toBeCloseTo(60);
    });

    it('should aggregate AI credits by day across users', () => {
      const day1User1 = createBasicMetric({
        user_id: 123,
        day: '2024-01-15',
        ai_credits_used: 55.053015,
      });
      const day1User2 = createBasicMetric({
        user_id: 456,
        day: '2024-01-15',
        ai_credits_used: 4.946985,
      });
      const day2User1 = createBasicMetric({
        user_id: 123,
        day: '2024-01-16',
        ai_credits_used: 10,
      });

      const { aggregated } = aggregateMetrics([day2User1, day1User1, day1User2]);

      expect(aggregated.ai.dailyAiCreditsData).toHaveLength(2);
      expect(aggregated.ai.dailyAiCreditsData[0].date).toBe('2024-01-15');
      expect(aggregated.ai.dailyAiCreditsData[0].aiCreditsUsed).toBeCloseTo(60);
      expect(aggregated.ai.dailyAiCreditsData[0].users).toBe(2);
      expect(aggregated.ai.dailyAiCreditsData[1]).toEqual({ date: '2024-01-16', aiCreditsUsed: 10, users: 1 });
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

      expect(aggregated.overview.stats.uniqueUsers).toBe(4);
      expect(aggregated.overview.stats.agentUsers).toBe(1);
      expect(aggregated.overview.stats.chatUsers).toBe(2);
      expect(aggregated.overview.stats.cliUsers).toBe(1);

      const summaries = aggregated.users.userSummaries;
      expect(summaries.find(u => u.user_id === 1)?.used_agent).toBe(true);
      expect(summaries.find(u => u.user_id === 2)?.used_chat).toBe(true);
      expect(summaries.find(u => u.user_id === 3)?.used_cli).toBe(true);
      expect(summaries.find(u => u.user_id === 4)?.used_auto_mode).toBe(true);
    });

    it('should keep the latest AI adoption phase per user', () => {
      const earlierPhase = createBasicMetric({
        user_id: 123,
        day: '2024-01-15',
        ai_adoption_phase: {
          phase_number: 1,
          phase: 'Phase 1',
          version: 'v1',
        },
      });
      const laterPhase = createBasicMetric({
        user_id: 123,
        day: '2024-01-16',
        ai_adoption_phase: {
          phase_number: 2,
          phase: 'Phase 2',
          version: 'v1',
        },
      });

      const { aggregated } = aggregateMetrics([earlierPhase, laterPhase]);

      expect(aggregated.users.userSummaries[0].ai_adoption_phase).toEqual({
        phase_number: 2,
        phase: 'Phase 2',
        version: 'v1',
      });
    });

    it('should aggregate AI adoption phase metrics and top dimensions per user phase', () => {
      const ideTotal = (ide: string, activity: number) => ({
        ide,
        user_initiated_interaction_count: activity,
        code_generation_activity_count: 0,
        code_acceptance_activity_count: 0,
        loc_added_sum: 0,
        loc_deleted_sum: 0,
        loc_suggested_to_add_sum: 0,
        loc_suggested_to_delete_sum: 0,
      });
      const modelFeature = (model: string, interactions: number) => ({
        model,
        feature: 'chat_panel_ask_mode',
        user_initiated_interaction_count: interactions,
        code_generation_activity_count: 0,
        code_acceptance_activity_count: 0,
        loc_added_sum: 0,
        loc_deleted_sum: 0,
        loc_suggested_to_add_sum: 0,
        loc_suggested_to_delete_sum: 0,
      });
      const languageFeature = (language: string, generations: number, acceptances: number) => ({
        language,
        feature: 'code_completion',
        code_generation_activity_count: generations,
        code_acceptance_activity_count: acceptances,
        loc_added_sum: 0,
        loc_deleted_sum: 0,
        loc_suggested_to_add_sum: 0,
        loc_suggested_to_delete_sum: 0,
      });

      const user1Day1 = createBasicMetric({
        user_id: 1,
        day: '2024-01-15',
        user_initiated_interaction_count: 10,
        loc_added_sum: 100,
        loc_deleted_sum: 10,
        ai_credits_used: 10,
        ai_adoption_phase: { phase_number: 1, phase: 'Phase 1', version: 'v1' },
        totals_by_ide: [ideTotal('vscode', 10)],
        totals_by_model_feature: [modelFeature('gpt-4o', 8)],
        totals_by_language_feature: [languageFeature('typescript', 5, 1)],
      });
      const user1Day2 = createBasicMetric({
        user_id: 1,
        day: '2024-01-16',
        user_initiated_interaction_count: 20,
        loc_added_sum: 50,
        loc_deleted_sum: 5,
        ai_credits_used: 20,
        ai_adoption_phase: { phase_number: 1, phase: 'Phase 1', version: 'v1' },
        totals_by_ide: [ideTotal('vscode', 4)],
        totals_by_model_feature: [modelFeature('claude-sonnet-4.6', 15)],
        totals_by_language_feature: [languageFeature('python', 7, 3)],
      });
      const user2 = createBasicMetric({
        user_id: 2,
        day: '2024-01-15',
        user_initiated_interaction_count: 10,
        loc_added_sum: 50,
        loc_deleted_sum: 5,
        ai_credits_used: 50,
        ai_adoption_phase: { phase_number: 1, phase: 'Phase 1', version: 'v1' },
        totals_by_ide: [ideTotal('vscode', 3)],
        totals_by_model_feature: [modelFeature('gpt-4o', 20)],
        totals_by_language_feature: [languageFeature('typescript', 10, 2)],
      });
      const user3 = createBasicMetric({
        user_id: 3,
        day: '2024-01-15',
        user_initiated_interaction_count: 5,
        loc_added_sum: 30,
        loc_deleted_sum: 3,
        ai_credits_used: 5,
        ai_adoption_phase: { phase_number: 2, phase: 'Phase 2', version: 'v1' },
        totals_by_ide: [ideTotal('intellij', 7)],
        totals_by_model_feature: [modelFeature('gpt-4o', 10)],
        totals_by_language_feature: [languageFeature('go', 6, 2)],
      });

      const { aggregated } = aggregateMetrics([user1Day1, user1Day2, user2, user3]);

      expect(aggregated.ai.aiAdoptionPhaseData).toHaveLength(2);

      const phase1 = aggregated.ai.aiAdoptionPhaseData.find(phase => phase.phase.phase_number === 1)!;
      expect(phase1.userCount).toBe(2);
      expect(phase1.avgUserInitiatedInteractions).toBe(20);
      expect(phase1.totalLocAdded).toBe(200);
      expect(phase1.totalLocDeleted).toBe(20);
      expect(phase1.avgLocAdded).toBe(100);
      expect(phase1.avgLocDeleted).toBe(10);
      expect(phase1.avgAiCreditsUsed).toBe(40);
      expect(phase1.avgDaysActive).toBe(1.5);
      expect(phase1.topModels).toEqual([
        { name: 'gpt-4o', total: 28, uniqueUsers: 2 },
        { name: 'claude-sonnet-4.6', total: 15, uniqueUsers: 1 },
      ]);
      expect(phase1.topClients).toEqual([
        { name: 'vscode', total: 17, uniqueUsers: 2 },
      ]);
      expect(phase1.topLanguages).toEqual([
        { name: 'typescript', total: 18, uniqueUsers: 2 },
        { name: 'python', total: 10, uniqueUsers: 1 },
      ]);

      const phase2 = aggregated.ai.aiAdoptionPhaseData.find(phase => phase.phase.phase_number === 2)!;
      expect(phase2.userCount).toBe(1);
      expect(phase2.avgUserInitiatedInteractions).toBe(5);
      expect(phase2.avgAiCreditsUsed).toBe(5);
      expect(phase2.topClients).toEqual([
        { name: 'intellij', total: 7, uniqueUsers: 1 },
      ]);
    });

    it('should not fall back to CLI request counts when prompt count is zero for AI adoption clients', () => {
      const metric = createBasicMetric({
        user_id: 1,
        day: '2024-01-15',
        ai_adoption_phase: { phase_number: 1, phase: 'Phase 1', version: 'v1' },
        totals_by_cli: {
          session_count: 2,
          request_count: 4,
          prompt_count: 0,
          token_usage: {
            output_tokens_sum: 0,
            prompt_tokens_sum: 0,
            avg_tokens_per_request: 0,
          },
        },
      });

      const { aggregated } = aggregateMetrics([metric]);

      expect(aggregated.ai.aiAdoptionPhaseData[0].topClients).toEqual([]);
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

      const userSummary = aggregated.users.userSummaries[0];
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

      expect(aggregated.overview.engagementData).toHaveLength(2);

      const day1Data = aggregated.overview.engagementData.find(d => d.date === '2024-01-15');
      const day2Data = aggregated.overview.engagementData.find(d => d.date === '2024-01-16');

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

      expect(aggregated.clients.ideStats).toBeDefined();
      expect(aggregated.clients.ideStats.length).toBeGreaterThan(0);
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

      expect(aggregated.languages.languageStats).toBeDefined();
      expect(aggregated.languages.languageStats.length).toBeGreaterThan(0);
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

      expect(aggregated.models.modelUsageData).toBeDefined();
      expect(aggregated.models.modelUsageData.length).toBeGreaterThan(0);
      expect(aggregated.models.modelUsageData[0].modelInteractions).toBe(15);
      expect(aggregated.models.modelUsageData[0].unknownModels).toBe(0);
    });

    it('should include assumed code completion interactions in aggregate model usage', () => {
      const metric = createBasicMetric({
        totals_by_model_feature: [
          {
            model: 'gpt-4o',
            feature: 'code_completion',
            user_initiated_interaction_count: 0,
            code_generation_activity_count: 44,
            code_acceptance_activity_count: 2,
            loc_added_sum: 2,
            loc_deleted_sum: 0,
            loc_suggested_to_add_sum: 64,
            loc_suggested_to_delete_sum: 0,
          },
        ],
      });

      const { aggregated, userDetailAccumulator } = aggregateMetrics([metric]);
      const userDetails = computeSingleUserDetailedMetrics(userDetailAccumulator, metric.user_id);

      expect(aggregated.models.modelUsageData).toEqual([
        {
          date: '2024-01-15',
          modelInteractions: 44,
          unknownModels: 0,
        },
      ]);
      expect(aggregated.models.modelBreakdownData.modelTotal).toBe(44);
      expect(aggregated.models.modelBreakdownData.allModels).toEqual([
        {
          model: 'gpt-4o',
          total: 44,
          dailyData: { '2024-01-15': 44 },
          users: 1,
        },
      ]);
      expect(userDetails?.dailyModelUsage).toEqual(aggregated.models.modelUsageData);
      expect(userDetails?.totalModelRequests).toBe(44);
    });

    it('should expose neutral model totals and entries', () => {
      const metric = createBasicMetric({
        totals_by_model_feature: [
          {
            model: 'gpt-4o',
            feature: 'code_completion',
            user_initiated_interaction_count: 10,
            code_generation_activity_count: 0,
            code_acceptance_activity_count: 0,
            loc_added_sum: 0,
            loc_deleted_sum: 0,
            loc_suggested_to_add_sum: 0,
            loc_suggested_to_delete_sum: 0,
          },
          {
            model: 'gpt-5',
            feature: 'code_completion',
            user_initiated_interaction_count: 7,
            code_generation_activity_count: 0,
            code_acceptance_activity_count: 0,
            loc_added_sum: 0,
            loc_deleted_sum: 0,
            loc_suggested_to_add_sum: 0,
            loc_suggested_to_delete_sum: 0,
          },
          {
            model: 'unknown',
            feature: 'code_completion',
            user_initiated_interaction_count: 3,
            code_generation_activity_count: 0,
            code_acceptance_activity_count: 0,
            loc_added_sum: 0,
            loc_deleted_sum: 0,
            loc_suggested_to_add_sum: 0,
            loc_suggested_to_delete_sum: 0,
          },
        ],
      });

      const { aggregated } = aggregateMetrics([metric]);
      const { modelBreakdownData } = aggregated.models;

      expect(modelBreakdownData.modelTotal).toBe(20);
      expect(modelBreakdownData.unknownTotal).toBe(3);
      expect(modelBreakdownData.allModels.map(entry => entry.model)).toEqual(['gpt-4o', 'gpt-5', 'unknown']);
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

      expect(aggregated.models.modelBreakdownData.autoModeAdoptionTrend).toEqual([
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
      expect(aggregated.models.modelBreakdownData.allModels.some(entry => entry.model === 'auto')).toBe(false);
      expect(aggregated.models.modelBreakdownData.modelTotal).toBe(0);
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

      expect(aggregated.models.modelBreakdownData.autoModels).toEqual([
        {
          model: 'auto',
          total: 1,
          dailyData: { '2024-01-15': 1 },
          users: 1,
        },
      ]);
      expect(aggregated.models.modelBreakdownData.autoModeAdoptionTrend).toEqual([
        {
          date: '2024-01-15',
          newUsers: 1,
          returningUsers: 0,
          totalActiveUsers: 1,
          cumulativeUsers: 1,
        },
      ]);
      expect(aggregated.users.userSummaries[0].used_auto_mode).toBe(true);
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

      expect(aggregated.adoption.featureAdoptionData).toBeDefined();
      expect(aggregated.adoption.featureAdoptionData.totalUsers).toBeGreaterThan(0);
    });

    it('should aggregate daily CLI model usage from model feature totals', () => {
      const day1 = createBasicMetric({
        user_id: 1,
        day: '2024-01-15',
        totals_by_model_feature: [
          {
            model: 'gpt-5.4',
            feature: 'copilot_cli',
            user_initiated_interaction_count: 15,
            code_generation_activity_count: 8,
            code_acceptance_activity_count: 8,
            loc_added_sum: 209,
            loc_deleted_sum: 50,
            loc_suggested_to_add_sum: 0,
            loc_suggested_to_delete_sum: 0,
          },
          {
            model: 'claude-sonnet-4.6',
            feature: 'copilot_cli',
            user_initiated_interaction_count: 5,
            code_generation_activity_count: 9,
            code_acceptance_activity_count: 9,
            loc_added_sum: 56,
            loc_deleted_sum: 18,
            loc_suggested_to_add_sum: 0,
            loc_suggested_to_delete_sum: 0,
          },
          {
            model: 'gpt-5.4',
            feature: 'chat_panel_ask_mode',
            user_initiated_interaction_count: 50,
            code_generation_activity_count: 0,
            code_acceptance_activity_count: 0,
            loc_added_sum: 0,
            loc_deleted_sum: 0,
            loc_suggested_to_add_sum: 0,
            loc_suggested_to_delete_sum: 0,
          },
        ],
      });
      const day2 = createBasicMetric({
        user_id: 2,
        day: '2024-01-16',
        totals_by_model_feature: [
          {
            model: 'gpt-5.4',
            feature: 'copilot_cli',
            user_initiated_interaction_count: 3,
            code_generation_activity_count: 1,
            code_acceptance_activity_count: 1,
            loc_added_sum: 12,
            loc_deleted_sum: 2,
            loc_suggested_to_add_sum: 0,
            loc_suggested_to_delete_sum: 0,
          },
          {
            model: 'claude-opus-4.7',
            feature: 'copilot_cli',
            user_initiated_interaction_count: 0,
            code_generation_activity_count: 9,
            code_acceptance_activity_count: 9,
            loc_added_sum: 1414,
            loc_deleted_sum: 1,
            loc_suggested_to_add_sum: 0,
            loc_suggested_to_delete_sum: 0,
          },
        ],
      });

      const { aggregated } = aggregateMetrics([day1, day2]);

      expect(aggregated.models.modelBreakdownData.cliTotal).toBe(23);
      expect(aggregated.models.modelBreakdownData.cliModels).toEqual([
        {
          model: 'gpt-5.4',
          total: 18,
          dailyData: {
            '2024-01-15': 15,
            '2024-01-16': 3,
          },
          users: 2,
        },
        {
          model: 'claude-sonnet-4.6',
          total: 5,
          dailyData: {
            '2024-01-15': 5,
          },
          users: 1,
        },
      ]);
    });

    it('should count CLI adoption from used_cli without relying on feature rows', () => {
      const metric = createBasicMetric({
        used_cli: true,
        totals_by_feature: [],
      });

      const { aggregated } = aggregateMetrics([metric]);

      expect(aggregated.adoption.featureAdoptionData.totalUsers).toBe(1);
      expect(aggregated.adoption.featureAdoptionData.cliUsers).toBe(1);
      expect(aggregated.adoption.featureAdoptionData.advancedUsers).toBe(1);
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

      expect(aggregated.overview.stats.codingAgentUsers).toBe(1);
      expect(aggregated.adoption.featureAdoptionData.totalUsers).toBe(1);
      expect(aggregated.adoption.featureAdoptionData.codingAgentUsers).toBe(1);
      expect(aggregated.adoption.featureAdoptionData.advancedUsers).toBe(1);
    });

    it('should count code-review users from combined active or passive flags', () => {
      const activeOnly = createBasicMetric({
        user_id: 1,
        used_chat: false,
        used_agent: false,
        used_cli: false,
        used_copilot_coding_agent: false,
        used_copilot_code_review_active: true,
        used_copilot_code_review_passive: false,
        totals_by_feature: [],
      });
      const passiveOnly = createBasicMetric({
        user_id: 2,
        used_chat: false,
        used_agent: false,
        used_cli: false,
        used_copilot_coding_agent: false,
        used_copilot_code_review_active: false,
        used_copilot_code_review_passive: true,
        totals_by_feature: [],
      });

      const { aggregated } = aggregateMetrics([activeOnly, passiveOnly]);

      expect(aggregated.adoption.featureAdoptionData.codeReviewUsers).toBe(2);
      expect(aggregated.adoption.featureAdoptionData.totalUsers).toBe(2);
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

      expect(aggregated.overview.stats.codingAgentUsers).toBe(1);
      expect(aggregated.adoption.featureAdoptionData.codingAgentUsers).toBe(1);
      expect(aggregated.adoption.featureAdoptionData.advancedUsers).toBe(1);
      expect(aggregated.users.userSummaries[0].used_copilot_coding_agent).toBe(true);
    });

    it('should aggregate daily Cloud Agent and Code Review adoption users', () => {
      const day1CloudUser = createBasicMetric({
        user_id: 1,
        day: '2024-01-15',
        used_copilot_cloud_agent: true,
        used_copilot_code_review_active: true,
      });
      const day1SecondCloudUser = createBasicMetric({
        user_id: 2,
        day: '2024-01-15',
        used_copilot_cloud_agent: true,
        used_copilot_code_review_passive: true,
      });
      const day1DuplicateCloudUser = createBasicMetric({
        user_id: 1,
        day: '2024-01-15',
        used_copilot_cloud_agent: true,
        used_copilot_code_review_active: true,
      });
      const day2CodeReviewUser = createBasicMetric({
        user_id: 3,
        day: '2024-01-16',
        used_copilot_code_review_active: true,
        used_copilot_code_review_passive: true,
      });

      const { aggregated } = aggregateMetrics([
        day1CloudUser,
        day1SecondCloudUser,
        day1DuplicateCloudUser,
        day2CodeReviewUser,
      ]);

      expect(aggregated.adoption.dailyCloudAgentAdoptionData).toEqual([
        { date: '2024-01-15', uniqueUsers: 2 },
      ]);
      expect(aggregated.adoption.dailyCodeReviewAdoptionData).toEqual([
        { date: '2024-01-15', activeUsers: 1, passiveUsers: 1, totalUsers: 2 },
        { date: '2024-01-16', activeUsers: 1, passiveUsers: 1, totalUsers: 1 },
      ]);
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

      expect(aggregated.overview.stats.codingAgentUsers).toBe(0);
      expect(aggregated.overview.stats.completionOnlyUsers).toBe(1);
      expect(aggregated.adoption.featureAdoptionData.codingAgentUsers).toBe(0);
      expect(aggregated.users.userSummaries[0].used_copilot_coding_agent).toBe(false);
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

      expect(aggregated.adoption.featureAdoptionData.cliUsers).toBe(1);
      expect(aggregated.adoption.featureAdoptionData.completionOnlyUsers).toBe(0);
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

      expect(aggregated.overview.stats.codingAgentUsers).toBe(1);
      expect(aggregated.overview.stats.completionOnlyUsers).toBe(0);
      expect(aggregated.adoption.featureAdoptionData.codingAgentUsers).toBe(1);
      expect(aggregated.adoption.featureAdoptionData.completionOnlyUsers).toBe(0);
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

      const userSummary = aggregated.users.userSummaries[0];
      expect(userSummary.used_copilot_coding_agent).toBe(true);
      expect(aggregated.overview.stats.codingAgentUsers).toBe(1);
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

      expect(aggregated.impact.codeCompletionImpactData).toBeDefined();
      expect(aggregated.impact.agentImpactData).toBeDefined();
      expect(aggregated.impact.editModeImpactData).toBeDefined();
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

      expect(aggregated.adoption.dailyAdoptionTrend).toHaveLength(2);

      const day1 = aggregated.adoption.dailyAdoptionTrend.find(d => d.date === '2024-01-15')!;
      expect(day1.newUsers).toBe(2);
      expect(day1.returningUsers).toBe(0);
      expect(day1.totalActiveUsers).toBe(2);
      expect(day1.cumulativeUsers).toBe(2);

      const day2 = aggregated.adoption.dailyAdoptionTrend.find(d => d.date === '2024-01-16')!;
      expect(day2.newUsers).toBe(1); // charlie is new
      expect(day2.returningUsers).toBe(1); // alice is returning
      expect(day2.totalActiveUsers).toBe(2);
      expect(day2.cumulativeUsers).toBe(3);
    });
  });
});
