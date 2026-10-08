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
    });
  });

  it('sums signed auto model totals', () => {
    expect(selectModelDetailsReadModel(makeModelMetrics()).autoTotal).toBe(3.25);
  });

  it('groups models into category and vendor tables with their share of the model total', () => {
    const row = { model: 'gpt-5', displayName: 'Gpt 5', interactions: 11, sharePercentage: 100, users: 1 };

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
