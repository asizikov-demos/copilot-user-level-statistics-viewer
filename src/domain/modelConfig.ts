/**
 * Shared configuration for model normalization and known-model recognition.
 */
import { normalizeModelName } from './autoMode';

export { isActiveAutoModeFeature, normalizeModelName } from './autoMode';

export type ModelCategory = 'Lightweight' | 'Powerful' | 'Versatile' | 'Image Generation';
export type ModelVendor = 'Anthropic' | 'GitHub' | 'Google' | 'Microsoft' | 'Moonshot AI' | 'OpenAI' | 'xAI';
export type ModelVendorGroup = ModelVendor | 'Unattributed';

/**
 * Display order: capability categories, image generation, then unmapped models.
 */
export const MODEL_CATEGORY_ORDER = ['Lightweight', 'Versatile', 'Powerful', 'Image Generation', 'Uncategorized'] as const;
export const CUSTOM_PROVIDER = 'Custom Provider' as const;

/** Custom (BYOK) provider models are reported as `provider/model` or `https://host/model`. */
export function isCustomProviderModel(modelName: string): boolean {
  const name = modelName.trim();
  const start = /^https?:\/\//i.test(name) ? name.indexOf('://') + 3 : 0;
  const separator = name.indexOf('/', start);
  if (separator <= start || separator >= name.length - 1) return false;
  if (start === 0) return true;
  try {
    new URL(name);
    return true;
  } catch {
    return false;
  }
}

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
    public readonly displayName: string,
    public readonly category: ModelCategory,
    public readonly vendor: ModelVendor
  ) {}
}

/**
 * Canonical list of known models, retaining historical entries for older reports.
 * Current display names and categories: https://docs.github.com/en/copilot/reference/copilot-billing/models-and-pricing
 * Models in the image generation table use the app's Image Generation category.
 */
