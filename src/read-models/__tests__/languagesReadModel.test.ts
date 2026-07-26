import { describe, expect, it } from 'vitest';
import { makeAggregatedMetrics } from '../../__tests__/factories/aggregatedMetrics';
import type { AggregatedMetrics } from '../../types/aggregatedMetrics';
import { selectLanguagesReadModel } from '../languages';

function makeLanguageMetrics(): AggregatedMetrics {
  return makeAggregatedMetrics({
    languageStats: [{
      language: 'typescript',
      totalGenerations: 12,
      totalAcceptances: 6,
      totalEngagements: 18,
      uniqueUsers: 2,
      locAdded: 24,
      locDeleted: 4,
      locSuggestedToAdd: 30,
      locSuggestedToDelete: 5,
    }],
    languageFeatureImpactData: {
      features: ['code_completion'],
      rows: [{
        language: 'typescript',
        total: 28,
        features: { code_completion: 28 },
      }],
    },
    dailyLanguageGenerationsData: {
      dates: ['2026-01-15'],
      languages: ['typescript'],
      data: { '2026-01-15': { typescript: 12 } },
      totals: { typescript: 12 },
    },
    dailyLanguageLocData: {
      dates: ['2026-01-15'],
      languages: ['typescript'],
      data: { '2026-01-15': { typescript: 28 } },
      totals: { typescript: 28 },
    },
  });
}

describe('languages read model', () => {
  it('selects the exact language shape and preserves every reference', () => {
    const metrics = makeLanguageMetrics();

    const model = selectLanguagesReadModel(metrics);

    expect(model).toEqual({
      languageStats: metrics.languageStats,
      languageFeatureImpactData: metrics.languageFeatureImpactData,
      dailyLanguageGenerationsData: metrics.dailyLanguageGenerationsData,
      dailyLanguageLocData: metrics.dailyLanguageLocData,
    });
    expect(model.languageStats).toBe(metrics.languageStats);
    expect(model.languageFeatureImpactData).toBe(metrics.languageFeatureImpactData);
    expect(model.dailyLanguageGenerationsData).toBe(metrics.dailyLanguageGenerationsData);
    expect(model.dailyLanguageLocData).toBe(metrics.dailyLanguageLocData);
    expect(model.languageStats[0]).toBe(metrics.languageStats[0]);
    expect(model.languageFeatureImpactData.features).toBe(
      metrics.languageFeatureImpactData.features
    );
    expect(model.languageFeatureImpactData.rows).toBe(
      metrics.languageFeatureImpactData.rows
    );
    expect(model.languageFeatureImpactData.rows[0]).toBe(
      metrics.languageFeatureImpactData.rows[0]
    );
    expect(model.languageFeatureImpactData.rows[0].features).toBe(
      metrics.languageFeatureImpactData.rows[0].features
    );
    expect(model.dailyLanguageGenerationsData.dates).toBe(
      metrics.dailyLanguageGenerationsData.dates
    );
    expect(model.dailyLanguageGenerationsData.languages).toBe(
      metrics.dailyLanguageGenerationsData.languages
    );
    expect(model.dailyLanguageGenerationsData.data).toBe(
      metrics.dailyLanguageGenerationsData.data
    );
    expect(model.dailyLanguageGenerationsData.data['2026-01-15']).toBe(
      metrics.dailyLanguageGenerationsData.data['2026-01-15']
    );
    expect(model.dailyLanguageGenerationsData.totals).toBe(
      metrics.dailyLanguageGenerationsData.totals
    );
    expect(model.dailyLanguageLocData.dates).toBe(
      metrics.dailyLanguageLocData.dates
    );
    expect(model.dailyLanguageLocData.languages).toBe(
      metrics.dailyLanguageLocData.languages
    );
    expect(model.dailyLanguageLocData.data).toBe(
      metrics.dailyLanguageLocData.data
    );
    expect(model.dailyLanguageLocData.data['2026-01-15']).toBe(
      metrics.dailyLanguageLocData.data['2026-01-15']
    );
    expect(model.dailyLanguageLocData.totals).toBe(
      metrics.dailyLanguageLocData.totals
    );
    expect(Object.keys(model)).toEqual([
      'languageStats',
      'languageFeatureImpactData',
      'dailyLanguageGenerationsData',
      'dailyLanguageLocData',
    ]);
    expect(model).not.toHaveProperty('stats');
    expect(model).not.toHaveProperty('userSummaries');
    expect(model).not.toHaveProperty('modelBreakdownData');
  });

  it('preserves canonical empty language data', () => {
    const metrics = makeAggregatedMetrics();

    const model = selectLanguagesReadModel(metrics);

    expect(model.languageStats).toBe(metrics.languageStats);
    expect(model.languageFeatureImpactData).toBe(metrics.languageFeatureImpactData);
    expect(model.dailyLanguageGenerationsData).toBe(metrics.dailyLanguageGenerationsData);
    expect(model.dailyLanguageLocData).toBe(metrics.dailyLanguageLocData);
    expect(model).toEqual({
      languageStats: [],
      languageFeatureImpactData: {
        features: [],
        rows: [],
      },
      dailyLanguageGenerationsData: {
        dates: [],
        languages: [],
        data: {},
        totals: {},
      },
      dailyLanguageLocData: {
        dates: [],
        languages: [],
        data: {},
        totals: {},
      },
    });
  });

  it('does not mutate the aggregate input', () => {
    const metrics = makeLanguageMetrics();
    const before = structuredClone(metrics);

    selectLanguagesReadModel(metrics);

    expect(metrics).toEqual(before);
  });
});
