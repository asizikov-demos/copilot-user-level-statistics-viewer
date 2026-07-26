import type { AggregatedMetrics } from '../types/aggregatedMetrics';

export interface LanguagesReadModel {
  languageStats: AggregatedMetrics['languages']['languageStats'];
  languageFeatureImpactData: AggregatedMetrics['languages']['languageFeatureImpactData'];
  dailyLanguageGenerationsData: AggregatedMetrics['languages']['dailyLanguageGenerationsData'];
  dailyLanguageLocData: AggregatedMetrics['languages']['dailyLanguageLocData'];
}

export function selectLanguagesReadModel(
  metrics: AggregatedMetrics
): LanguagesReadModel {
  return {
    languageStats: metrics.languages.languageStats,
    languageFeatureImpactData: metrics.languages.languageFeatureImpactData,
    dailyLanguageGenerationsData: metrics.languages.dailyLanguageGenerationsData,
    dailyLanguageLocData: metrics.languages.dailyLanguageLocData,
  };
}
