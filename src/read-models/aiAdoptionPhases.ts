import type { AggregatedMetrics } from '../types/aggregatedMetrics';

export interface AiAdoptionPhaseReadModel {
  aiAdoptionPhaseData: AggregatedMetrics['aiAdoptionPhaseData'];
}

export function selectAiAdoptionPhaseReadModel(
  metrics: AggregatedMetrics
): AiAdoptionPhaseReadModel {
  return {
    aiAdoptionPhaseData: metrics.aiAdoptionPhaseData,
  };
}
