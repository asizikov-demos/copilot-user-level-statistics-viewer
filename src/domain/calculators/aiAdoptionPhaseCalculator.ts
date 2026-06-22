import type { AIAdoptionPhase, CopilotMetrics } from '../../types/metrics';
import { classifyModelRequest } from '../modelConfig';

export interface AiAdoptionPhaseTopEntry {
  name: string;
  total: number;
  uniqueUsers: number;
}

export interface AiAdoptionPhaseData {
  phase: AIAdoptionPhase;
  userCount: number;
  avgUserInitiatedInteractions: number;
  totalLocAdded: number;
  totalLocDeleted: number;
  avgLocAdded: number;
  avgLocDeleted: number;
  avgAiCreditsUsed: number;
  avgDaysActive: number;
  topModels: AiAdoptionPhaseTopEntry[];
  topClients: AiAdoptionPhaseTopEntry[];
  topLanguages: AiAdoptionPhaseTopEntry[];
}

interface UserPhaseAccumulatorEntry {
  phase?: AIAdoptionPhase;
  latestPhaseDay?: string;
  totalUserInitiatedInteractions: number;
  totalLocAdded: number;
  totalLocDeleted: number;
  totalAiCreditsUsed: number;
  activeDays: Set<string>;
  models: Map<string, number>;
  clients: Map<string, number>;
  languages: Map<string, number>;
}

interface PhaseAccumulatorEntry {
  phase: AIAdoptionPhase;
  userCount: number;
  totalUserInitiatedInteractions: number;
  totalLocAdded: number;
  totalLocDeleted: number;
  totalAiCreditsUsed: number;
  totalDaysActive: number;
  models: Map<string, { total: number; uniqueUsers: number }>;
  clients: Map<string, { total: number; uniqueUsers: number }>;
  languages: Map<string, { total: number; uniqueUsers: number }>;
}

export interface AiAdoptionPhaseAccumulator {
  users: Map<number, UserPhaseAccumulatorEntry>;
}

const MISSING_PHASE: AIAdoptionPhase = {
  phase_number: -1,
  phase: 'N/A',
  version: 'unknown',
};

export function createAiAdoptionPhaseAccumulator(): AiAdoptionPhaseAccumulator {
  return {
    users: new Map(),
  };
}

function getOrCreateUserEntry(
  accumulator: AiAdoptionPhaseAccumulator,
  userId: number
): UserPhaseAccumulatorEntry {
  if (!accumulator.users.has(userId)) {
    accumulator.users.set(userId, {
      totalUserInitiatedInteractions: 0,
      totalLocAdded: 0,
      totalLocDeleted: 0,
      totalAiCreditsUsed: 0,
      activeDays: new Set(),
      models: new Map(),
      clients: new Map(),
      languages: new Map(),
    });
  }

  return accumulator.users.get(userId)!;
}

function addDimensionUsage(map: Map<string, number>, name: string | undefined, count: number): void {
  const normalizedName = name?.trim();
  if (!normalizedName || count <= 0) return;
  map.set(normalizedName, (map.get(normalizedName) ?? 0) + count);
}

function getActivityCount(item: {
  user_initiated_interaction_count?: number;
  code_generation_activity_count?: number;
  code_acceptance_activity_count?: number;
}): number {
  return (item.user_initiated_interaction_count ?? 0)
    + (item.code_generation_activity_count ?? 0)
    + (item.code_acceptance_activity_count ?? 0);
}

function getCliActivityCount(metric: CopilotMetrics): number {
  const cli = metric.totals_by_cli;
  if (!cli) return metric.used_cli ? 1 : 0;
  return cli.prompt_count ?? cli.request_count ?? cli.session_count ?? 0;
}

export function accumulateAiAdoptionPhase(
  accumulator: AiAdoptionPhaseAccumulator,
  metric: CopilotMetrics
): void {
  const entry = getOrCreateUserEntry(accumulator, metric.user_id);

  entry.totalUserInitiatedInteractions += metric.user_initiated_interaction_count;
  entry.totalLocAdded += metric.loc_added_sum;
  entry.totalLocDeleted += metric.loc_deleted_sum;
  entry.totalAiCreditsUsed += metric.ai_credits_used;
  entry.activeDays.add(metric.day);

  if (metric.ai_adoption_phase) {
    if (!entry.latestPhaseDay || metric.day >= entry.latestPhaseDay) {
      entry.phase = { ...metric.ai_adoption_phase };
      entry.latestPhaseDay = metric.day;
    }
  }

  for (const modelFeature of metric.totals_by_model_feature) {
    const interactionCount = modelFeature.user_initiated_interaction_count || 0;
    const activityCount = (modelFeature.code_generation_activity_count || 0) + (modelFeature.code_acceptance_activity_count || 0);
    const usageCount = interactionCount > 0 ? interactionCount : activityCount;
    const { normalizedModel } = classifyModelRequest(modelFeature.model);
    addDimensionUsage(entry.models, normalizedModel || 'unknown', usageCount);
  }

  for (const ideTotal of metric.totals_by_ide) {
    addDimensionUsage(entry.clients, ideTotal.ide, getActivityCount(ideTotal));
  }

  addDimensionUsage(entry.clients, 'copilot_cli', getCliActivityCount(metric));

  for (const languageFeature of metric.totals_by_language_feature) {
    const language = languageFeature.language?.trim();
    if (!language || language === 'unknown') continue;
    const usageCount = languageFeature.code_generation_activity_count + languageFeature.code_acceptance_activity_count;
    addDimensionUsage(entry.languages, language, usageCount);
  }
}

