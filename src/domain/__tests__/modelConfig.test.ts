import { describe, it, expect } from 'vitest';
import {
  classifyModelRequest,
  getModelCategory,
  getModelDisplayName,
  getModelVendor,
  isActiveAutoModeFeature,
  isCustomProviderModel,
  isKnownModelName,
  isUnknownModelName,
  KNOWN_MODELS,
  normalizeModelName,
} from '../modelConfig';

describe('modelConfig', () => {
  describe('normalizeModelName', () => {
    it.each([
      ['  Claude Opus 4.6 (fast mode)  ', 'claude-opus-4.6-fast-mode'],
      ['GPT_4O', 'gpt-4o'],
      ['Gemini   3.5   Flash', 'gemini-3.5-flash'],
      ['claude---opus___4.7', 'claude-opus-4.7'],
    ])('normalizes %j to %s', (input, expected) => {
      expect(normalizeModelName(input)).toBe(expected);
    });
  });

  describe('known model catalog', () => {
    // Pricing-table snapshot checked on 2026-11-10; context tiers share model identities.
    // https://docs.github.com/en/copilot/reference/copilot-billing/models-and-pricing
    it.each([
      ['GPT-5.3-Codex', 'Powerful', 'OpenAI'],
      ['GPT-5.4 nano', 'Lightweight', 'OpenAI'],
      ['GPT-5.6 Luna', 'Lightweight', 'OpenAI'],
      ['GPT-5.6 Sol', 'Powerful', 'OpenAI'],
      ['GPT-5.6 Terra', 'Versatile', 'OpenAI'],
      ['GPT-6 Astra', 'Powerful', 'OpenAI'],
      ['GPT-6 Luna', 'Lightweight', 'OpenAI'],
      ['GPT-6 Sol', 'Powerful', 'OpenAI'],
      ['GPT-6.1 Sol', 'Powerful', 'OpenAI'],
      ['GPT-6.1 Terra', 'Versatile', 'OpenAI'],
      ['Claude Haiku 4.5', 'Versatile', 'Anthropic'],
      ['Claude Haiku 5.5', 'Lightweight', 'Anthropic'],
      ['Claude Sonnet 4', 'Versatile', 'Anthropic'],
      ['Claude Sonnet 4.6', 'Versatile', 'Anthropic'],
      ['Claude Opus 4.8', 'Powerful', 'Anthropic'],
      ['Claude Opus 5', 'Powerful', 'Anthropic'],
      ['Claude Opus 5.5', 'Powerful', 'Anthropic'],
      ['Claude Sonnet 5', 'Versatile', 'Anthropic'],
      ['Claude Sonnet 5.5', 'Versatile', 'Anthropic'],
      ['Claude Opus 4.8 (fast mode) (preview)', 'Powerful', 'Anthropic'],
      ['Claude Fable 5', 'Powerful', 'Anthropic'],
      ['Claude Fable 5.1', 'Powerful', 'Anthropic'],
      ['Claude Fable 5.2', 'Powerful', 'Anthropic'],
      ['Gemini 3.8 Flash', 'Versatile', 'Google'],
      ['Gemini 4 Argon', 'Powerful', 'Google'],
      ['Gemini 4 Carbon', 'Powerful', 'Google'],
      ['MAI-Code-1.1-Flash', 'Lightweight', 'Microsoft'],
      ['Grok 4.5', 'Versatile', 'xAI'],
      ['Grok 4.6', 'Versatile', 'xAI'],
      ['Grok 4.7', 'Versatile', 'xAI'],
      ['Kimi K3', 'Powerful', 'Moonshot AI'],
    ])('matches the documented category and vendor for %s', (name, category, vendor) => {
      expect(isKnownModelName(name)).toBe(true);
      expect(getModelCategory(name)).toBe(category);
      expect(getModelVendor(name)).toBe(vendor);
      expect(getModelDisplayName(name)).toBe(name);
    });

    it('gives every catalog entry a display name for its own identity', () => {
      for (const model of KNOWN_MODELS) {
        expect(model.displayName.trim()).not.toBe('');
        expect(getModelDisplayName(model.name)).toBe(model.displayName);
      }
    });

    it.each([
      ['gpt-5.6-terra', 'GPT-5.6 Terra'],
      ['  GPT_6.1_TERRA  ', 'GPT-6.1 Terra'],
      ['claude-sonnet-5.5', 'Claude Sonnet 5.5'],
      ['claude-4.5-haiku', 'Claude 4.5 Haiku'],
      ['gemini-3.8-flash', 'Gemini 3.8 Flash'],
      ['gpt-4o', 'GPT-4o'],
      ['mai-code-1.1-flash', 'MAI-Code-1.1-Flash'],
      ['o3-mini', 'o3-mini'],
    ])('returns the canonical display name for %j', (modelName, expected) => {
      expect(getModelDisplayName(modelName)).toBe(expected);
    });

    it('recognizes every catalog entry with a valid category and the vendor of its model family', () => {
      const vendorByPrefix: Array<[string, string]> = [
        ['claude', 'Anthropic'],
        ['gemini', 'Google'],
        ['gpt', 'OpenAI'],
        ['o3', 'OpenAI'],
        ['o4', 'OpenAI'],
        ['grok', 'xAI'],
        ['kimi', 'Moonshot AI'],
        ['mai', 'Microsoft'],
        ['goldeneye', 'GitHub'],
        ['raptor-mini', 'GitHub'],
      ];

      for (const model of KNOWN_MODELS) {
        const expectedVendor = vendorByPrefix.find(([prefix]) => model.name.startsWith(prefix))?.[1];
        expect({
          known: isKnownModelName(model.name),
          classification: classifyModelRequest(model.name),
          category: getModelCategory(model.name),
          vendor: getModelVendor(model.name),
        }).toEqual({
          known: true,
          classification: { normalizedModel: normalizeModelName(model.name), isUnknown: false, isKnownModel: true },
          category: expect.stringMatching(/^(Lightweight|Powerful|Versatile|Image Generation)$/),
          vendor: expectedVendor,
        });
        expect(getModelCategory(model.name)).toBe(model.category);
      }
    });

    it.each([
      ['  GPT_6_LUNA  ', 'gpt-6-luna', 'Lightweight', 'OpenAI'],
      ['GPT-6.1 Sol', 'gpt-6.1-sol', 'Powerful', 'OpenAI'],
      ['gpt-6.1-terra', 'gpt-6.1-terra', 'Versatile', 'OpenAI'],
      ['  GPT_6.1_TERRA  ', 'gpt-6.1-terra', 'Versatile', 'OpenAI'],
      ['Claude Sonnet 5.5', 'claude-sonnet-5.5', 'Versatile', 'Anthropic'],
      ['Claude Fable 5.1', 'claude-fable-5.1', 'Powerful', 'Anthropic'],
      ['claude-fable-5-1', 'claude-fable-5-1', 'Powerful', 'Anthropic'],
      ['  CLAUDE_FABLE_5_1  ', 'claude-fable-5-1', 'Powerful', 'Anthropic'],
      ['Claude Fable 5.2', 'claude-fable-5.2', 'Powerful', 'Anthropic'],
      ['claude-fable-5-2', 'claude-fable-5-2', 'Powerful', 'Anthropic'],
      ['  CLAUDE_FABLE_5_2  ', 'claude-fable-5-2', 'Powerful', 'Anthropic'],
      ['Claude 4.5 Haiku', 'claude-4.5-haiku', 'Versatile', 'Anthropic'],
      ['Gemini 3.1 Pro Preview', 'gemini-3.1-pro-preview', 'Powerful', 'Google'],
      ['gemini-4-argon', 'gemini-4-argon', 'Powerful', 'Google'],
      ['Gemini 4 Argon', 'gemini-4-argon', 'Powerful', 'Google'],
      ['  GEMINI_4_ARGON  ', 'gemini-4-argon', 'Powerful', 'Google'],
      ['gemini-4-carbon', 'gemini-4-carbon', 'Powerful', 'Google'],
      ['Gemini 4 Carbon', 'gemini-4-carbon', 'Powerful', 'Google'],
      ['  GEMINI_4_CARBON  ', 'gemini-4-carbon', 'Powerful', 'Google'],
      ['gpt-image-2.5-flare', 'gpt-image-2.5-flare', 'Image Generation', 'OpenAI'],
      ['GPT Image 2.5 Flare', 'gpt-image-2.5-flare', 'Image Generation', 'OpenAI'],
      ['  GPT_IMAGE_2.5_FLARE  ', 'gpt-image-2.5-flare', 'Image Generation', 'OpenAI'],
      ['  GROK_4.7  ', 'grok-4.7', 'Versatile', 'xAI'],
      ['grok-4', 'grok-4', 'Versatile', 'xAI'],
      ['  GROK_4  ', 'grok-4', 'Versatile', 'xAI'],
      ['MAI-Code-1.1-Flash', 'mai-code-1.1-flash', 'Lightweight', 'Microsoft'],
      ['Raptor mini', 'raptor-mini', 'Versatile', 'GitHub'],
    ])('resolves the display name or alias %j to %s', (alias, canonical, category, vendor) => {
      expect(classifyModelRequest(alias)).toEqual({ normalizedModel: canonical, isUnknown: false, isKnownModel: true });
      expect(getModelCategory(alias)).toBe(category);
      expect(getModelVendor(alias)).toBe(vendor);
    });

    it('uses the Image Generation category for the documented image model', () => {
      expect(getModelCategory('GPT Image 2.5 Flare')).toBe('Image Generation');
      expect(getModelDisplayName('gpt-image-2.5-flare')).toBe('GPT Image 2.5 Flare');
    });

    it.each(['auto', 'unknown', '', 'totally-made-up', 'legacy-model'])(
      'does not treat %j as a known model',
      modelName => {
        expect(isKnownModelName(modelName)).toBe(false);
        expect(getModelCategory(modelName)).toBeUndefined();
        expect(getModelVendor(modelName)).toBeUndefined();
        expect(getModelDisplayName(modelName)).toBeUndefined();
      },
    );
  });

  describe('unknown model detection', () => {
    it.each([
      ['unknown', true],
      [' UNKNOWN ', true],
      ['', true],
      ['totally-unknown-model', false],
      ['gpt-5', false],
    ])('isUnknownModelName(%j) is %s', (modelName, expected) => {
      expect(isUnknownModelName(modelName)).toBe(expected);
    });
  });

  describe('classifyModelRequest', () => {
    it.each([
      ['Claude Opus 4.6 (fast mode)', { normalizedModel: 'claude-opus-4.6-fast-mode', isUnknown: false, isKnownModel: true }],
      ['unknown', { normalizedModel: 'unknown', isUnknown: true, isKnownModel: false }],
      ['', { normalizedModel: '', isUnknown: true, isKnownModel: false }],
      ['some-random-model', { normalizedModel: 'some-random-model', isUnknown: false, isKnownModel: false }],
    ])('classifies %j', (modelName, expected) => {
      expect(classifyModelRequest(modelName)).toEqual(expected);
    });
  });

  describe('isActiveAutoModeFeature', () => {
    it.each([
      { model: 'auto', counts: [5, 0, 0], expected: true },
      { model: 'auto', counts: [0, 3, 0], expected: true },
      { model: 'auto', counts: [0, 0, 2], expected: true },
      { model: '  Auto  ', counts: [1, 0, 0], expected: true },
      { model: 'AUTO', counts: [1, 0, 0], expected: true },
      { model: 'auto', counts: [0, 0, 0], expected: false },
      { model: 'auto', counts: [-1, -2, -3], expected: false },
      { model: 'gpt-4o', counts: [10, 0, 0], expected: false },
    ])('returns $expected for model $model with activity $counts', ({ model, counts, expected }) => {
      const [user_initiated_interaction_count, code_generation_activity_count, code_acceptance_activity_count] = counts;
      expect(isActiveAutoModeFeature({
        model,
        user_initiated_interaction_count,
        code_generation_activity_count,
        code_acceptance_activity_count,
      })).toBe(expected);
    });
  });
});

describe('isCustomProviderModel', () => {
  it('accepts provider/model and valid URLs but rejects malformed URLs', () => {
    expect(isCustomProviderModel('openrouter/llama')).toBe(true);
    expect(isCustomProviderModel('https://host.example/model')).toBe(true);
    expect(isCustomProviderModel('https://[invalid/model')).toBe(false);
    expect(isCustomProviderModel('gpt-5')).toBe(false);
  });
});
