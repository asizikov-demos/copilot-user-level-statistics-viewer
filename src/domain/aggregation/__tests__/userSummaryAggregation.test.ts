import { describe, expect, it } from 'vitest';
import { makeMetric } from '../../../__tests__/factories/metrics';
import {
  accumulateUserSummaryAggregation,
  createUserSummaryAggregationAccumulator,
  finalizeUserSummaryAggregation,
} from '../userSummaryAggregation';

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

describe('user summary aggregation lifecycle', () => {
  it('finalizes empty summaries', () => {
    expect(
      finalizeUserSummaryAggregation(
        createUserSummaryAggregationAccumulator()
      )
    ).toEqual({ userSummaries: [] });
  });

  it('owns phase selection, client rules, signed totals, day sets, and sorting', () => {
    const accumulator = createUserSummaryAggregationAccumulator();
    const latestPhase = {
      phase_number: 2,
      phase: 'Accelerating',
      version: 'v2',
    };

    accumulateUserSummaryAggregation(
      accumulator,
      makeMetric({
        user_id: 1,
        day: '2024-01-16',
        user_initiated_interaction_count: 2,
        loc_added_sum: -3,
        loc_deleted_sum: 5,
        used_cli: true,
        used_copilot_code_review_active: true,
        totals_by_ide: [
          ideTotal(' beta ', 1),
          ideTotal('alpha', 1),
          ideTotal('ignored', 0),
        ],
        ai_adoption_phase: latestPhase,
      }),
      true
    );
    accumulateUserSummaryAggregation(
      accumulator,
      makeMetric({
        user_id: 1,
        day: '2024-01-15',
        user_initiated_interaction_count: 3,
        loc_added_sum: 2,
        loc_deleted_sum: -1,
        used_copilot_code_review_passive: true,
        ai_adoption_phase: {
          phase_number: 1,
          phase: 'Exploring',
          version: 'v1',
        },
      }),
      true
    );
    accumulateUserSummaryAggregation(
      accumulator,
      makeMetric({
        user_id: 2,
        user_initiated_interaction_count: 9,
      }),
      false
    );

    const result = finalizeUserSummaryAggregation(accumulator);
    expect(result.userSummaries.map(user => user.user_id)).toEqual([2, 1]);
    expect(result.userSummaries[1]).toMatchObject({
      total_user_initiated_interactions: 5,
      total_loc_added: -1,
      total_loc_deleted: 4,
      net_loc_contribution: -5,
      days_active: 2,
      cloud_agent_days: 2,
      code_review_days: 2,
      top_client: 'alpha',
      used_cli: true,
      used_copilot_coding_agent: true,
      used_copilot_code_review_active: true,
      used_copilot_code_review_passive: true,
      ai_adoption_phase: latestPhase,
    });
    expect(result.userSummaries[1].ai_adoption_phase).not.toBe(latestPhase);
  });
});
