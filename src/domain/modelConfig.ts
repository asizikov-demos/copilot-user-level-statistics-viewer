/**
 * Shared configuration for model normalization and known-model recognition.
 */
import { normalizeModelName } from './autoMode';

export { isActiveAutoModeFeature, normalizeModelName } from './autoMode';

export type ModelCategory = 'Lightweight' | 'Powerful' | 'Versatile';
export type ModelVendor = 'Anthropic' | 'GitHub' | 'Google' | 'Microsoft' | 'Moonshot AI' | 'OpenAI' | 'xAI';
export type ModelVendorGroup = ModelVendor | 'Unattributed';

/**
 * Display order for model categories, from least to most capable, with unmapped models last.
 */
export const MODEL_CATEGORY_ORDER = ['Lightweight', 'Versatile', 'Powerful', 'Uncategorized'] as const;
export const MODEL_VENDOR_ORDER: readonly ModelVendorGroup[] = [
  'OpenAI',
  'Anthropic',
  'Google',
  'GitHub',
  'Microsoft',
  'xAI',
  'Moonshot AI',
  'Unattributed',
];

export class Model {
  constructor(
    public readonly name: string,
    public readonly category: ModelCategory,
    public readonly vendor: ModelVendor
  ) {}
}

/**
 * Canonical list of known models.
 */
