import { describe, it, expect } from 'vitest';
import {
  classifyModelRequest,
  getModelCategory,
  getModelVendor,
  isActiveAutoModeFeature,
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
          category: expect.stringMatching(/^(Lightweight|Powerful|Versatile)$/),
          vendor: expectedVendor,
        });
        expect(getModelCategory(model.name)).toBe(model.category);
      }
    });

    it.each([
      ['  GPT_6_LUNA  ', 'gpt-6-luna', 'Lightweight', 'OpenAI'],
      ['GPT-6.1 Sol', 'gpt-6.1-sol', 'Powerful', 'OpenAI'],
      ['Claude Sonnet 5.5', 'claude-sonnet-5.5', 'Versatile', 'Anthropic'],
      ['Claude 4.5 Haiku', 'claude-4.5-haiku', 'Versatile', 'Anthropic'],
      ['Gemini 3.1 Pro Preview', 'gemini-3.1-pro-preview', 'Powerful', 'Google'],
      ['  GROK_4.7  ', 'grok-4.7', 'Versatile', 'xAI'],
      ['MAI-Code-1.1-Flash', 'mai-code-1.1-flash', 'Lightweight', 'Microsoft'],
      ['Raptor mini', 'raptor-mini', 'Versatile', 'GitHub'],
    ])('resolves the display name or alias %j to %s', (alias, canonical, category, vendor) => {
      expect(classifyModelRequest(alias)).toEqual({ normalizedModel: canonical, isUnknown: false, isKnownModel: true });
      expect(getModelCategory(alias)).toBe(category);
      expect(getModelVendor(alias)).toBe(vendor);
    });

    it.each(['auto', 'unknown', '', 'totally-made-up', 'legacy-model'])(
      'does not treat %j as a known model',
      modelName => {
        expect(isKnownModelName(modelName)).toBe(false);
        expect(getModelCategory(modelName)).toBeUndefined();
        expect(getModelVendor(modelName)).toBeUndefined();
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
