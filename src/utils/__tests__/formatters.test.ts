import { describe, expect, it } from 'vitest';
import { formatModelDisplayName } from '../formatters';

describe('formatModelDisplayName', () => {
  it.each([
    ['gpt-5.6-terra', 'GPT-5.6 Terra'],
    ['claude-sonnet-5.5', 'Claude Sonnet 5.5'],
    ['Gemini 3.8 Flash', 'Gemini 3.8 Flash'],
    ['grok-4.7', 'Grok 4.7'],
  ])('uses the canonical name for known model %j', (modelName, expected) => {
    expect(formatModelDisplayName(modelName)).toBe(expected);
  });

  it('falls back to capitalized, space-separated names for unrecognized models', () => {
    expect(formatModelDisplayName('some-new-model')).toBe('Some new model');
  });

  it.each(['', 'unknown'])('labels %j as Unknown Model', modelName => {
    expect(formatModelDisplayName(modelName)).toBe('Unknown Model');
  });
});
