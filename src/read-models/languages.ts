import type { AggregatedMetrics } from '../types/aggregatedMetrics';

export interface LanguagesReadModel {
  languageStats: AggregatedMetrics['languageStats'];
  languageFeatureImpactData: AggregatedMetrics['languageFeatureImpactData'];
  dailyLanguageGenerationsData: AggregatedMetrics['dailyLanguageGenerationsData'];
  dailyLanguageLocData: AggregatedMetrics['dailyLanguageLocData'];
}

export function selectLanguagesReadModel(
  metrics: AggregatedMetrics
): LanguagesReadModel {
  return {
    languageStats: metrics.languageStats,
    languageFeatureImpactData: metrics.languageFeatureImpactData,
    dailyLanguageGenerationsData: metrics.dailyLanguageGenerationsData,
    dailyLanguageLocData: metrics.dailyLanguageLocData,
  };
}
