/**
 * Shared configuration for model normalization and known-model recognition.
 */
export interface ModelFeatureActivity {
  model: string;
  user_initiated_interaction_count: number;
  code_generation_activity_count: number;
  code_acceptance_activity_count: number;
}

export const normalizeModelName = (name: string): string =>
  name
    .trim()
    .toLowerCase()
    .replace(/[()]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-');

export class Model {
  constructor(public readonly name: string) {}
}

/**
 * Canonical list of known models.
 */
export const KNOWN_MODELS: Model[] = [
  new Model('goldeneye'),
  new Model('gpt-4.0'),
  new Model('gpt-4.1'),
  new Model('gpt-3.5'),
  new Model('gpt-4o'),
  new Model('gpt-4o-mini'),
  new Model('gpt-4o-latest'),
  new Model('gpt-5-mini'),
  new Model('grok-code-fast'),
  new Model('raptor-mini'),
  new Model('gpt-5'),
  new Model('gpt-5.0'),
  new Model('gpt-5.1'),
  new Model('gpt-5.2'),
  new Model('gpt-5.4'),
  new Model('gpt-5.5'),
  new Model('gpt-5.3-codex'),
  new Model('gpt-5-codex'),
  new Model('gpt-5.2-codex'),
  new Model('gpt-5.1-codex'),
  new Model('gpt-5.1-codex-max'),
  new Model('gpt-5.1-codex-mini'),
  new Model('gpt-5.4-mini'),
  new Model('gpt-5.4-nano'),
  new Model('grok-code-fast-1'),
  new Model('o3'),
  new Model('o3-mini'),
  new Model('o4-mini'),
  new Model('claude-3.5-sonnet'),
  new Model('claude-3.7-sonnet'),
  new Model('claude-3.7-sonnet-thought'),
  new Model('claude-4.0-sonnet'),
  new Model('claude-4.5-sonnet'),
  new Model('claude-4.6-sonnet'),
  new Model('claude-opus-4'),
  new Model('claude-opus-4.1'),
  new Model('claude-opus-4.5'),
  new Model('claude-opus-4.6'),
  new Model('claude-opus-4.7'),
  new Model('claude-opus-4.8'),
  new Model('claude-opus-4.6-fast-mode'),
  new Model('claude-opus-4.6-fast-mode-preview'),
  new Model('claude-4.5-haiku'),
  new Model('claude-haiku-4.5'),
  new Model('claude-sonnet-4'),
  new Model('claude-sonnet-4.5'),
  new Model('claude-sonnet-4.6'),
  new Model('gemini-2.0-flash'),
  new Model('gemini-2.5-pro'),
  new Model('gemini-3.0-pro'),
  new Model('gemini-3.1-pro'),
  new Model('gemini-3.0-flash'),
  new Model('gemini-3-flash'),
  new Model('gemini-3.5-flash'),
  new Model('auto'),
  new Model('unknown'),
];

const UNKNOWN_MODEL_NAME = 'unknown';

const KNOWN_MODEL_NAMES = new Set(
  KNOWN_MODELS.map(model => normalizeModelName(model.name))
);

export interface ModelRequestClassification {
  normalizedModel: string;
  isUnknown: boolean;
  isKnownModel: boolean;
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

export function isUnknownModelName(modelName: string): boolean {
  const normalized = normalizeModelName(modelName);
  return normalized === '' || normalized === UNKNOWN_MODEL_NAME;
}

export function isKnownModelName(modelName: string): boolean {
  const normalized = normalizeModelName(modelName);
  return normalized !== '' && normalized !== UNKNOWN_MODEL_NAME && KNOWN_MODEL_NAMES.has(normalized);
}

export function classifyModelRequest(modelName: string): ModelRequestClassification {
  const normalizedModel = normalizeModelName(modelName);
  const isUnknown = normalizedModel === '' || normalizedModel === UNKNOWN_MODEL_NAME;
  return {
    normalizedModel,
    isUnknown,
    isKnownModel: normalizedModel !== '' && normalizedModel !== UNKNOWN_MODEL_NAME && KNOWN_MODEL_NAMES.has(normalizedModel),
  };
}
