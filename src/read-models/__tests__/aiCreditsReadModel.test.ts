import { describe, expect, it, vi } from 'vitest';
import {
  makeAggregatedMetrics,
  makeUserSummary,
} from '../../__tests__/factories/aggregatedMetrics';
import type { AggregatedMetrics } from '../../types/aggregatedMetrics';
import { selectAiCreditsReadModel } from '../aiCredits';

function makeAiCreditsMetrics(): AggregatedMetrics {
  const defaults = makeAggregatedMetrics();

  return makeAggregatedMetrics({
    overview: {
      stats: {
        ...defaults.overview.stats,
        reportStartDay: '2026-01-15',
        reportEndDay: '2026-01-17',
      },
    },
    users: {
      userSummaries: [
        makeUserSummary({
          user_login: 'fractional',
          user_id: 1,
          total_ai_credits_used: 2.5,
        }),
        makeUserSummary({
          user_login: 'signed',
          user_id: 2,
          total_ai_credits_used: -0.25,
        }),
      ],
    },
    ai: {
      dailyAiCreditsData: [
        { date: '2026-01-17', aiCreditsUsed: -0.25, users: 1 },
        { date: '2026-01-15', aiCreditsUsed: 2.5, users: 2 },
      ],
      usageDistributionData: [{
        id: 'power',
        label: 'Power Users',
        description: 'Top users',
        userCount: 1,
        totalAiCreditsUsed: 2.5,
        avgAiCreditsUsed: 2.5,
        avgDaysActive: 1.5,
        totalLocAdded: 10,
        totalLocDeleted: 2,
        avgLocAdded: 10,
        avgLocDeleted: 2,
        topModels: [{ name: 'gpt-5', total: 4, uniqueUsers: 1 }],
        topClients: [{ name: 'vscode', total: 3, uniqueUsers: 1 }],
      }],
    },
  });
}

describe('AI Credits read model', () => {
  it('selects the exact shape and preserves every projected source reference', () => {
    const metrics = makeAiCreditsMetrics();
    const onUserClick = vi.fn();

    const model = selectAiCreditsReadModel(metrics, onUserClick);

    expect(model).toEqual({
      reportStartDay: '2026-01-15',
      reportEndDay: '2026-01-17',
      dailyAiCreditsData: metrics.ai.dailyAiCreditsData,
      userSummaries: metrics.users.userSummaries,
      usageDistributionData: metrics.ai.usageDistributionData,
      totalAiCreditsUsed: 2.25,
      onUserClick,
    });
    expect(model.dailyAiCreditsData).toBe(metrics.ai.dailyAiCreditsData);
    expect(model.dailyAiCreditsData[0]).toBe(metrics.ai.dailyAiCreditsData[0]);
    expect(model.userSummaries).toBe(metrics.users.userSummaries);
    expect(model.userSummaries[0]).toBe(metrics.users.userSummaries[0]);
    expect(model.usageDistributionData).toBe(metrics.ai.usageDistributionData);
    expect(model.usageDistributionData[0]).toBe(
      metrics.ai.usageDistributionData[0]
    );
    expect(model.usageDistributionData[0].topModels).toBe(
      metrics.ai.usageDistributionData[0].topModels
    );
    expect(model.usageDistributionData[0].topModels[0]).toBe(
      metrics.ai.usageDistributionData[0].topModels[0]
    );
    expect(model.usageDistributionData[0].topClients).toBe(
      metrics.ai.usageDistributionData[0].topClients
    );
    expect(model.usageDistributionData[0].topClients[0]).toBe(
      metrics.ai.usageDistributionData[0].topClients[0]
    );
    expect(model.onUserClick).toBe(onUserClick);
    expect(Object.keys(model)).toEqual([
      'reportStartDay',
      'reportEndDay',
      'dailyAiCreditsData',
      'userSummaries',
      'usageDistributionData',
      'totalAiCreditsUsed',
      'onUserClick',
    ]);
    expect(model).not.toHaveProperty('stats');
    expect(model).not.toHaveProperty('modelBreakdownData');
    expect(model).not.toHaveProperty('aiAdoptionPhaseData');
  });

  it('preserves canonical empty inputs and their references', () => {
    const metrics = makeAggregatedMetrics();
    const onUserClick = vi.fn();

    const model = selectAiCreditsReadModel(metrics, onUserClick);

    expect(model).toEqual({
      reportStartDay: '',
      reportEndDay: '',
      dailyAiCreditsData: [],
      userSummaries: [],
      usageDistributionData: metrics.ai.usageDistributionData,
      totalAiCreditsUsed: 0,
      onUserClick,
    });
    expect(model.dailyAiCreditsData).toBe(metrics.ai.dailyAiCreditsData);
    expect(model.userSummaries).toBe(metrics.users.userSummaries);
    expect(model.usageDistributionData).toBe(metrics.ai.usageDistributionData);
  });

  it('keeps the existing runtime array fallbacks and date scalar semantics', () => {
    const metrics = makeAggregatedMetrics({
      overview: {
        stats: {
          ...makeAggregatedMetrics().overview.stats,
          reportStartDay: 'not-a-start-date',
          reportEndDay: 'not-an-end-date',
        },
      },
    });
    Reflect.set(metrics.ai, 'dailyAiCreditsData', undefined);
    Reflect.set(metrics.ai, 'usageDistributionData', undefined);

    const model = selectAiCreditsReadModel(metrics, vi.fn());

    expect(model.dailyAiCreditsData).toEqual([]);
    expect(model.usageDistributionData).toEqual([]);
    expect(model.reportStartDay).toBe('not-a-start-date');
    expect(model.reportEndDay).toBe('not-an-end-date');
  });

  it('keeps signed and fractional totals without rounding or clamping', () => {
    const metrics = makeAggregatedMetrics({
      users: {
        userSummaries: [
          makeUserSummary({ total_ai_credits_used: -4.75 }),
          makeUserSummary({ total_ai_credits_used: 1.125 }),
        ],
      },
    });

    const model = selectAiCreditsReadModel(metrics, vi.fn());

    expect(model.totalAiCreditsUsed).toBe(-3.625);
  });

  it('does not mutate the aggregate input', () => {
    const metrics = makeAiCreditsMetrics();
    const before = structuredClone(metrics);

    selectAiCreditsReadModel(metrics, vi.fn());

    expect(metrics).toEqual(before);
  });
});
