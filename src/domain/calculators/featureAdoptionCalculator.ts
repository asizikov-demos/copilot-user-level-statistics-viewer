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
  advancedUsers: number;
}

export interface FeatureAdoptionAccumulator {
  userFeatures: Map<number, Set<string>>;
  cliUsers: Set<number>;
}

export function createFeatureAdoptionAccumulator(): FeatureAdoptionAccumulator {
  return {
    userFeatures: new Map(),
    cliUsers: new Set(),
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
  let advancedUsers = 0;

  const isChatUser = (features: Set<string>) =>
    features.has('chat_panel_unknown_mode') ||
    features.has('chat_panel_ask_mode') ||
    features.has('chat_panel_agent_mode') ||
    features.has('chat_panel_edit_mode') ||
    features.has('chat_panel_plan_mode') ||
    features.has('chat_inline');

  const isAgentUser = (features: Set<string>) =>
    features.has('chat_panel_agent_mode') || features.has('agent_edit');

  const userIds = new Set<number>([
    ...accumulator.userFeatures.keys(),
    ...accumulator.cliUsers.values(),
  ]);

  for (const userId of userIds) {
    const features = accumulator.userFeatures.get(userId) || new Set<string>();
    const isCliUser = accumulator.cliUsers.has(userId);

    if (features.has('code_completion')) completionUsers++;
    if (isChatUser(features)) chatUsers++;
    if (isAgentUser(features)) agentModeUsers++;
    if (features.has('chat_panel_ask_mode')) askModeUsers++;
    if (features.has('chat_panel_edit_mode')) editModeUsers++;
    if (features.has('chat_inline')) inlineModeUsers++;
    if (features.has('chat_panel_plan_mode')) planModeUsers++;
    if (isCliUser) cliUsers++;
    if (isAgentUser(features) || isCliUser) advancedUsers++;

    if (features.has('code_completion') && !isChatUser(features) && !isAgentUser(features) && !isCliUser) {
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
    advancedUsers,
  };
}
