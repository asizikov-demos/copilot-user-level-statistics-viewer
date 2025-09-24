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
  new Model('gpt-4.1', 0, false),
  new Model('gpt-3.5', 0, false),
  new Model('gpt-4o', 0, false),
  new Model('gpt-4o-mini', 0, false),
  new Model('gpt-4.0', 0, false),
  new Model('gpt-5-mini', 0, false),
  new Model('grok-code-fast', 0, false),
  new Model('grok-code-fast-1', 0, false),

  // Premium models with multipliers
  new Model('gpt-5.0', 1, true),
  new Model('o3', 1, true),
  new Model('o3-mini', 0.33, true),
  new Model('o4-mini', 0.33, true),
  new Model('claude-3.7-sonnet-thought', 1.25, true),
  new Model('claude-3.7-sonnet', 1, true),
  new Model('claude-4.0-sonnet', 1, true),
  new Model('claude-opus-4', 10, true),
  new Model('claude-opus-4.1', 10, true),
  new Model('gemini-2.0-flash', 0.25, true),
  new Model('gemini-2.5-pro', 1, true),

  // Default multiplier for unknown models
  new Model('unknown', 1, true),
];

/**
 * Multiplier map keyed by model name for quick lookups.
 */
export const MODEL_MULTIPLIERS: Record<string, number> = KNOWN_MODELS.reduce(
  (acc, model) => {
    acc[model.name] = model.multiplier;
    return acc;
  },
  {} as Record<string, number>
);

/**
 * Dollar cost applied per Premium Request Unit (PRU).
 */
export const SERVICE_VALUE_RATE = 0.04;
