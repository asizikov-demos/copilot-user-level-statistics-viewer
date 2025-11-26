/**
 * Shared configuration for model classification and cost calculations.
 * Keep this list in sync with GitHub Copilot pricing and entitlement docs.
 */
export class Model {
  constructor(
    public readonly name: string,
    public readonly multiplier: number,
    public readonly isPremium: boolean
  ) {}
}

/**
 * Canonical list of known models with associated PRU multipliers and premium flags.
 */
export const KNOWN_MODELS: Model[] = [
  // Included models (0 PRUs for paid plans)
  new Model('gpt-4.0', 0, false),
  new Model('gpt-4.1', 0, false),
  new Model('gpt-3.5', 0, false),
  new Model('gpt-4o', 0, false),
  new Model('gpt-4o-mini', 0, false),
  new Model('gpt-4o-latest', 0, false),
  new Model('gpt-5-mini', 0, false),
  new Model('grok-code-fast', 0, false),
  new Model('grok-code-fast-1', 0, false),

  // Premium models with multipliers
  new Model('gpt-5', 1, true),
  new Model('gpt-5.0', 1, true),
  new Model('gpt-5.1', 1, true),
  new Model('gpt-5.0-codex', 1, true),
  new Model('gpt-5.1-codex', 1, true),
  new Model('gpt-5.1-codex-mini', 0.33, true),
  new Model('o3', 1, true),
  new Model('o3-mini', 0.33, true),
  new Model('o4-mini', 0.33, true),
  new Model('claude-3.5-sonnet', 1, true),
  new Model('claude-3.7-sonnet', 1, true),
  new Model('claude-3.7-sonnet-thought', 1.25, true),
  new Model('claude-4.0-sonnet', 1, true),
  new Model('claude-4.5-sonnet', 1, true),
  new Model('claude-opus-4', 10, true),
  new Model('claude-opus-4.1', 10, true),
  new Model('claude-haiku-4.5', 0.33, true),
  new Model('gemini-2.0-flash', 0.25, true),
  new Model('gemini-2.5-pro', 1, true),
  new Model('gemini-3.0-pro', 1, true),


  // Default multiplier for unknown models
  new Model('unknown', 1, true),
];

const normalizeModelName = (name: string): string => name.trim().toLowerCase();

/**
 * Multiplier map keyed by model name for quick lookups.
 */
export const MODEL_MULTIPLIERS: Record<string, number> = KNOWN_MODELS.reduce(
  (acc, model) => {
    acc[normalizeModelName(model.name)] = model.multiplier;
    return acc;
  },
  {} as Record<string, number>
);

/**
 * Dollar cost applied per Premium Request Unit (PRU).
 */
export const SERVICE_VALUE_RATE = 0.04;

const UNKNOWN_MULTIPLIER = MODEL_MULTIPLIERS['unknown'] ?? 1;

/**
 * Resolve the PRU multiplier for a model name using exact or partial matching.
 */
export function getModelMultiplier(modelName: string): number {
  const normalized = normalizeModelName(modelName);

  if (!normalized) {
    return UNKNOWN_MULTIPLIER;
  }

  if (normalized in MODEL_MULTIPLIERS) {
    return MODEL_MULTIPLIERS[normalized];
  }

  for (const [key, multiplier] of Object.entries(MODEL_MULTIPLIERS)) {
    if (key !== 'unknown' && normalized.includes(key)) {
      return multiplier;
    }
  }

  return UNKNOWN_MULTIPLIER;
}

/**
 * Determine if a model should be treated as premium (incurs PRU consumption beyond included tier).
 * Uses the canonical KNOWN_MODELS list. Unknown models inherit the flag from the 'unknown' entry.
 */
export function isPremiumModel(modelName: string): boolean {
  const normalized = normalizeModelName(modelName);
  // Exact match first
  const direct = KNOWN_MODELS.find(m => normalizeModelName(m.name) === normalized);
  if (direct) return direct.isPremium;
  // Partial match fallback (mirrors multiplier resolution logic, excluding 'unknown')
  for (const model of KNOWN_MODELS) {
    if (normalizeModelName(model.name) === 'unknown') continue;
    if (normalized.includes(normalizeModelName(model.name))) {
      return model.isPremium;
    }
  }
  // Fallback to 'unknown' model's premium flag
  const unknown = KNOWN_MODELS.find(m => normalizeModelName(m.name) === 'unknown');
  return unknown ? unknown.isPremium : true;
}
