import { normalizeModelName } from './modelConfig';

export interface ModelFeatureActivity {
  model: string;
  user_initiated_interaction_count: number;
  code_generation_activity_count: number;
  code_acceptance_activity_count: number;
}

/**
 * Returns true when a model-feature record represents active Auto mode usage.
 * A feature counts as active when the normalized model name is 'auto' AND at least
 * one qualifying activity counter (interactions, generation, or acceptance) is greater than zero.
 */
export function isActiveAutoModeFeature(modelFeature: ModelFeatureActivity): boolean {
  if (normalizeModelName(modelFeature.model) !== 'auto') return false;
  return (
    modelFeature.user_initiated_interaction_count > 0 ||
    modelFeature.code_generation_activity_count > 0 ||
    modelFeature.code_acceptance_activity_count > 0
  );
}