export const KNOWN_MODELS: Model[] = [
  new Model('goldeneye', 'Powerful', 'GitHub'),
  new Model('gpt-4.0', 'Powerful', 'OpenAI'),
  new Model('gpt-4.1', 'Versatile', 'OpenAI'),
  new Model('gpt-3.5', 'Lightweight', 'OpenAI'),
  new Model('gpt-4o', 'Versatile', 'OpenAI'),
  new Model('gpt-4o-mini', 'Lightweight', 'OpenAI'),
  new Model('gpt-4o-latest', 'Versatile', 'OpenAI'),
  new Model('gpt-5-mini', 'Lightweight', 'OpenAI'),
  new Model('grok-code-fast', 'Lightweight', 'xAI'),
  new Model('raptor-mini', 'Versatile', 'GitHub'),
  new Model('gpt-5', 'Powerful', 'OpenAI'),
  new Model('gpt-5.0', 'Powerful', 'OpenAI'),
  new Model('gpt-5.1', 'Powerful', 'OpenAI'),
  new Model('gpt-5.2', 'Powerful', 'OpenAI'),
  new Model('gpt-5.4', 'Versatile', 'OpenAI'),
  new Model('gpt-5.5', 'Powerful', 'OpenAI'),
  new Model('gpt-5.3-codex', 'Powerful', 'OpenAI'),
  new Model('gpt-5-codex', 'Powerful', 'OpenAI'),
  new Model('gpt-5.2-codex', 'Powerful', 'OpenAI'),
  new Model('gpt-5.1-codex', 'Powerful', 'OpenAI'),
  new Model('gpt-5.1-codex-max', 'Powerful', 'OpenAI'),
  new Model('gpt-5.1-codex-mini', 'Lightweight', 'OpenAI'),
  new Model('gpt-5.4-mini', 'Lightweight', 'OpenAI'),
  new Model('gpt-5.4-nano', 'Lightweight', 'OpenAI'),
  new Model('gpt-5.6-luna', 'Lightweight', 'OpenAI'),
  new Model('gpt-5.6-sol', 'Powerful', 'OpenAI'),
  new Model('gpt-5.6-terra', 'Versatile', 'OpenAI'),
  new Model('gpt-6-astra', 'Powerful', 'OpenAI'),
  new Model('grok-code-fast-1', 'Lightweight', 'xAI'),
  new Model('grok-4.5', 'Versatile', 'xAI'),
  new Model('grok-4.6', 'Versatile', 'xAI'),
  new Model('grok-4.7', 'Versatile', 'xAI'),
  new Model('o3', 'Powerful', 'OpenAI'),
  new Model('o3-mini', 'Lightweight', 'OpenAI'),
  new Model('o4-mini', 'Lightweight', 'OpenAI'),
  new Model('claude-3.5-sonnet', 'Versatile', 'Anthropic'),
  new Model('claude-3.7-sonnet', 'Versatile', 'Anthropic'),
  new Model('claude-3.7-sonnet-thought', 'Versatile', 'Anthropic'),
  new Model('claude-4.0-sonnet', 'Versatile', 'Anthropic'),
  new Model('claude-4.5-sonnet', 'Versatile', 'Anthropic'),
  new Model('claude-4.6-sonnet', 'Versatile', 'Anthropic'),
  new Model('claude-opus-4', 'Powerful', 'Anthropic'),
  new Model('claude-opus-4.1', 'Powerful', 'Anthropic'),
  new Model('claude-opus-4.5', 'Powerful', 'Anthropic'),
  new Model('claude-opus-4.6', 'Powerful', 'Anthropic'),
  new Model('claude-opus-4.7', 'Powerful', 'Anthropic'),
  new Model('claude-opus-4.8', 'Powerful', 'Anthropic'),
  new Model('claude-opus-5', 'Powerful', 'Anthropic'),
  new Model('claude-opus-4.8-fast-mode', 'Powerful', 'Anthropic'),
  new Model('claude-opus-4.8-fast-mode-preview', 'Powerful', 'Anthropic'),
  new Model('claude-fable-5', 'Powerful', 'Anthropic'),
  new Model('claude-fable-5.1', 'Powerful', 'Anthropic'),
  new Model('claude-opus-4.6-fast-mode', 'Powerful', 'Anthropic'),
  new Model('claude-opus-4.6-fast-mode-preview', 'Powerful', 'Anthropic'),
  new Model('claude-4.5-haiku', 'Versatile', 'Anthropic'),
  new Model('claude-haiku-4.5', 'Versatile', 'Anthropic'),
  new Model('claude-sonnet-4', 'Versatile', 'Anthropic'),
  new Model('claude-sonnet-4.5', 'Versatile', 'Anthropic'),
  new Model('claude-sonnet-4.6', 'Versatile', 'Anthropic'),
  new Model('claude-sonnet-5', 'Versatile', 'Anthropic'),
  new Model('gemini-2.0-flash', 'Lightweight', 'Google'),
  new Model('gemini-2.5-pro', 'Powerful', 'Google'),
  new Model('gemini-3.0-pro', 'Powerful', 'Google'),
  new Model('gemini-3.1-pro', 'Powerful', 'Google'),
  new Model('gemini-3.1-pro-preview', 'Powerful', 'Google'),
  new Model('gemini-3.0-flash', 'Lightweight', 'Google'),
  new Model('gemini-3-flash', 'Lightweight', 'Google'),
  new Model('gemini-3.5-flash', 'Lightweight', 'Google'),
  new Model('gemini-3.6-flash', 'Versatile', 'Google'),
  new Model('gemini-3.7-flash', 'Versatile', 'Google'),
  new Model('gemini-3.8-flash', 'Versatile', 'Google'),
  new Model('mai-code-1-flash', 'Lightweight', 'Microsoft'),
  new Model('mai-code-1.1-flash', 'Lightweight', 'Microsoft'),
  new Model('kimi-k2.7-code', 'Versatile', 'Moonshot AI'),
  new Model('kimi-k3', 'Powerful', 'Moonshot AI'),
];

const UNKNOWN_MODEL_NAME = 'unknown';

const KNOWN_MODEL_NAMES = new Set(
  KNOWN_MODELS.map(model => normalizeModelName(model.name))
);

const MODEL_CATEGORIES = new Map(
  KNOWN_MODELS.map(model => [normalizeModelName(model.name), model.category] as const)
);

const MODEL_VENDORS = new Map(
  KNOWN_MODELS.map(model => [normalizeModelName(model.name), model.vendor] as const)
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

export function getModelVendor(modelName: string): ModelVendor | undefined {
  return MODEL_VENDORS.get(normalizeModelName(modelName));
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
