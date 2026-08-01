import { describe, expect, it } from 'vitest';
import { makeAggregatedMetrics } from '../../__tests__/factories/aggregatedMetrics';
import type { AggregatedMetrics } from '../../types/aggregatedMetrics';
import { selectCliAdoptionReadModel } from '../cliAdoption';
import { selectModelDetailsReadModel } from '../models';

function makeModelMetrics(): AggregatedMetrics {
  return makeAggregatedMetrics({
    models: {
      modelBreakdownData: {
        allModels: [{
          model: 'gpt-5',
          total: 11,
          dailyData: { '2026-01-15': 11 },
          users: 1,
        }],
        modelCategories: [{
          category: 'Powerful',
          total: 11,
          dailyData: { '2026-01-15': 11 },
          users: 1,
        }],
        autoModels: [
          {
            model: 'auto',
            total: 4.5,
            dailyData: { '2026-01-15': 4.5 },
            users: 1,
          },
          {
            model: 'auto-secondary',
            total: -1.25,
            dailyData: { '2026-01-16': -1.25 },
            users: 1,
          },
        ],
        cliModels: [{
          model: 'gpt-5',
          total: 99,
          dailyData: { '2026-01-15': 99 },
          users: 1,
        }],
        autoModeAdoptionTrend: [{
          date: '2026-01-15',
          newUsers: 2,
          returningUsers: 1,
          totalActiveUsers: 3,
          cumulativeUsers: 4,
        }],
        dates: ['2026-01-15', '2026-01-16'],
        modelTotal: 11,
        cliTotal: 99,
        unknownTotal: 0,
      },
    },
  });
}

function makeCliMetrics(): AggregatedMetrics {
  const defaults = makeAggregatedMetrics();

  return makeAggregatedMetrics({
    overview: {
      stats: {
        ...defaults.overview.stats,
        uniqueUsers: 9,
        cliUsers: 3,
        reportStartDay: '2026-01-01',
        reportEndDay: '2026-01-31',
      },
    },
    cli: {
      dailyCliSessionData: [
        {
          date: '2026-01-16',
          sessionCount: 2,
          requestCount: 4,
          promptCount: 3,
          uniqueUsers: 2,
        },
        {
          date: '2026-01-15',
          sessionCount: 1,
          requestCount: 2,
          promptCount: 1,
          uniqueUsers: 1,
        },
      ],
      dailyCliTokenData: [{
        date: '2026-01-15',
        outputTokens: 100,
        promptTokens: 50,
        requestCount: 2,
      }],
      dailyCliAdoptionTrend: [{
        date: '2026-01-15',
        newUsers: 1,
        returningUsers: 0,
        totalActiveUsers: 1,
        cumulativeUsers: 1,
      }],
    },
    models: {
      modelBreakdownData: {
        ...defaults.models.modelBreakdownData,
        cliModels: [{
          model: 'gpt-5',
          total: 6,
          dailyData: { '2026-01-15': 6 },
          users: 1,
        }],
        dates: ['fallback-model-date'],
        cliTotal: 6,
      },
    },
  });
}

