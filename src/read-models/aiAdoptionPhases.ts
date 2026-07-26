import type { AggregatedMetrics } from '../types/aggregatedMetrics';

export interface AiAdoptionPhaseReadModel {
  aiAdoptionPhaseData: AggregatedMetrics['ai']['aiAdoptionPhaseData'];
}

export function selectAiAdoptionPhaseReadModel(
  metrics: AggregatedMetrics
): AiAdoptionPhaseReadModel {
  return {
    aiAdoptionPhaseData: metrics.ai.aiAdoptionPhaseData,
  };
}