export const KNOWN_MODELS: Model[] = [
  new Model('goldeneye', 'Goldeneye', 'Powerful', 'GitHub'),
  new Model('gpt-4.0', 'GPT-4.0', 'Powerful', 'OpenAI'),
  new Model('gpt-4.1', 'GPT-4.1', 'Versatile', 'OpenAI'),
  new Model('gpt-3.5', 'GPT-3.5', 'Lightweight', 'OpenAI'),
  new Model('gpt-4o', 'GPT-4o', 'Versatile', 'OpenAI'),
  new Model('gpt-4o-mini', 'GPT-4o mini', 'Lightweight', 'OpenAI'),
  new Model('gpt-4o-latest', 'GPT-4o latest', 'Versatile', 'OpenAI'),
  new Model('gpt-5-mini', 'GPT-5 mini', 'Lightweight', 'OpenAI'),
  new Model('grok-code-fast', 'Grok Code Fast', 'Lightweight', 'xAI'),
  new Model('raptor-mini', 'Raptor mini', 'Versatile', 'GitHub'),
  new Model('gpt-5', 'GPT-5', 'Powerful', 'OpenAI'),
  new Model('gpt-5.0', 'GPT-5.0', 'Powerful', 'OpenAI'),
  new Model('gpt-5.1', 'GPT-5.1', 'Powerful', 'OpenAI'),
  new Model('gpt-5.2', 'GPT-5.2', 'Powerful', 'OpenAI'),
  new Model('gpt-5.4', 'GPT-5.4', 'Versatile', 'OpenAI'),
  new Model('gpt-5.5', 'GPT-5.5', 'Powerful', 'OpenAI'),
  new Model('gpt-5.3-codex', 'GPT-5.3-Codex', 'Powerful', 'OpenAI'),
  new Model('gpt-5-codex', 'GPT-5-Codex', 'Powerful', 'OpenAI'),
  new Model('gpt-5.2-codex', 'GPT-5.2-Codex', 'Powerful', 'OpenAI'),
  new Model('gpt-5.1-codex', 'GPT-5.1-Codex', 'Powerful', 'OpenAI'),
  new Model('gpt-5.1-codex-max', 'GPT-5.1-Codex-Max', 'Powerful', 'OpenAI'),
  new Model('gpt-5.1-codex-mini', 'GPT-5.1-Codex-Mini', 'Lightweight', 'OpenAI'),
  new Model('gpt-5.4-mini', 'GPT-5.4 mini', 'Lightweight', 'OpenAI'),
  new Model('gpt-5.4-nano', 'GPT-5.4 nano', 'Lightweight', 'OpenAI'),
  new Model('gpt-5.6-luna', 'GPT-5.6 Luna', 'Lightweight', 'OpenAI'),
  new Model('gpt-5.6-sol', 'GPT-5.6 Sol', 'Powerful', 'OpenAI'),
  new Model('gpt-5.6-terra', 'GPT-5.6 Terra', 'Versatile', 'OpenAI'),
  new Model('gpt-6-astra', 'GPT-6 Astra', 'Powerful', 'OpenAI'),
  new Model('gpt-6-luna', 'GPT-6 Luna', 'Lightweight', 'OpenAI'),
  new Model('gpt-6-sol', 'GPT-6 Sol', 'Powerful', 'OpenAI'),
  new Model('gpt-6.1-sol', 'GPT-6.1 Sol', 'Powerful', 'OpenAI'),
  new Model('gpt-6.1-terra', 'GPT-6.1 Terra', 'Versatile', 'OpenAI'),
  new Model('gpt-image-2.5-flare', 'GPT Image 2.5 Flare', 'Image Generation', 'OpenAI'),
  new Model('grok-code-fast-1', 'Grok Code Fast 1', 'Lightweight', 'xAI'),
  new Model('grok-4', 'Grok 4', 'Versatile', 'xAI'),
  new Model('grok-4.5', 'Grok 4.5', 'Versatile', 'xAI'),
  new Model('grok-4.6', 'Grok 4.6', 'Versatile', 'xAI'),
  new Model('grok-4.7', 'Grok 4.7', 'Versatile', 'xAI'),
  new Model('o3', 'o3', 'Powerful', 'OpenAI'),
  new Model('o3-mini', 'o3-mini', 'Lightweight', 'OpenAI'),
  new Model('o4-mini', 'o4-mini', 'Lightweight', 'OpenAI'),
  new Model('claude-3.5-sonnet', 'Claude 3.5 Sonnet', 'Versatile', 'Anthropic'),
  new Model('claude-3.7-sonnet', 'Claude 3.7 Sonnet', 'Versatile', 'Anthropic'),
  new Model('claude-3.7-sonnet-thought', 'Claude 3.7 Sonnet Thought', 'Versatile', 'Anthropic'),
  new Model('claude-4.0-sonnet', 'Claude 4.0 Sonnet', 'Versatile', 'Anthropic'),
  new Model('claude-4.5-sonnet', 'Claude 4.5 Sonnet', 'Versatile', 'Anthropic'),
  new Model('claude-4.6-sonnet', 'Claude 4.6 Sonnet', 'Versatile', 'Anthropic'),
  new Model('claude-opus-4', 'Claude Opus 4', 'Powerful', 'Anthropic'),
  new Model('claude-opus-4.1', 'Claude Opus 4.1', 'Powerful', 'Anthropic'),
  new Model('claude-opus-4.5', 'Claude Opus 4.5', 'Powerful', 'Anthropic'),
  new Model('claude-opus-4.6', 'Claude Opus 4.6', 'Powerful', 'Anthropic'),
  new Model('claude-opus-4.7', 'Claude Opus 4.7', 'Powerful', 'Anthropic'),
  new Model('claude-opus-4.8', 'Claude Opus 4.8', 'Powerful', 'Anthropic'),
  new Model('claude-opus-5', 'Claude Opus 5', 'Powerful', 'Anthropic'),
  new Model('claude-opus-5.5', 'Claude Opus 5.5', 'Powerful', 'Anthropic'),
  new Model('claude-opus-4.8-fast-mode', 'Claude Opus 4.8 (fast mode)', 'Powerful', 'Anthropic'),
  new Model('claude-opus-4.8-fast-mode-preview', 'Claude Opus 4.8 (fast mode) (preview)', 'Powerful', 'Anthropic'),
  new Model('claude-fable-5', 'Claude Fable 5', 'Powerful', 'Anthropic'),
  new Model('claude-fable-5.1', 'Claude Fable 5.1', 'Powerful', 'Anthropic'),
  new Model('claude-fable-5-1', 'Claude Fable 5.1', 'Powerful', 'Anthropic'),
  new Model('claude-fable-5.2', 'Claude Fable 5.2', 'Powerful', 'Anthropic'),
  new Model('claude-fable-5-2', 'Claude Fable 5.2', 'Powerful', 'Anthropic'),
  new Model('claude-opus-4.6-fast-mode', 'Claude Opus 4.6 (fast mode)', 'Powerful', 'Anthropic'),
  new Model('claude-opus-4.6-fast-mode-preview', 'Claude Opus 4.6 (fast mode) (preview)', 'Powerful', 'Anthropic'),
  new Model('claude-4.5-haiku', 'Claude 4.5 Haiku', 'Versatile', 'Anthropic'),
  new Model('claude-haiku-4.5', 'Claude Haiku 4.5', 'Versatile', 'Anthropic'),
  new Model('claude-haiku-5.5', 'Claude Haiku 5.5', 'Lightweight', 'Anthropic'),
  new Model('claude-sonnet-4', 'Claude Sonnet 4', 'Versatile', 'Anthropic'),
  new Model('claude-sonnet-4.5', 'Claude Sonnet 4.5', 'Versatile', 'Anthropic'),
  new Model('claude-sonnet-4.6', 'Claude Sonnet 4.6', 'Versatile', 'Anthropic'),
  new Model('claude-sonnet-5', 'Claude Sonnet 5', 'Versatile', 'Anthropic'),
  new Model('claude-sonnet-5.5', 'Claude Sonnet 5.5', 'Versatile', 'Anthropic'),
  new Model('gemini-2.0-flash', 'Gemini 2.0 Flash', 'Lightweight', 'Google'),
  new Model('gemini-2.5-pro', 'Gemini 2.5 Pro', 'Powerful', 'Google'),
  new Model('gemini-3.0-pro', 'Gemini 3.0 Pro', 'Powerful', 'Google'),
  new Model('gemini-3.1-pro', 'Gemini 3.1 Pro', 'Powerful', 'Google'),
  new Model('gemini-3.1-pro-preview', 'Gemini 3.1 Pro (preview)', 'Powerful', 'Google'),
  new Model('gemini-3.0-flash', 'Gemini 3.0 Flash', 'Lightweight', 'Google'),
  new Model('gemini-3-flash', 'Gemini 3 Flash', 'Lightweight', 'Google'),
  new Model('gemini-3.5-flash', 'Gemini 3.5 Flash', 'Lightweight', 'Google'),
  new Model('gemini-3.6-flash', 'Gemini 3.6 Flash', 'Versatile', 'Google'),
  new Model('gemini-3.7-flash', 'Gemini 3.7 Flash', 'Versatile', 'Google'),
  new Model('gemini-3.8-flash', 'Gemini 3.8 Flash', 'Versatile', 'Google'),
  new Model('gemini-4-argon', 'Gemini 4 Argon', 'Powerful', 'Google'),
  new Model('gemini-4-carbon', 'Gemini 4 Carbon', 'Powerful', 'Google'),
  new Model('gemini-4-hydrogen', 'Gemini 4 Hydrogen', 'Versatile', 'Google'),
  new Model('mai-code-1-flash', 'MAI-Code-1-Flash', 'Lightweight', 'Microsoft'),
  new Model('mai-code-1.1-flash', 'MAI-Code-1.1-Flash', 'Lightweight', 'Microsoft'),
  new Model('kimi-k2.7-code', 'Kimi K2.7 Code', 'Versatile', 'Moonshot AI'),
  new Model('kimi-k3', 'Kimi K3', 'Powerful', 'Moonshot AI'),
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

const MODEL_DISPLAY_NAMES = new Map(
  KNOWN_MODELS.map(model => [normalizeModelName(model.name), model.displayName] as const)
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

export function getModelDisplayName(modelName: string): string | undefined {
  return MODEL_DISPLAY_NAMES.get(normalizeModelName(modelName));
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
