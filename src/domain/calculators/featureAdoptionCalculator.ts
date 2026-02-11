export interface FeatureAdoptionData {
  totalUsers: number;
  completionUsers: number;
  completionOnlyUsers: number;
  chatUsers: number;
  agentModeUsers: number;
  askModeUsers: number;
  editModeUsers: number;
  inlineModeUsers: number;
  codeReviewUsers: number;
  cliUsers: number;
  advancedUsers: number;
}

export interface FeatureAdoptionAccumulator {
  userFeatures: Map<number, Set<string>>;
}

export function createFeatureAdoptionAccumulator(): FeatureAdoptionAccumulator {
  return {
    userFeatures: new Map(),
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
  let codeReviewUsers = 0;
  let cliUsers = 0;
  let advancedUsers = 0;

  const isChatUser = (features: Set<string>) =>
    features.has('chat_panel_unknown_mode') ||
    features.has('chat_panel_ask_mode') ||
    features.has('chat_panel_agent_mode') ||
    features.has('chat_panel_edit_mode') ||
    features.has('chat_inline');

  const isAgentUser = (features: Set<string>) =>
    features.has('chat_panel_agent_mode') || features.has('agent_edit');

  const isCliUser = (features: Set<string>) =>
    features.has('cli_agent');

  for (const features of accumulator.userFeatures.values()) {
    if (features.has('code_completion')) completionUsers++;
    if (isChatUser(features)) chatUsers++;
    if (isAgentUser(features)) agentModeUsers++;
    if (features.has('chat_panel_ask_mode')) askModeUsers++;
    if (features.has('chat_panel_edit_mode')) editModeUsers++;
    if (features.has('chat_inline')) inlineModeUsers++;
    if (features.has('code_review')) codeReviewUsers++;
    if (isCliUser(features)) cliUsers++;
    if (isAgentUser(features) || isCliUser(features)) advancedUsers++;

    if (features.has('code_completion') && !isChatUser(features) && !isAgentUser(features) && !isCliUser(features)) {
      completionOnlyUsers++;
    }
  }

  return {
    totalUsers: accumulator.userFeatures.size,
    completionUsers,
    completionOnlyUsers,
    chatUsers,
    agentModeUsers,
    askModeUsers,
    editModeUsers,
    inlineModeUsers,
    codeReviewUsers,
    cliUsers,
    advancedUsers,
  };
}
