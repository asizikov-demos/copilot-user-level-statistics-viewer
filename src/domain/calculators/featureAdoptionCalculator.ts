import {
  getChatModeBucket,
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
  inlineModeUsers: number;
  planModeUsers: number;
  cliUsers: number;
  codingAgentUsers: number;
  codeReviewUsers: number;
  advancedUsers: number;
}

export interface FeatureAdoptionAccumulator {
  userFeatures: Map<number, Set<string>>;
  cliUsers: Set<number>;
  codingAgentUsers: Set<number>;
  codeReviewUsers: Set<number>;
}

export function createFeatureAdoptionAccumulator(): FeatureAdoptionAccumulator {
  return {
    userFeatures: new Map(),
    cliUsers: new Set(),
    codingAgentUsers: new Set(),
    codeReviewUsers: new Set(),
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

export function accumulateCodeReviewAdoption(
  accumulator: FeatureAdoptionAccumulator,
  userId: number,
  usedCodeReview: boolean
): void {
  if (!usedCodeReview) return;

  accumulator.codeReviewUsers.add(userId);
}

export function computeFeatureAdoptionData(
  accumulator: FeatureAdoptionAccumulator
): FeatureAdoptionData {
  let completionUsers = 0;
  let completionOnlyUsers = 0;
  let chatUsers = 0;
  let agentModeUsers = 0;
  let askModeUsers = 0;
  let inlineModeUsers = 0;
  let planModeUsers = 0;
  let cliUsers = 0;
  let codingAgentUsers = 0;
  let codeReviewUsers = 0;
  let advancedUsers = 0;

  const userIds = new Set<number>([
    ...accumulator.userFeatures.keys(),
    ...accumulator.cliUsers.values(),
    ...accumulator.codingAgentUsers.values(),
    ...accumulator.codeReviewUsers.values(),
  ]);

  for (const userId of userIds) {
    const features = accumulator.userFeatures.get(userId) || new Set<string>();
    const isCliUser = accumulator.cliUsers.has(userId);
    const isCodingAgentUser = accumulator.codingAgentUsers.has(userId);
    const isCodeReviewUser = accumulator.codeReviewUsers.has(userId);
    let hasCompletionFeature = false;
    let hasChatFeature = false;
    let hasAgentFeature = false;
    let hasAskMode = false;
    let hasInlineMode = false;
    let hasPlanMode = false;

    for (const feature of features) {
      if (isCodeCompletionFeature(feature)) hasCompletionFeature = true;
      if (isChatFeature(feature)) hasChatFeature = true;
      if (isAgentFeature(feature)) hasAgentFeature = true;
      const bucket = getChatModeBucket(feature);
      if (bucket !== undefined) {
        switch (bucket) {
          case 'ask': hasAskMode = true; break;
          case 'inline': hasInlineMode = true; break;
          case 'plan': hasPlanMode = true; break;
        }
      }
    }

    if (hasCompletionFeature) completionUsers++;
    if (hasChatFeature) chatUsers++;
    if (hasAgentFeature) agentModeUsers++;
    if (hasAskMode) askModeUsers++;
    if (hasInlineMode) inlineModeUsers++;
    if (hasPlanMode) planModeUsers++;
    if (isCliUser) cliUsers++;
    if (isCodingAgentUser) codingAgentUsers++;
    if (isCodeReviewUser) codeReviewUsers++;
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
    inlineModeUsers,
    planModeUsers,
    cliUsers,
    codingAgentUsers,
    codeReviewUsers,
    advancedUsers,
  };
}
