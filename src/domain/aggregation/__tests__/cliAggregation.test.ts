import { describe, expect, it } from 'vitest';
import { makeMetric } from '../../../__tests__/factories/metrics';
import {
  accumulateChatFeature,
  computeChatRequestsData,
  computeChatUsersData,
  createChatAccumulator,
} from '../../calculators/chatCalculator';
import {
  accumulateEngagement,
  computeAdoptionTrend,
  computeEngagementData,
  createEngagementAccumulator,
} from '../../calculators/engagementCalculator';
import {
  accumulateCliAggregation,
  createCliAggregationAccumulator,
  finalizeCliAggregation,
  getCliUsageForDownstreamCalculations,
} from '../cliAggregation';

function makeCliMetric(
  day: string,
  userId: number,
  sessionCount: number,
  requestCount: number,
  promptCount: number,
  outputTokens: number,
  promptTokens: number
) {
  return makeMetric({
    day,
    user_id: userId,
    totals_by_cli: {
      session_count: sessionCount,
      request_count: requestCount,
      prompt_count: promptCount,
      token_usage: {
        output_tokens_sum: outputTokens,
        prompt_tokens_sum: promptTokens,
        avg_tokens_per_request: requestCount > 0
          ? (outputTokens + promptTokens) / requestCount
          : 0,
      },
    },
  });
}

describe('CLI aggregation orchestration', () => {
  it('preserves empty CLI defaults', () => {
    expect(finalizeCliAggregation(createCliAggregationAccumulator())).toEqual({
      dailyCliSessionData: [],
      dailyCliTokenData: [],
      dailyCliAdoptionTrend: [],
    });
  });

  it('coordinates date padding, usage totals, unique users, ordering, and adoption', () => {
    const accumulator = createCliAggregationAccumulator();

    accumulateCliAggregation(
      accumulator,
      makeCliMetric('2024-01-15', 1, 2, 4, 3, 100, 40)
    );
    accumulateCliAggregation(
      accumulator,
      makeMetric({ day: '2024-01-16', user_id: 3 })
    );
    accumulateCliAggregation(
      accumulator,
      makeCliMetric('2024-01-15', 2, 1, 5, 4, 200, 60)
    );
    accumulateCliAggregation(
      accumulator,
      makeCliMetric('2024-01-17', 1, 3, 6, 5, 300, 80)
    );

    expect(finalizeCliAggregation(accumulator)).toEqual({
      dailyCliSessionData: [
        {
          date: '2024-01-15',
          sessionCount: 3,
          requestCount: 9,
          promptCount: 7,
          uniqueUsers: 2,
        },
        {
          date: '2024-01-16',
          sessionCount: 0,
          requestCount: 0,
          promptCount: 0,
          uniqueUsers: 0,
        },
        {
          date: '2024-01-17',
          sessionCount: 3,
          requestCount: 6,
          promptCount: 5,
          uniqueUsers: 1,
        },
      ],
      dailyCliTokenData: [
        {
          date: '2024-01-15',
          outputTokens: 300,
          promptTokens: 100,
          requestCount: 9,
        },
        {
          date: '2024-01-16',
          outputTokens: 0,
          promptTokens: 0,
          requestCount: 0,
        },
        {
          date: '2024-01-17',
          outputTokens: 300,
          promptTokens: 80,
          requestCount: 6,
        },
      ],
      dailyCliAdoptionTrend: [
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
          returningUsers: 0,
          totalActiveUsers: 0,
          cumulativeUsers: 2,
        },
        {
          date: '2024-01-17',
          newUsers: 0,
          returningUsers: 1,
          totalActiveUsers: 1,
          cumulativeUsers: 2,
        },
      ],
    });
  });

  it('exposes one narrow CLI usage dependency to engagement and chat calculations', () => {
    const accumulator = createCliAggregationAccumulator();
    const engagementAccumulator = createEngagementAccumulator();
    const chatAccumulator = createChatAccumulator();

    accumulateCliAggregation(
      accumulator,
      makeCliMetric('2024-01-15', 1, 2, 4, 3, 100, 40)
    );
    accumulateCliAggregation(
      accumulator,
      makeMetric({ day: '2024-01-16', user_id: 2 })
    );
    accumulateEngagement(engagementAccumulator, '2024-01-16', 2);
    accumulateChatFeature(
      chatAccumulator,
      '2024-01-16',
      2,
      'chat_panel_ask_mode',
      5
    );

    const cliUsage = getCliUsageForDownstreamCalculations(accumulator);
    expect(computeEngagementData(engagementAccumulator, cliUsage)).toEqual([
      {
        date: '2024-01-15',
        activeUsers: 1,
        totalUsers: 2,
        engagementPercentage: 50,
      },
      {
        date: '2024-01-16',
        activeUsers: 1,
        totalUsers: 2,
        engagementPercentage: 50,
      },
    ]);
    expect(computeAdoptionTrend(engagementAccumulator, cliUsage)).toEqual([
      {
        date: '2024-01-15',
        newUsers: 1,
        returningUsers: 0,
        totalActiveUsers: 1,
        cumulativeUsers: 1,
      },
      {
        date: '2024-01-16',
        newUsers: 1,
        returningUsers: 0,
        totalActiveUsers: 1,
        cumulativeUsers: 2,
      },
    ]);
    expect(computeChatUsersData(chatAccumulator, cliUsage)).toEqual([
      {
        date: '2024-01-15',
        askModeUsers: 0,
        agentModeUsers: 0,
        editModeUsers: 0,
        inlineModeUsers: 0,
        planModeUsers: 0,
        cliUsers: 1,
      },
      {
        date: '2024-01-16',
        askModeUsers: 1,
        agentModeUsers: 0,
        editModeUsers: 0,
        inlineModeUsers: 0,
        planModeUsers: 0,
        cliUsers: 0,
      },
    ]);
    expect(computeChatRequestsData(chatAccumulator, cliUsage)).toEqual([
      {
        date: '2024-01-15',
        askModeRequests: 0,
        agentModeRequests: 0,
        editModeRequests: 0,
        inlineModeRequests: 0,
        planModeRequests: 0,
        cliSessions: 2,
      },
      {
        date: '2024-01-16',
        askModeRequests: 5,
        agentModeRequests: 0,
        editModeRequests: 0,
        inlineModeRequests: 0,
        planModeRequests: 0,
        cliSessions: 0,
      },
    ]);
  });
});