function addUserDimensionsToPhase(
  phaseDimensions: PhaseAccumulatorEntry['models'],
  userDimensions: Map<string, number>
): void {
  for (const [name, total] of userDimensions) {
    if (!phaseDimensions.has(name)) {
      phaseDimensions.set(name, { total: 0, uniqueUsers: 0 });
    }

    const phaseDimension = phaseDimensions.get(name)!;
    phaseDimension.total += total;
    phaseDimension.uniqueUsers += 1;
  }
}

function getOrCreatePhaseEntry(
  phases: Map<number, PhaseAccumulatorEntry>,
  phase: AIAdoptionPhase
): PhaseAccumulatorEntry {
  if (!phases.has(phase.phase_number)) {
    phases.set(phase.phase_number, {
      phase,
      userCount: 0,
      totalUserInitiatedInteractions: 0,
      totalLocAdded: 0,
      totalLocDeleted: 0,
      totalAiCreditsUsed: 0,
      totalDaysActive: 0,
      models: new Map(),
      clients: new Map(),
      languages: new Map(),
    });
  }

  return phases.get(phase.phase_number)!;
}

function computeTopEntries(dimensions: Map<string, { total: number; uniqueUsers: number }>): AiAdoptionPhaseTopEntry[] {
  return Array.from(dimensions.entries())
    .map(([name, entry]) => ({
      name,
      total: entry.total,
      uniqueUsers: entry.uniqueUsers,
    }))
    .sort((a, b) => b.total - a.total || b.uniqueUsers - a.uniqueUsers || a.name.localeCompare(b.name))
    .slice(0, 3);
}

function getPhaseSortValue(phaseNumber: number): number {
  return phaseNumber < 0 ? Number.MAX_SAFE_INTEGER : phaseNumber;
}

export function computeAiAdoptionPhaseData(
  accumulator: AiAdoptionPhaseAccumulator
): AiAdoptionPhaseData[] {
  const phases = new Map<number, PhaseAccumulatorEntry>();

  for (const userEntry of accumulator.users.values()) {
    const phase = userEntry.phase ?? MISSING_PHASE;
    const phaseEntry = getOrCreatePhaseEntry(phases, phase);
    phaseEntry.userCount += 1;
    phaseEntry.totalUserInitiatedInteractions += userEntry.totalUserInitiatedInteractions;
    phaseEntry.totalLocAdded += userEntry.totalLocAdded;
    phaseEntry.totalLocDeleted += userEntry.totalLocDeleted;
    phaseEntry.totalAiCreditsUsed += userEntry.totalAiCreditsUsed;
    phaseEntry.totalDaysActive += userEntry.activeDays.size;
    addUserDimensionsToPhase(phaseEntry.models, userEntry.models);
    addUserDimensionsToPhase(phaseEntry.clients, userEntry.clients);
    addUserDimensionsToPhase(phaseEntry.languages, userEntry.languages);
  }

  return Array.from(phases.values())
    .map((phaseEntry) => ({
      phase: phaseEntry.phase,
      userCount: phaseEntry.userCount,
      avgUserInitiatedInteractions: phaseEntry.totalUserInitiatedInteractions / phaseEntry.userCount,
      totalLocAdded: phaseEntry.totalLocAdded,
      totalLocDeleted: phaseEntry.totalLocDeleted,
      avgLocAdded: phaseEntry.totalLocAdded / phaseEntry.userCount,
      avgLocDeleted: phaseEntry.totalLocDeleted / phaseEntry.userCount,
      avgAiCreditsUsed: phaseEntry.totalAiCreditsUsed / phaseEntry.userCount,
      avgDaysActive: phaseEntry.totalDaysActive / phaseEntry.userCount,
      topModels: computeTopEntries(phaseEntry.models),
      topClients: computeTopEntries(phaseEntry.clients),
      topLanguages: computeTopEntries(phaseEntry.languages),
    }))
    .sort((a, b) => getPhaseSortValue(a.phase.phase_number) - getPhaseSortValue(b.phase.phase_number));
}