describe('model details read model', () => {
  it('selects the exact shape, preserves references, and relocates the additive auto total', () => {
    const metrics = makeModelMetrics();

    const model = selectModelDetailsReadModel(metrics);

    expect(model).toEqual({
      allModels: metrics.models.modelBreakdownData.allModels,
      modelCategories: metrics.models.modelBreakdownData.modelCategories,
      autoModels: metrics.models.modelBreakdownData.autoModels,
      autoModeAdoptionTrend: metrics.models.modelBreakdownData.autoModeAdoptionTrend,
      dates: metrics.models.modelBreakdownData.dates,
      modelTotal: 11,
      autoTotal: 3.25,
      categoryTables: [{
        category: 'Powerful',
        users: 1,
        interactions: 11,
        sharePercentage: 100,
        rows: [{
          model: 'gpt-5',
          displayName: 'Gpt 5',
          interactions: 11,
          sharePercentage: 100,
          users: 1,
        }],
      }],
    });
    expect(model.allModels).toBe(metrics.models.modelBreakdownData.allModels);
    expect(model.allModels[0]).toBe(metrics.models.modelBreakdownData.allModels[0]);
    expect(model.allModels[0].dailyData).toBe(
      metrics.models.modelBreakdownData.allModels[0].dailyData
    );
    expect(model.modelCategories).toBe(metrics.models.modelBreakdownData.modelCategories);
    expect(model.modelCategories[0]).toBe(
      metrics.models.modelBreakdownData.modelCategories[0]
    );
    expect(model.modelCategories[0].dailyData).toBe(
      metrics.models.modelBreakdownData.modelCategories[0].dailyData
    );
    expect(model.autoModels).toBe(metrics.models.modelBreakdownData.autoModels);
    expect(model.autoModels[0]).toBe(metrics.models.modelBreakdownData.autoModels?.[0]);
    expect(model.autoModels[0].dailyData).toBe(
      metrics.models.modelBreakdownData.autoModels?.[0].dailyData
    );
    expect(model.autoModeAdoptionTrend).toBe(
      metrics.models.modelBreakdownData.autoModeAdoptionTrend
    );
    expect(model.autoModeAdoptionTrend[0]).toBe(
      metrics.models.modelBreakdownData.autoModeAdoptionTrend?.[0]
    );
    expect(model.dates).toBe(metrics.models.modelBreakdownData.dates);
    expect(Object.keys(model)).toEqual([
      'allModels',
      'modelCategories',
      'autoModels',
      'autoModeAdoptionTrend',
      'dates',
      'modelTotal',
      'autoTotal',
      'categoryTables',
    ]);
    expect(model).not.toHaveProperty('modelBreakdownData');
    expect(model).not.toHaveProperty('cliModels');
    expect(model).not.toHaveProperty('cliTotal');
    expect(model).not.toHaveProperty('stats');
  });

  it('preserves canonical empty model data and its references', () => {
    const metrics = makeAggregatedMetrics();

    const model = selectModelDetailsReadModel(metrics);

    expect(model).toEqual({
      allModels: [],
      modelCategories: [],
      autoModels: [],
      autoModeAdoptionTrend: [],
      dates: [],
      modelTotal: 0,
      autoTotal: 0,
      categoryTables: [],
    });
    expect(model.allModels).toBe(metrics.models.modelBreakdownData.allModels);
    expect(model.modelCategories).toBe(metrics.models.modelBreakdownData.modelCategories);
    expect(model.autoModels).toBe(metrics.models.modelBreakdownData.autoModels);
    expect(model.autoModeAdoptionTrend).toBe(
      metrics.models.modelBreakdownData.autoModeAdoptionTrend
    );
    expect(model.dates).toBe(metrics.models.modelBreakdownData.dates);
  });

  it('keeps the existing optional-array fallbacks', () => {
    const defaults = makeAggregatedMetrics();
    const metrics = makeAggregatedMetrics({
      models: {
        modelBreakdownData: {
          ...defaults.models.modelBreakdownData,
          autoModels: undefined,
          autoModeAdoptionTrend: undefined,
        },
      },
    });

    expect(selectModelDetailsReadModel(metrics)).toEqual({
      allModels: metrics.models.modelBreakdownData.allModels,
      modelCategories: metrics.models.modelBreakdownData.modelCategories,
      autoModels: [],
      autoModeAdoptionTrend: [],
      dates: metrics.models.modelBreakdownData.dates,
      modelTotal: 0,
      autoTotal: 0,
      categoryTables: [],
    });
  });

  it('does not mutate the aggregate input', () => {
    const metrics = makeModelMetrics();
    const before = structuredClone(metrics);

    selectModelDetailsReadModel(metrics);

    expect(metrics).toEqual(before);
  });
});

