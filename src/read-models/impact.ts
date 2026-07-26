import type { AggregatedMetrics } from '../types/aggregatedMetrics';

export interface CopilotImpactReadModel {
  agentImpactData: AggregatedMetrics['agentImpactData'];
  codeCompletionImpactData: AggregatedMetrics['codeCompletionImpactData'];
  editModeImpactData: AggregatedMetrics['editModeImpactData'];
  inlineModeImpactData: AggregatedMetrics['inlineModeImpactData'];
  askModeImpactData: AggregatedMetrics['askModeImpactData'];
  cliImpactData: AggregatedMetrics['cliImpactData'];
  joinedImpactData: AggregatedMetrics['joinedImpactData'];
}

export function selectCopilotImpactReadModel(
  metrics: AggregatedMetrics
): CopilotImpactReadModel {
  return {
    agentImpactData: metrics.agentImpactData,
    codeCompletionImpactData: metrics.codeCompletionImpactData,
    editModeImpactData: metrics.editModeImpactData,
    inlineModeImpactData: metrics.inlineModeImpactData,
    askModeImpactData: metrics.askModeImpactData,
    cliImpactData: metrics.cliImpactData,
    joinedImpactData: metrics.joinedImpactData,
  };
}
