import {
  isAgentFeature,
  isChatFeature,
  isCodeCompletionFeature,
} from '../featureCategories';

export interface FeatureAdoptionData {
  totalUsers: number;
  completionUsers: number;
  completionOnlyUsers: number;
  chatUsers: number;
  agentModeUsers: number;
  askModeUsers: number;
  editModeUsers: number;
  inlineModeUsers: number;
  planModeUsers: number;
  cliUsers: number;
  codingAgentUsers: number;
  advancedUsers: number;
}

export interface FeatureAdoptionAccumulator {
  userFeatures: Map<number, Set<string>>;
  cliUsers: Set<number>;
  codingAgentUsers: Set<number>;
}

export function createFeatureAdoptionAccumulator(): FeatureAdoptionAccumulator {
  return {
    userFeatures: new Map(),
    cliUsers: new Set(),
    codingAgentUsers: new Set(),
  };
}

export function accumulateFeatureAdoption(
  accumulator: FeatureAdoptionAccumulator,
  userId: number,
  feature: string,
  interactionCount: number,
  generationCount: number
): void {
  if (interactionCount <= 0 && generationCount <= 0) return;

  if (!accumulator.userFeatures.has(userId)) {
    accumulator.userFeatures.set(userId, new Set());
  }
  accumulator.userFeatures.get(userId)!.add(feature);
}

export function accumulateCliAdoption(
  accumulator: FeatureAdoptionAccumulator,
  userId: number,
  usedCli: boolean
): void {
  if (!usedCli) return;

  accumulator.cliUsers.add(userId);
}

export function accumulateCodingAgentAdoption(
  accumulator: FeatureAdoptionAccumulator,
  userId: number,
  usedCodingAgent: boolean
): void {
  if (!usedCodingAgent) return;

  accumulator.codingAgentUsers.add(userId);
}

export function computeFeatureAdoptionData(
  accumulator: FeatureAdoptionAccumulator
): FeatureAdoptionData {
  let completionUsers = 0;
  let completionOnlyUsers = 0;
  let chatUsers = 0;
  let agentModeUsers = 0;
  let askModeUsers = 0;
  let editModeUsers = 0;
  let inlineModeUsers = 0;
  let planModeUsers = 0;
  let cliUsers = 0;
  let codingAgentUsers = 0;
  let advancedUsers = 0;

  const userIds = new Set<number>([
    ...accumulator.userFeatures.keys(),
    ...accumulator.cliUsers.values(),
    ...accumulator.codingAgentUsers.values(),
  ]);

  for (const userId of userIds) {
    const features = accumulator.userFeatures.get(userId) || new Set<string>();
    const isCliUser = accumulator.cliUsers.has(userId);
    const isCodingAgentUser = accumulator.codingAgentUsers.has(userId);
    let hasCompletionFeature = false;
    let hasChatFeature = false;
    let hasAgentFeature = false;

    for (const feature of features) {
      if (isCodeCompletionFeature(feature)) hasCompletionFeature = true;
      if (isChatFeature(feature)) hasChatFeature = true;
      if (isAgentFeature(feature)) hasAgentFeature = true;
    }

    if (hasCompletionFeature) completionUsers++;
    if (hasChatFeature) chatUsers++;
    if (hasAgentFeature) agentModeUsers++;
    if (features.has('chat_panel_ask_mode')) askModeUsers++;
    if (features.has('chat_panel_edit_mode')) editModeUsers++;
    if (features.has('chat_inline')) inlineModeUsers++;
    if (features.has('chat_panel_plan_mode')) planModeUsers++;
    if (isCliUser) cliUsers++;
    if (isCodingAgentUser) codingAgentUsers++;
    if (hasAgentFeature || isCliUser || isCodingAgentUser) advancedUsers++;

    if (hasCompletionFeature && !hasChatFeature && !hasAgentFeature && !isCliUser && !isCodingAgentUser) {
      completionOnlyUsers++;
    }
  }

  return {
    totalUsers: userIds.size,
    completionUsers,
    completionOnlyUsers,
    chatUsers,
    agentModeUsers,
    askModeUsers,
    editModeUsers,
    inlineModeUsers,
    planModeUsers,
    cliUsers,
    codingAgentUsers,
    advancedUsers,
  };
}
