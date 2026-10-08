import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { getModelIcon } from '../ModelIcons';

const renderModelIcon = (modelName: string): string => {
  const Icon = getModelIcon(modelName);
  return renderToStaticMarkup(<Icon />);
};

describe('getModelIcon', () => {
  it.each([
    ['a known model', 'Claude Opus 5', 'M17.3041 3.541'],
    ['a normalized model name', '  CLAUDE_OPUS_5  ', 'M17.3041 3.541'],
    ['an unknown model', 'gpt-made-up', '<circle'],
  ])('resolves the icon for %s', (_case, modelName, expectedPath) => {
    expect(renderModelIcon(modelName)).toContain(expectedPath);
  });
});
