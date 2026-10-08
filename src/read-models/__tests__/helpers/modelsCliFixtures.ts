import { makeAggregatedMetrics } from '../../../__tests__/factories/aggregatedMetrics';
import type { AggregatedMetrics } from '../../../types/aggregatedMetrics';
import type { ModelBreakdownData, ModelDailyUsageEntry } from '../../../types/metrics';

type StatsOverrides = Partial<AggregatedMetrics['overview']['stats']>;

export function makeModelEntry(model: string, total: number, date = '2026-01-15'): ModelDailyUsageEntry {
  return { model, total, dailyData: { [date]: total }, users: 1 };
}

export function makeModelsCliMetrics({
  stats = {},
  modelBreakdown = {},
  cli = {},
}: {
  stats?: StatsOverrides;
  modelBreakdown?: Partial<ModelBreakdownData>;
  cli?: Partial<AggregatedMetrics['cli']>;
} = {}): AggregatedMetrics {
  const defaults = makeAggregatedMetrics();
  return makeAggregatedMetrics({
    overview: { stats: { ...defaults.overview.stats, ...stats } },
    models: { modelBreakdownData: { ...defaults.models.modelBreakdownData, ...modelBreakdown } },
    cli,
  });
}

export function makeModelMetrics(): AggregatedMetrics {
  return makeModelsCliMetrics({
    modelBreakdown: {
      allModels: [makeModelEntry('gpt-5', 11)],
      modelCategories: [{ category: 'Powerful', total: 11, dailyData: { '2026-01-15': 11 }, users: 1 }],
      modelVendors: [{ vendor: 'OpenAI', total: 11, dailyData: { '2026-01-15': 11 }, users: 1 }],
      autoModels: [makeModelEntry('auto', 4.5), makeModelEntry('auto-secondary', -1.25, '2026-01-16')],
      cliModels: [makeModelEntry('gpt-5', 99)],
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
    },
  });
}

export function makeCliMetrics(): AggregatedMetrics {
  return makeModelsCliMetrics({
    stats: { uniqueUsers: 9, cliUsers: 3, reportStartDay: '2026-01-01', reportEndDay: '2026-01-31' },
    cli: {
      dailyCliSessionData: [
        { date: '2026-01-16', sessionCount: 2, requestCount: 4, promptCount: 3, uniqueUsers: 2 },
        { date: '2026-01-15', sessionCount: 1, requestCount: 2, promptCount: 1, uniqueUsers: 1 },
      ],
      dailyCliTokenData: [{ date: '2026-01-15', outputTokens: 100, promptTokens: 50, requestCount: 2 }],
      dailyCliAdoptionTrend: [{
        date: '2026-01-15',
        newUsers: 1,
        returningUsers: 0,
        totalActiveUsers: 1,
        cumulativeUsers: 1,
      }],
    },
    modelBreakdown: {
      cliModels: [makeModelEntry('gpt-5', 6)],
      dates: ['fallback-model-date'],
      cliTotal: 6,
    },
  });
}
