import { describe, expect, it } from 'vitest';
import { collectModelsFromValue } from './models-list';

describe('collectModelsFromValue', () => {
  it('normalizes model values with the canonical domain rules', () => {
    const models = new Set<string>();

    collectModelsFromValue(
      {
        model: ' Claude Opus 4.6 (fast mode) ',
        nested: [
          { model: 'GPT_4O' },
          { model: ' ( unknown ) ' },
        ],
      },
      models,
    );

    expect(Array.from(models).sort()).toEqual([
      'claude-opus-4.6-fast-mode',
      'gpt-4o',
      'unknown',
    ]);
  });

  it('skips model values that normalize to an empty string', () => {
    const models = new Set<string>();

    collectModelsFromValue(
      {
        model: '   ',
        nested: {
          model: '()',
        },
      },
      models,
    );

    expect(Array.from(models)).toEqual([]);
  });
});
