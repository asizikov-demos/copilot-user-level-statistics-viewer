import { describe, expect, it } from 'vitest';
import { makeMetric } from '../../../__tests__/factories/metrics';
import {
  computeStats,
  createStatsAccumulator,
} from '../../calculators/statsCalculator';
import {
  accumulateClientAggregation,
  createClientAggregationAccumulator,
  finalizeClientAggregation,
} from '../clientAggregation';

function makeIdeTotal(
  ide: string,
  interactions: number,
  plugin?: string,
  pluginVersion?: string
) {
  return {
    ide,
    user_initiated_interaction_count: interactions,
    code_generation_activity_count: interactions + 1,
    code_acceptance_activity_count: interactions + 2,
    loc_added_sum: interactions + 3,
    loc_deleted_sum: interactions + 4,
    loc_suggested_to_add_sum: interactions + 5,
    loc_suggested_to_delete_sum: interactions + 6,
    last_known_plugin_version: plugin && pluginVersion
      ? {
          sampled_at: '2024-01-15T00:00:00Z',
          plugin,
          plugin_version: pluginVersion,
        }
      : undefined,
  };
}

describe('client aggregation orchestration', () => {
  it('preserves empty client defaults without replacing shared stats', () => {
    const statsAccumulator = createStatsAccumulator();
    const accumulator = createClientAggregationAccumulator();

    expect(finalizeClientAggregation(accumulator)).toEqual({
      ideStats: [],
      multiIDEUsersCount: 0,
      totalUniqueIDEUsers: 0,
      pluginVersionData: {
        jetbrains: [],
        vscode: [],
        totalUniqueIntellijUsers: 0,
        totalUniqueVsCodeUsers: 0,
      },
    });
    expect(computeStats(statsAccumulator, 0).topIde).toEqual({
      name: 'N/A',
      entries: 0,
    });
  });

  it('coordinates every IDE total, CLI overlap flags, shared stats, and plugin identities', () => {
    const statsAccumulator = createStatsAccumulator();
    const accumulator = createClientAggregationAccumulator();

    accumulateClientAggregation(
      accumulator,
      statsAccumulator,
      makeMetric({
        user_id: 1,
        user_login: 'zoe',
        used_cli: true,
        totals_by_ide: [
          makeIdeTotal('vscode', 3, 'copilot-chat', '1.2.0'),
          makeIdeTotal('intellij', 5, 'copilot', '2024.1'),
        ],
      })
    );
    accumulateClientAggregation(
      accumulator,
      statsAccumulator,
      makeMetric({
        user_id: 2,
        user_login: 'amy',
        used_cli: false,
        totals_by_cli: {
          session_count: 2,
          request_count: 4,
          prompt_count: 3,
          token_usage: {
            output_tokens_sum: 20,
            prompt_tokens_sum: 10,
            avg_tokens_per_request: 7.5,
          },
        },
        totals_by_ide: [
          makeIdeTotal('vscode', 7, 'copilot-chat', '1.2.0'),
          makeIdeTotal('intellij', 1, 'copilot', '2024.2-nightly'),
        ],
      })
    );
    accumulateClientAggregation(
      accumulator,
      statsAccumulator,
      makeMetric({
        user_id: 3,
        user_login: 'mia',
        totals_by_ide: [
          makeIdeTotal('vscode', 2, 'copilot-chat', '1.1.0'),
          makeIdeTotal('vscode', 4, 'copilot', 'ignored-version'),
        ],
      })
    );

    const result = finalizeClientAggregation(accumulator);
    expect(computeStats(statsAccumulator, 3).topIde).toEqual({
      name: 'vscode',
      entries: 3,
    });
    expect(result.multiIDEUsersCount).toBe(2);
    expect(result.totalUniqueIDEUsers).toBe(3);
    expect(result.ideStats).toEqual([
      {
        ide: 'vscode',
        uniqueUsers: 3,
        cliOverlapUsers: 1,
        totalEngagements: 16,
        totalGenerations: 20,
        totalAcceptances: 24,
        locAdded: 28,
        locDeleted: 32,
        locSuggestedToAdd: 36,
        locSuggestedToDelete: 40,
      },
      {
        ide: 'intellij',
        uniqueUsers: 2,
        cliOverlapUsers: 1,
        totalEngagements: 6,
        totalGenerations: 8,
        totalAcceptances: 10,
        locAdded: 12,
        locDeleted: 14,
        locSuggestedToAdd: 16,
        locSuggestedToDelete: 18,
      },
    ]);
    expect(result.pluginVersionData).toEqual({
      jetbrains: [
        {
          version: '2024.1',
          userCount: 1,
          usernames: ['zoe'],
        },
      ],
      vscode: [
        {
          version: '1.2.0',
          userCount: 2,
          usernames: ['amy', 'zoe'],
        },
        {
          version: '1.1.0',
          userCount: 1,
          usernames: ['mia'],
        },
      ],
      totalUniqueIntellijUsers: 1,
      totalUniqueVsCodeUsers: 3,
    });
  });

  it('allows Copilot App to be the top IDE client', () => {
    const statsAccumulator = createStatsAccumulator();
    const accumulator = createClientAggregationAccumulator();

    accumulateClientAggregation(
      accumulator,
      statsAccumulator,
      makeMetric({
        user_id: 1,
        totals_by_ide: [makeIdeTotal('copilot_app', 5)],
      })
    );

    expect(finalizeClientAggregation(accumulator).ideStats).toEqual([
      expect.objectContaining({ ide: 'copilot_app', totalEngagements: 5 }),
    ]);
    expect(computeStats(statsAccumulator, 1).topIde).toEqual({
      name: 'copilot_app',
      entries: 1,
    });
  });
});
