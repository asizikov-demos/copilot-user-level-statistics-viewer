import { describe, it, expect } from 'vitest';
import { isActiveAutoModeFeature } from '../autoMode';
import {
  classifyModelRequest,
  isKnownModelName,
  isUnknownModelName,
  KNOWN_MODELS,
  normalizeModelName,
} from '../modelConfig';

describe('modelConfig', () => {
  describe('normalizeModelName', () => {
    it('should normalize casing, whitespace, underscores, and parentheses', () => {
      expect(normalizeModelName('  Claude Opus 4.6 (fast mode)  ')).toBe('claude-opus-4.6-fast-mode');
      expect(normalizeModelName('GPT_4O')).toBe('gpt-4o');
      expect(normalizeModelName('Gemini   3.5   Flash')).toBe('gemini-3.5-flash');
    });

    it('should collapse repeated separators', () => {
      expect(normalizeModelName('claude---opus___4.7')).toBe('claude-opus-4.7');
    });

    it('should preserve empty models and strip wrapper punctuation from unknown aliases', () => {
      expect(normalizeModelName('   ')).toBe('');
      expect(normalizeModelName(' ( UNKNOWN ) ')).toBe('unknown');
    });
  });

  describe('known model catalog', () => {
    it('should keep model entries name-only', () => {
      const model = KNOWN_MODELS.find(entry => entry.name === 'gpt-5');

      expect(model).toEqual({ name: 'gpt-5' });
    });

    it('should include the unknown sentinel', () => {
      expect(KNOWN_MODELS.some(model => model.name === 'unknown')).toBe(true);
    });

    it('should recognize known models after normalization', () => {
      expect(isKnownModelName('GPT-5')).toBe(true);
      expect(isKnownModelName('Claude Opus 4.6 (fast mode)')).toBe(true);
      expect(isKnownModelName('Gemini 3.5 Flash')).toBe(true);
    });

    it('should not treat arbitrary non-empty model names as known models', () => {
      expect(isKnownModelName('totally-made-up')).toBe(false);
      expect(isKnownModelName('unknown')).toBe(false);
      expect(isKnownModelName('')).toBe(false);
    });
  });

  describe('unknown model detection', () => {
    it('should identify only empty model names and the unknown sentinel as unknown', () => {
      expect(isUnknownModelName('unknown')).toBe(true);
      expect(isUnknownModelName(' UNKNOWN ')).toBe(true);
      expect(isUnknownModelName('')).toBe(true);
      expect(isUnknownModelName('totally-unknown-model')).toBe(false);
      expect(isUnknownModelName('gpt-5')).toBe(false);
    });
  });

  describe('classifyModelRequest', () => {
    it('should return normalized model metadata for known aliases', () => {
      expect(classifyModelRequest('Claude Opus 4.6 (fast mode)')).toEqual({
        normalizedModel: 'claude-opus-4.6-fast-mode',
        isUnknown: false,
        isKnownModel: true,
      });
    });

    it('should preserve unknown and empty detection for aggregation', () => {
      expect(classifyModelRequest('unknown')).toEqual({
        normalizedModel: 'unknown',
        isUnknown: true,
        isKnownModel: false,
      });
      expect(classifyModelRequest('')).toEqual({
        normalizedModel: '',
        isUnknown: true,
        isKnownModel: false,
      });
      expect(classifyModelRequest(' ( unknown ) ')).toEqual({
        normalizedModel: 'unknown',
        isUnknown: true,
        isKnownModel: false,
      });
    });

    it('should leave unrecognized non-empty models out of unknown totals', () => {
      expect(classifyModelRequest('some-random-model')).toEqual({
        normalizedModel: 'some-random-model',
        isUnknown: false,
        isKnownModel: false,
      });
    });
  });

  describe('isActiveAutoModeFeature', () => {
    const makeFeature = (
      model: string,
      user_initiated_interaction_count = 0,
      code_generation_activity_count = 0,
      code_acceptance_activity_count = 0
    ) => ({ model, user_initiated_interaction_count, code_generation_activity_count, code_acceptance_activity_count });

    it('should return true when model is "auto" and interactions are greater than zero', () => {
      expect(isActiveAutoModeFeature(makeFeature('auto', 5))).toBe(true);
    });

    it('should return true when model is "auto" and only generation activity is greater than zero', () => {
      expect(isActiveAutoModeFeature(makeFeature('auto', 0, 3))).toBe(true);
    });

    it('should return true when model is "auto" and only acceptance activity is greater than zero', () => {
      expect(isActiveAutoModeFeature(makeFeature('auto', 0, 0, 2))).toBe(true);
    });

    it('should return false when model is "auto" but all activity counts are zero', () => {
      expect(isActiveAutoModeFeature(makeFeature('auto', 0, 0, 0))).toBe(false);
    });

    it('should return false when model is not "auto"', () => {
      expect(isActiveAutoModeFeature(makeFeature('gpt-4o', 10))).toBe(false);
    });

    it('should normalize aliases with extra spaces to "auto"', () => {
      expect(isActiveAutoModeFeature(makeFeature('  Auto  ', 1))).toBe(true);
    });

    it('should normalize uppercase "AUTO" to "auto"', () => {
      expect(isActiveAutoModeFeature(makeFeature('AUTO', 1))).toBe(true);
    });

    it('should return false when auto activity counts are negative', () => {
      expect(isActiveAutoModeFeature(makeFeature('auto', -1, -2, -3))).toBe(false);
    });
  });
});
