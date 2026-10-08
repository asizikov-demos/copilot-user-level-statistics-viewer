import { describe, expect, it } from 'vitest';
import { selectCliAdoptionReadModel } from '../cliAdoption';
import { makeCliMetrics, makeModelsCliMetrics } from './helpers/modelsCliFixtures';

describe('selectCliAdoptionReadModel', () => {
  it('selects report stats, CLI series and CLI model entries', () => {
    const metrics = makeCliMetrics();

    expect(selectCliAdoptionReadModel(metrics)).toEqual({
      stats: metrics.overview.stats,
      dailyCliSessionData: metrics.cli.dailyCliSessionData,
      dailyCliTokenData: metrics.cli.dailyCliTokenData,
      dailyCliAdoptionTrend: metrics.cli.dailyCliAdoptionTrend,
      cliModelEntries: metrics.models.modelBreakdownData.cliModels,
      cliModelDates: ['2026-01-16', '2026-01-15'],
      cliModelTotal: 6,
      cliShare: 33.3,
    });
  });

  it('falls back to model dates only when CLI sessions are empty', () => {
    const metrics = makeModelsCliMetrics({
      cli: { dailyCliSessionData: [] },
      modelBreakdown: { dates: ['2026-02-01', '2026-02-02'] },
    });

    expect(selectCliAdoptionReadModel(metrics).cliModelDates).toEqual(['2026-02-01', '2026-02-02']);
  });

  it.each([
    { uniqueUsers: 0, cliUsers: 8, cliTotal: undefined, expectedTotal: 0, expectedShare: 0 },
    { uniqueUsers: 3, cliUsers: -1, cliTotal: -4.5, expectedTotal: -4.5, expectedShare: -33.3 },
  ])(
    'derives CLI total $expectedTotal and share $expectedShare without replacing defined values',
    ({ uniqueUsers, cliUsers, cliTotal, expectedTotal, expectedShare }) => {
      const model = selectCliAdoptionReadModel(makeModelsCliMetrics({
        stats: { uniqueUsers, cliUsers },
        modelBreakdown: { cliModels: undefined, cliTotal },
      }));

      expect(model).toMatchObject({ cliModelEntries: [], cliModelTotal: expectedTotal, cliShare: expectedShare });
    },
  );

  it('does not mutate the aggregate input', () => {
    const metrics = makeCliMetrics();
    const before = structuredClone(metrics);

    selectCliAdoptionReadModel(metrics);

    expect(metrics).toEqual(before);
  });
});
