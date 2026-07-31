import { describe, expect, it } from 'vitest';
import { makeMetric } from '../../../__tests__/factories/metrics';
import type { CopilotMetrics } from '../../../types/metrics';
import {
  accumulateSurfaceProductivityAggregation,
  createSurfaceProductivityAggregationAccumulator,
  finalizeSurfaceProductivityAggregation,
} from '../surfaceProductivityAggregation';

const ideTotal = (
  locAdded: number,
  locDeleted: number
): CopilotMetrics['totals_by_ide'][number] => ({
  ide: 'vscode',
  user_initiated_interaction_count: 1,
  code_generation_activity_count: 1,
  code_acceptance_activity_count: 1,
  loc_added_sum: locAdded,
  loc_deleted_sum: locDeleted,
  loc_suggested_to_add_sum: locAdded,
  loc_suggested_to_delete_sum: locDeleted,
});

const featureTotal = (
  feature: string,
  locAdded: number,
  locDeleted: number
): CopilotMetrics['totals_by_feature'][number] => ({
  feature,
  user_initiated_interaction_count: 1,
  code_generation_activity_count: 1,
  code_acceptance_activity_count: 1,
  loc_added_sum: locAdded,
  loc_deleted_sum: locDeleted,
  loc_suggested_to_add_sum: locAdded,
  loc_suggested_to_delete_sum: locDeleted,
});

describe('surface productivity aggregation', () => {
  it('preserves explicit zero rows for every surface and cohort', () => {
    expect(
      finalizeSurfaceProductivityAggregation(
        createSurfaceProductivityAggregationAccumulator()
      )
    ).toEqual({
      totalActiveUsers: 0,
      surfaceSummaries: [
        expect.objectContaining({ surface: 'ide', uniqueUsers: 0 }),
        expect.objectContaining({ surface: 'cli', uniqueUsers: 0 }),
        expect.objectContaining({ surface: 'copilotApp', uniqueUsers: 0 }),
      ],
      dailyProductivity: [],
      cohortSummaries: [
        expect.objectContaining({ cohort: 'ideOnly', users: 0 }),
        expect.objectContaining({ cohort: 'cliOnly', users: 0 }),
        expect.objectContaining({ cohort: 'copilotAppOnly', users: 0 }),
        expect.objectContaining({ cohort: 'multiSurface', users: 0 }),
      ],
    });
  });

  it('separates surface reach, active user-days, attributed LOC, and overlap cohorts', () => {
    const accumulator = createSurfaceProductivityAggregationAccumulator();
    const records = [
      makeMetric({
        day: '2024-01-15',
        user_id: 1,
        loc_added_sum: 60,
        loc_deleted_sum: 7,
        used_cli: true,
        totals_by_ide: [ideTotal(40, 5)],
        totals_by_feature: [featureTotal('copilot_cli', 20, 2)],
      }),
      makeMetric({
        day: '2024-01-16',
        user_id: 1,
        loc_added_sum: 50,
        loc_deleted_sum: 5,
        totals_by_ide: [ideTotal(50, 5)],
      }),
      makeMetric({
        day: '2024-01-15',
        user_id: 2,
        loc_added_sum: 30,
        loc_deleted_sum: 3,
        used_copilot_app: true,
        totals_by_feature: [featureTotal('copilot_app', 30, 3)],
      }),
      makeMetric({
        day: '2024-01-16',
        user_id: 3,
        used_cli: true,
      }),
      makeMetric({
        day: '2024-01-17',
        user_id: 4,
      }),
    ];

    for (const record of records) {
      accumulateSurfaceProductivityAggregation(accumulator, record);
    }

    const result = finalizeSurfaceProductivityAggregation(accumulator);

    expect(result.totalActiveUsers).toBe(3);
    expect(result.dailyProductivity).toHaveLength(2);
    expect(result.surfaceSummaries).toEqual([
      {
        surface: 'ide',
        uniqueUsers: 1,
        reachPercentage: 33.3,
        activeUserDays: 2,
        activeDaysPerUser: 2,
        locAdded: 90,
        locDeleted: 10,
        netLocImpact: 80,
        netLocPerActiveDay: 40,
      },
      {
        surface: 'cli',
        uniqueUsers: 2,
        reachPercentage: 66.7,
        activeUserDays: 2,
        activeDaysPerUser: 1,
        locAdded: 20,
        locDeleted: 2,
        netLocImpact: 18,
        netLocPerActiveDay: 9,
      },
      {
        surface: 'copilotApp',
        uniqueUsers: 1,
        reachPercentage: 33.3,
        activeUserDays: 1,
        activeDaysPerUser: 1,
        locAdded: 30,
        locDeleted: 3,
        netLocImpact: 27,
        netLocPerActiveDay: 27,
      },
    ]);
    expect(result.dailyProductivity).toEqual([
      expect.objectContaining({
        date: '2024-01-15',
        surfaces: expect.objectContaining({
          ide: expect.objectContaining({ activeUsers: 1, netLocImpact: 35 }),
          cli: expect.objectContaining({ activeUsers: 1, netLocImpact: 18 }),
          copilotApp: expect.objectContaining({
            activeUsers: 1,
            netLocImpact: 27,
          }),
        }),
      }),
      expect.objectContaining({
        date: '2024-01-16',
        surfaces: expect.objectContaining({
          ide: expect.objectContaining({ activeUsers: 1, netLocImpact: 45 }),
          cli: expect.objectContaining({ activeUsers: 1, netLocImpact: 0 }),
          copilotApp: expect.objectContaining({
            activeUsers: 0,
            netLocImpact: 0,
          }),
        }),
      }),
    ]);
    expect(result.cohortSummaries).toEqual([
      {
        cohort: 'ideOnly',
        users: 0,
        medianActiveDays: 0,
        medianNetLocImpact: 0,
      },
      {
        cohort: 'cliOnly',
        users: 1,
        medianActiveDays: 1,
        medianNetLocImpact: 0,
      },
      {
        cohort: 'copilotAppOnly',
        users: 1,
        medianActiveDays: 1,
        medianNetLocImpact: 27,
      },
      {
        cohort: 'multiSurface',
        users: 1,
        medianActiveDays: 2,
        medianNetLocImpact: 98,
      },
    ]);
  });
});