describe('CLI adoption read model', () => {
  it('selects the exact shape and preserves every projected source reference', () => {
    const metrics = makeCliMetrics();

    const model = selectCliAdoptionReadModel(metrics);

    expect(model).toEqual({
      stats: metrics.overview.stats,
      dailyCliSessionData: metrics.cli.dailyCliSessionData,
      dailyCliTokenData: metrics.cli.dailyCliTokenData,
      dailyCliAdoptionTrend: metrics.cli.dailyCliAdoptionTrend,
      cliModelEntries: metrics.models.modelBreakdownData.cliModels,
      cliModelDates: ['2026-01-16', '2026-01-15'],
      cliModelTotal: 6,
      cliShare: 33.3,
    });
    expect(model.stats).toBe(metrics.overview.stats);
    expect(model.stats.reportStartDay).toBe('2026-01-01');
    expect(model.stats.reportEndDay).toBe('2026-01-31');
    expect(model.dailyCliSessionData).toBe(metrics.cli.dailyCliSessionData);
    expect(model.dailyCliSessionData[0]).toBe(metrics.cli.dailyCliSessionData[0]);
    expect(model.dailyCliTokenData).toBe(metrics.cli.dailyCliTokenData);
    expect(model.dailyCliTokenData[0]).toBe(metrics.cli.dailyCliTokenData[0]);
    expect(model.dailyCliAdoptionTrend).toBe(metrics.cli.dailyCliAdoptionTrend);
    expect(model.dailyCliAdoptionTrend[0]).toBe(
      metrics.cli.dailyCliAdoptionTrend[0]
    );
    expect(model.cliModelEntries).toBe(metrics.models.modelBreakdownData.cliModels);
    expect(model.cliModelEntries[0]).toBe(
      metrics.models.modelBreakdownData.cliModels?.[0]
    );
    expect(model.cliModelEntries[0].dailyData).toBe(
      metrics.models.modelBreakdownData.cliModels?.[0].dailyData
    );
    expect(model.cliModelDates).not.toBe(metrics.models.modelBreakdownData.dates);
    expect(Object.keys(model)).toEqual([
      'stats',
      'dailyCliSessionData',
      'dailyCliTokenData',
      'dailyCliAdoptionTrend',
      'cliModelEntries',
      'cliModelDates',
      'cliModelTotal',
      'cliShare',
    ]);
    expect(model).not.toHaveProperty('modelBreakdownData');
    expect(model).not.toHaveProperty('userSummaries');
    expect(model).not.toHaveProperty('dailyAiCreditsData');
  });

  it('falls back to the model date reference only when CLI sessions are empty', () => {
    const defaults = makeAggregatedMetrics();
    const metrics = makeAggregatedMetrics({
      cli: { dailyCliSessionData: [] },
      models: {
        modelBreakdownData: {
          ...defaults.models.modelBreakdownData,
          dates: ['2026-02-01', '2026-02-02'],
        },
      },
    });

    const model = selectCliAdoptionReadModel(metrics);

    expect(model.cliModelDates).toBe(metrics.models.modelBreakdownData.dates);
    expect(model.cliModelDates).toEqual(['2026-02-01', '2026-02-02']);
  });

  it('keeps CLI model entry, total, and share fallback semantics', () => {
    const defaults = makeAggregatedMetrics();
    const metrics = makeAggregatedMetrics({
      overview: {
        stats: {
          ...defaults.overview.stats,
          uniqueUsers: 0,
          cliUsers: 8,
          reportStartDay: 'not-a-start-date',
          reportEndDay: 'not-an-end-date',
        },
      },
      models: {
        modelBreakdownData: {
          ...defaults.models.modelBreakdownData,
          cliModels: undefined,
          cliTotal: undefined,
        },
      },
    });

    const model = selectCliAdoptionReadModel(metrics);

    expect(model.cliModelEntries).toEqual([]);
    expect(model.cliModelDates).toBe(metrics.models.modelBreakdownData.dates);
    expect(model.cliModelTotal).toBe(0);
    expect(model.cliShare).toBe(0);
    expect(model.stats.reportStartDay).toBe('not-a-start-date');
    expect(model.stats.reportEndDay).toBe('not-an-end-date');
  });

  it('does not replace defined signed totals or alter the share calculation', () => {
    const defaults = makeAggregatedMetrics();
    const metrics = makeAggregatedMetrics({
      overview: {
        stats: {
          ...defaults.overview.stats,
          uniqueUsers: 3,
          cliUsers: -1,
        },
      },
      models: {
        modelBreakdownData: {
          ...defaults.models.modelBreakdownData,
          cliTotal: -4.5,
        },
      },
    });

    const model = selectCliAdoptionReadModel(metrics);

    expect(model.cliModelTotal).toBe(-4.5);
    expect(model.cliShare).toBe(-33.3);
  });

  it('preserves canonical empty CLI data and its references', () => {
    const metrics = makeAggregatedMetrics();

    const model = selectCliAdoptionReadModel(metrics);

    expect(model).toEqual({
      stats: metrics.overview.stats,
      dailyCliSessionData: [],
      dailyCliTokenData: [],
      dailyCliAdoptionTrend: [],
      cliModelEntries: [],
      cliModelDates: [],
      cliModelTotal: 0,
      cliShare: 0,
    });
    expect(model.stats).toBe(metrics.overview.stats);
    expect(model.dailyCliSessionData).toBe(metrics.cli.dailyCliSessionData);
    expect(model.dailyCliTokenData).toBe(metrics.cli.dailyCliTokenData);
    expect(model.dailyCliAdoptionTrend).toBe(metrics.cli.dailyCliAdoptionTrend);
    expect(model.cliModelEntries).toBe(metrics.models.modelBreakdownData.cliModels);
    expect(model.cliModelDates).toBe(metrics.models.modelBreakdownData.dates);
  });

  it('does not mutate the aggregate input', () => {
    const metrics = makeCliMetrics();
    const before = structuredClone(metrics);

    selectCliAdoptionReadModel(metrics);

    expect(metrics).toEqual(before);
  });
});
