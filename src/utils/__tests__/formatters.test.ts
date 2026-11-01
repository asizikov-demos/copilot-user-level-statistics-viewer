import { describe, expect, it } from 'vitest';
import { KNOWN_MODELS } from '../../domain/modelConfig';
import { formatModelDisplayName } from '../formatters';

describe('formatModelDisplayName', () => {
  it('uses the catalog display name for every known model', () => {
    for (const model of KNOWN_MODELS) {
      expect(formatModelDisplayName(model.name)).toBe(model.displayName);
    }
  });

  it('falls back to capitalized, space-separated names for unrecognized models', () => {
    expect(formatModelDisplayName('some-new-model')).toBe('Some new model');
  });

  it.each(['', 'unknown'])('labels %j as Unknown Model', modelName => {
    expect(formatModelDisplayName(modelName)).toBe('Unknown Model');
  });
});
