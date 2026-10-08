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
        generationsPerUser: 6,
        generationShare: 1,
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
  it('selects only the language slice', () => {
    const metrics = makeLanguageMetrics();

    expect(selectLanguagesReadModel(metrics)).toEqual(metrics.languages);
  });

  it('does not mutate the aggregate input', () => {
    const metrics = makeLanguageMetrics();
    const before = structuredClone(metrics);

    selectLanguagesReadModel(metrics);

    expect(metrics).toEqual(before);
  });
});
