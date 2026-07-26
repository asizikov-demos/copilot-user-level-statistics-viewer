import { describe, expect, it } from 'vitest';
import { makeAggregatedMetrics } from '../../__tests__/factories/aggregatedMetrics';
import type { AggregatedMetrics } from '../../types/aggregatedMetrics';
import { selectLanguagesReadModel } from '../languages';

function makeLanguageMetrics(): AggregatedMetrics {
  return makeAggregatedMetrics({
    languages: {
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
    },
  });
}

describe('languages read model', () => {
  it('selects the exact language shape and preserves every reference', () => {
    const metrics = makeLanguageMetrics();

    const model = selectLanguagesReadModel(metrics);

    expect(model).toEqual({
      languageStats: metrics.languages.languageStats,
      languageFeatureImpactData: metrics.languages.languageFeatureImpactData,
      dailyLanguageGenerationsData: metrics.languages.dailyLanguageGenerationsData,
      dailyLanguageLocData: metrics.languages.dailyLanguageLocData,
    });
    expect(model.languageStats).toBe(metrics.languages.languageStats);
    expect(model.languageFeatureImpactData).toBe(metrics.languages.languageFeatureImpactData);
    expect(model.dailyLanguageGenerationsData).toBe(metrics.languages.dailyLanguageGenerationsData);
    expect(model.dailyLanguageLocData).toBe(metrics.languages.dailyLanguageLocData);
    expect(model.languageStats[0]).toBe(metrics.languages.languageStats[0]);
    expect(model.languageFeatureImpactData.features).toBe(
      metrics.languages.languageFeatureImpactData.features
    );
    expect(model.languageFeatureImpactData.rows).toBe(
      metrics.languages.languageFeatureImpactData.rows
    );
    expect(model.languageFeatureImpactData.rows[0]).toBe(
      metrics.languages.languageFeatureImpactData.rows[0]
    );
    expect(model.languageFeatureImpactData.rows[0].features).toBe(
      metrics.languages.languageFeatureImpactData.rows[0].features
    );
    expect(model.dailyLanguageGenerationsData.dates).toBe(
      metrics.languages.dailyLanguageGenerationsData.dates
    );
    expect(model.dailyLanguageGenerationsData.languages).toBe(
      metrics.languages.dailyLanguageGenerationsData.languages
    );
    expect(model.dailyLanguageGenerationsData.data).toBe(
      metrics.languages.dailyLanguageGenerationsData.data
    );
    expect(model.dailyLanguageGenerationsData.data['2026-01-15']).toBe(
      metrics.languages.dailyLanguageGenerationsData.data['2026-01-15']
    );
    expect(model.dailyLanguageGenerationsData.totals).toBe(
      metrics.languages.dailyLanguageGenerationsData.totals
    );
    expect(model.dailyLanguageLocData.dates).toBe(
      metrics.languages.dailyLanguageLocData.dates
    );
    expect(model.dailyLanguageLocData.languages).toBe(
      metrics.languages.dailyLanguageLocData.languages
    );
    expect(model.dailyLanguageLocData.data).toBe(
      metrics.languages.dailyLanguageLocData.data
    );
    expect(model.dailyLanguageLocData.data['2026-01-15']).toBe(
      metrics.languages.dailyLanguageLocData.data['2026-01-15']
    );
    expect(model.dailyLanguageLocData.totals).toBe(
      metrics.languages.dailyLanguageLocData.totals
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

    expect(model.languageStats).toBe(metrics.languages.languageStats);
    expect(model.languageFeatureImpactData).toBe(metrics.languages.languageFeatureImpactData);
    expect(model.dailyLanguageGenerationsData).toBe(metrics.languages.dailyLanguageGenerationsData);
    expect(model.dailyLanguageLocData).toBe(metrics.languages.dailyLanguageLocData);
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
