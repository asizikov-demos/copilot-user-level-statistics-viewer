import { describe, expect, it } from 'vitest';
import { selectModelDetailsReadModel } from '../models';
import { makeModelEntry, makeModelMetrics, makeModelsCliMetrics } from './helpers/modelsCliFixtures';

describe('selectModelDetailsReadModel', () => {
  it('selects model breakdown series without CLI-only fields', () => {
    const metrics = makeModelMetrics();
    const breakdown = metrics.models.modelBreakdownData;

    expect(selectModelDetailsReadModel(metrics)).toEqual({
      allModels: breakdown.allModels,
      modelCategories: breakdown.modelCategories,
      modelVendors: breakdown.modelVendors,
      autoModels: breakdown.autoModels,
      autoModeAdoptionTrend: breakdown.autoModeAdoptionTrend,
      dates: breakdown.dates,
      modelTotal: 11,
      autoTotal: expect.any(Number),
      categoryTables: expect.any(Array),
      vendorTables: expect.any(Array),
      localByokUsage: metrics.models.localByokUsage,
      selectionModeRequests: metrics.models.selectionModeRequests,
      reportStartDay: metrics.overview.stats.reportStartDay,
      reportEndDay: metrics.overview.stats.reportEndDay,
    });
  });

  it('sums signed auto model totals', () => {
    expect(selectModelDetailsReadModel(makeModelMetrics()).autoTotal).toBe(3.25);
  });

  it('includes image models in category tables with canonical names and shares', () => {
    const { categoryTables } = selectModelDetailsReadModel(makeModelsCliMetrics({
      modelBreakdown: {
        allModels: [makeModelEntry('gpt-image-2.5-flare', 3), makeModelEntry('gemini-4-carbon', 1)],
        modelCategories: [
          { category: 'Powerful', total: 1, dailyData: {}, users: 1 },
          { category: 'Image Generation', total: 3, dailyData: {}, users: 1 },
        ],
        modelTotal: 4,
      },
    }));

    expect(categoryTables.map(table => table.category)).toEqual(['Powerful', 'Image Generation']);
    expect(categoryTables[1]).toMatchObject({
      users: 1, interactions: 3, sharePercentage: 75,
      rows: [{ model: 'gpt-image-2.5-flare', displayName: 'GPT Image 2.5 Flare', interactions: 3, sharePercentage: 75 }],
    });
  });

  it('groups models into category and vendor tables with their share of the model total', () => {
    const row = { model: 'gpt-5', displayName: 'GPT-5', interactions: 11, sharePercentage: 100, users: 1 };

    const { categoryTables, vendorTables } = selectModelDetailsReadModel(makeModelMetrics());

    expect(categoryTables).toEqual([
      { category: 'Powerful', users: 1, interactions: 11, sharePercentage: 100, rows: [row] },
    ]);
    expect(vendorTables).toEqual([
      { vendor: 'OpenAI', users: 1, interactions: 11, sharePercentage: 100, rows: [row] },
    ]);
  });

  it.each([
    ['empty', {}],
    ['missing optional', { autoModels: undefined, autoModeAdoptionTrend: undefined }],
  ])('returns empty derived data for %s model arrays', (_case, modelBreakdown) => {
    expect(selectModelDetailsReadModel(makeModelsCliMetrics({ modelBreakdown }))).toMatchObject({
      autoModels: [],
      autoModeAdoptionTrend: [],
      autoTotal: 0,
      categoryTables: [],
      vendorTables: [],
    });
  });

  it('reports zero share when the model total is zero', () => {
    const { categoryTables } = selectModelDetailsReadModel(makeModelsCliMetrics({
      modelBreakdown: { allModels: [makeModelEntry('gpt-5', 0)], modelTotal: 0 },
    }));

    expect(categoryTables[0]).toMatchObject({ sharePercentage: 0, rows: [{ sharePercentage: 0 }] });
  });

  it('does not mutate the aggregate input', () => {
    const metrics = makeModelMetrics();
    const before = structuredClone(metrics);

    selectModelDetailsReadModel(metrics);

    expect(metrics).toEqual(before);
  });
});
