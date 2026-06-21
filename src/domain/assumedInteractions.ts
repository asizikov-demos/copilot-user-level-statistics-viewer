export const CODE_COMPLETION_FEATURE = 'code_completion';

interface FeatureGenerationMetric {
  feature: string;
  code_generation_activity_count: number;
}

interface InteractionMetric {
  user_initiated_interaction_count: number;
  assumed_user_initiated_interaction_count?: number;
}

interface GenerationMetric {
  code_generation_activity_count: number;
}

export function getAssumedUserInitiatedInteractionCount(
  feature: string,
  codeGenerationActivityCount: number,
): number {
  return feature === CODE_COMPLETION_FEATURE ? Math.max(0, codeGenerationActivityCount) : 0;
}

export function withAssumedUserInitiatedInteractionCount<T extends FeatureGenerationMetric>(
  item: T,
): T & { assumed_user_initiated_interaction_count: number } {
  return {
    ...item,
    assumed_user_initiated_interaction_count: getAssumedUserInitiatedInteractionCount(
      item.feature,
      item.code_generation_activity_count,
    ),
  };
}

export function getTotalUserInitiatedInteractionCount(item: InteractionMetric): number {
  return item.user_initiated_interaction_count + (item.assumed_user_initiated_interaction_count ?? 0);
}

export function sumAssumedUserInitiatedInteractions(items: FeatureGenerationMetric[]): number {
  return items.reduce(
    (sum, item) =>
      sum + getAssumedUserInitiatedInteractionCount(item.feature, item.code_generation_activity_count),
    0,
  );
}

export function distributeAssumedInteractionsByGeneration<T extends GenerationMetric>(
  items: T[],
  assumedInteractionCount: number,
): number[] {
  if (items.length === 0 || assumedInteractionCount <= 0) {
    return items.map(() => 0);
  }

  const generationCounts = items.map((item) => Math.max(0, item.code_generation_activity_count));
  const totalGenerations = generationCounts.reduce((sum, value) => sum + value, 0);
  if (totalGenerations === 0) {
    return items.map(() => 0);
  }

  const allocations = generationCounts.map((value) => (assumedInteractionCount * value) / totalGenerations);
  const roundedDown = allocations.map(Math.floor);
  let remaining = assumedInteractionCount - roundedDown.reduce((sum, value) => sum + value, 0);

  const indicesByRemainder = allocations
    .map((value, index) => ({ index, remainder: value - Math.floor(value) }))
    .sort((a, b) => b.remainder - a.remainder);

  for (const { index } of indicesByRemainder) {
    if (remaining <= 0) break;
    roundedDown[index] += 1;
    remaining -= 1;
  }

  return roundedDown;
}
