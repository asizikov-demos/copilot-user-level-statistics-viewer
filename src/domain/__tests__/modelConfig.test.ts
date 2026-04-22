import { describe, it, expect } from 'vitest';
import { getModelMultiplier, isPremiumModel, classifyModelBucket, MODEL_MULTIPLIERS, KNOWN_MODELS } from '../modelConfig';

describe('modelConfig', () => {
  describe('getModelMultiplier', () => {
    it('should return correct multiplier for exact model name match', () => {
      const testCases = [
        { model: 'gpt-4o', expected: 0 },
        { model: 'gpt-5', expected: 1 },
        { model: 'claude-3.5-sonnet', expected: 1 },
        { model: 'claude-opus-4.7', expected: 7.5 },
        { model: 'claude-opus-4.6-fast-mode', expected: 30 },
        { model: 'claude-opus-4.6-fast-mode-preview', expected: 30 },
        { model: 'o3-mini', expected: 0.33 },
        { model: 'gemini-2.0-flash', expected: 0.25 },
        { model: 'gpt-5.4-nano', expected: 0.25 },
      ];

      testCases.forEach(({ model, expected }) => {
        expect(getModelMultiplier(model)).toBe(expected);
      });
    });

    it('should handle case-insensitive matching', () => {
      const testCases = [
        { model: 'GPT-4O', expected: 0 },
        { model: 'Claude-3.5-Sonnet', expected: 1 },
        { model: 'Claude Opus 4.7', expected: 7.5 },
        { model: 'GEMINI-2.0-FLASH', expected: 0.25 },
      ];

      testCases.forEach(({ model, expected }) => {
        expect(getModelMultiplier(model)).toBe(expected);
      });
    });

    it('should handle trailing/leading spaces', () => {
      expect(getModelMultiplier('  gpt-4o  ')).toBe(0);
      expect(getModelMultiplier(' claude-3.5-sonnet ')).toBe(1);
    });

    it('should use partial matching for model name variations', () => {
      // Fuzzy matching should find models by substring
      // For example, a model name containing "claude-opus-4" should match "claude-opus-4"
      const testCases = [
        { model: 'claude-opus-4-special', expected: 10 }, // Should match claude-opus-4
        { model: 'claude-opus-4.6-custom', expected: 3 }, // Should prefer claude-opus-4.6 over claude-opus-4
        { model: 'claude-opus-4.7-custom', expected: 7.5 }, // Should prefer claude-opus-4.7 over claude-opus-4
        { model: 'gpt-4o-special-edition', expected: 0 }, // Should match gpt-4o
      ];

      testCases.forEach(({ model, expected }) => {
        expect(getModelMultiplier(model)).toBe(expected);
      });
    });

    it('should return unknown multiplier for completely unknown models', () => {
      const unknownMultiplier = MODEL_MULTIPLIERS['unknown'];

      expect(getModelMultiplier('some-random-model-xyz')).toBe(unknownMultiplier);
      expect(getModelMultiplier('totally-made-up-123')).toBe(unknownMultiplier);
    });

    it('should not match unknown during fuzzy search', () => {
      // A model containing "unknown" shouldn't get special treatment
      const result = getModelMultiplier('my-unknown-model');
      // It should get the unknown multiplier through fallback, not fuzzy match
      expect(result).toBe(MODEL_MULTIPLIERS['unknown']);
    });

    it('should handle empty string gracefully', () => {
      const unknownMultiplier = MODEL_MULTIPLIERS['unknown'];
      expect(getModelMultiplier('')).toBe(unknownMultiplier);
    });
  });

  describe('isPremiumModel', () => {
    it('should correctly identify premium models', () => {
      const premiumModels = [
        'gpt-5',
        'claude-3.5-sonnet',
        'claude-opus-4',
        'o3',
        'gemini-2.5-pro',
        'gpt-5.4-nano',
        'auto',
      ];

      premiumModels.forEach((model) => {
        expect(isPremiumModel(model)).toBe(true);
      });
    });

    it('should correctly identify non-premium (included) models', () => {
      const includedModels = [
        'gpt-4.0',
        'gpt-4o',
        'gpt-4o-mini',
        'gpt-3.5',
        'grok-code-fast',
      ];

      includedModels.forEach((model) => {
        expect(isPremiumModel(model)).toBe(false);
      });
    });

    it('should treat zero-multiplier models as non-premium', () => {
      // Zero multiplier means included in base tier
      expect(isPremiumModel('gpt-4o')).toBe(false);
      expect(getModelMultiplier('gpt-4o')).toBe(0);
    });

    it('should treat unknown models as premium (conservative default)', () => {
      expect(isPremiumModel('totally-unknown-model')).toBe(true);
      expect(isPremiumModel('xyz-123')).toBe(true);
    });

    it('should handle case-insensitive matching for premium detection', () => {
      expect(isPremiumModel('GPT-5')).toBe(true);
      expect(isPremiumModel('Claude Opus 4.7')).toBe(true);
      expect(isPremiumModel('GPT-4O')).toBe(false);
    });

    it('should use partial matching for premium detection', () => {
      // Should match by partial name
      expect(isPremiumModel('claude-opus-4-custom')).toBe(true);
    });
  });

  describe('MODEL_MULTIPLIERS and KNOWN_MODELS consistency', () => {
    it('should have consistent multiplier values between Model class and multiplier map', () => {
      KNOWN_MODELS.forEach((model) => {
        const mapValue = MODEL_MULTIPLIERS[model.name.toLowerCase().trim()];
        expect(mapValue).toBe(model.multiplier);
      });
    });

    it('should have unknown model defined', () => {
      const unknownModel = KNOWN_MODELS.find(m => m.name === 'unknown');
      expect(unknownModel).toBeDefined();
      expect(unknownModel?.multiplier).toBeDefined();
    });
  });

  describe('classifyModelBucket', () => {
    it('should classify standard models', () => {
      expect(classifyModelBucket('gpt-4o')).toBe('standard');
    });

    it('should classify premium models', () => {
      expect(classifyModelBucket('claude-3.5-sonnet')).toBe('premium');
      expect(classifyModelBucket('gpt-5')).toBe('premium');
    });

    it('should classify unknown models', () => {
      expect(classifyModelBucket('unknown')).toBe('unknown');
      expect(classifyModelBucket('')).toBe('unknown');
    });

    it('should treat unrecognized models as premium', () => {
      expect(classifyModelBucket('totally-made-up')).toBe('premium');
    });
  });
});
