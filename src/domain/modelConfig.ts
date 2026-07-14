/**
 * Shared configuration for model normalization and known-model recognition.
 */
import { normalizeModelName } from './autoMode';

export { isActiveAutoModeFeature, normalizeModelName } from './autoMode';

export type ModelCategory = 'Lightweight' | 'Powerful' | 'Versatile';

export class Model {
  constructor(
    public readonly name: string,
    public readonly category?: ModelCategory
  ) {}
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
  new Model('gpt-5-mini', 'Lightweight'),
  new Model('grok-code-fast'),
  new Model('raptor-mini', 'Versatile'),
  new Model('gpt-5'),
  new Model('gpt-5.0'),
  new Model('gpt-5.1'),
  new Model('gpt-5.2'),
  new Model('gpt-5.4', 'Versatile'),
  new Model('gpt-5.5', 'Powerful'),
  new Model('gpt-5.3-codex', 'Powerful'),
  new Model('gpt-5-codex'),
  new Model('gpt-5.2-codex'),
  new Model('gpt-5.1-codex'),
  new Model('gpt-5.1-codex-max'),
  new Model('gpt-5.1-codex-mini'),
  new Model('gpt-5.4-mini', 'Lightweight'),
  new Model('gpt-5.4-nano', 'Lightweight'),
  new Model('gpt-5.6-luna', 'Lightweight'),
  new Model('gpt-5.6-sol', 'Powerful'),
  new Model('gpt-5.6-terra', 'Versatile'),
  new Model('grok-code-fast-1'),
  new Model('o3'),
  new Model('o3-mini'),
  new Model('o4-mini'),
  new Model('claude-3.5-sonnet'),
  new Model('claude-3.7-sonnet'),
  new Model('claude-3.7-sonnet-thought'),
  new Model('claude-4.0-sonnet', 'Versatile'),
  new Model('claude-4.5-sonnet', 'Versatile'),
  new Model('claude-4.6-sonnet', 'Versatile'),
  new Model('claude-opus-4'),
  new Model('claude-opus-4.1'),
  new Model('claude-opus-4.5', 'Powerful'),
  new Model('claude-opus-4.6', 'Powerful'),
  new Model('claude-opus-4.7', 'Powerful'),
  new Model('claude-opus-4.8', 'Powerful'),
  new Model('claude-opus-4.8-fast-mode', 'Powerful'),
  new Model('claude-opus-4.8-fast-mode-preview', 'Powerful'),
  new Model('claude-fable-5', 'Powerful'),
  new Model('claude-opus-4.6-fast-mode'),
  new Model('claude-opus-4.6-fast-mode-preview'),
  new Model('claude-4.5-haiku', 'Versatile'),
  new Model('claude-haiku-4.5', 'Versatile'),
  new Model('claude-sonnet-4', 'Versatile'),
  new Model('claude-sonnet-4.5', 'Versatile'),
  new Model('claude-sonnet-4.6', 'Versatile'),
  new Model('claude-sonnet-5', 'Versatile'),
  new Model('gemini-2.0-flash'),
  new Model('gemini-2.5-pro', 'Powerful'),
  new Model('gemini-3.0-pro'),
  new Model('gemini-3.1-pro', 'Powerful'),
  new Model('gemini-3.0-flash', 'Lightweight'),
  new Model('gemini-3-flash', 'Lightweight'),
  new Model('gemini-3.5-flash', 'Lightweight'),
  new Model('mai-code-1-flash', 'Lightweight'),
  new Model('kimi-k2.7-code', 'Versatile'),
  new Model('auto'),
  new Model('unknown'),
];

const UNKNOWN_MODEL_NAME = 'unknown';

const KNOWN_MODEL_NAMES = new Set(
  KNOWN_MODELS.map(model => normalizeModelName(model.name))
);

const MODEL_CATEGORIES = new Map(
  KNOWN_MODELS.flatMap(model => model.category
    ? [[normalizeModelName(model.name), model.category] as const]
    : [])
);

export interface ModelRequestClassification {
  normalizedModel: string;
  isUnknown: boolean;
  isKnownModel: boolean;
}

export function isUnknownModelName(modelName: string): boolean {
  const normalized = normalizeModelName(modelName);
  return normalized === '' || normalized === UNKNOWN_MODEL_NAME;
}

export function isKnownModelName(modelName: string): boolean {
  const normalized = normalizeModelName(modelName);
  return normalized !== '' && normalized !== UNKNOWN_MODEL_NAME && KNOWN_MODEL_NAMES.has(normalized);
}

export function getModelCategory(modelName: string): ModelCategory | undefined {
  return MODEL_CATEGORIES.get(normalizeModelName(modelName));
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
