import type { AggregatedMetrics } from '../types/aggregatedMetrics';

export interface CopilotImpactReadModel {
  agentImpactData: AggregatedMetrics['impact']['agentImpactData'];
  codeCompletionImpactData: AggregatedMetrics['impact']['codeCompletionImpactData'];
  editModeImpactData: AggregatedMetrics['impact']['editModeImpactData'];
  inlineModeImpactData: AggregatedMetrics['impact']['inlineModeImpactData'];
  askModeImpactData: AggregatedMetrics['impact']['askModeImpactData'];
  cliImpactData: AggregatedMetrics['impact']['cliImpactData'];
  joinedImpactData: AggregatedMetrics['impact']['joinedImpactData'];
}

export function selectCopilotImpactReadModel(
  metrics: AggregatedMetrics
): CopilotImpactReadModel {
  return {
    agentImpactData: metrics.impact.agentImpactData,
    codeCompletionImpactData: metrics.impact.codeCompletionImpactData,
    editModeImpactData: metrics.impact.editModeImpactData,
    inlineModeImpactData: metrics.impact.inlineModeImpactData,
    askModeImpactData: metrics.impact.askModeImpactData,
    cliImpactData: metrics.impact.cliImpactData,
    joinedImpactData: metrics.impact.joinedImpactData,
  };
}
