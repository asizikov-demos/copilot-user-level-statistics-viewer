import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { getModelIcon } from '../ModelIcons';

const renderModelIcon = (modelName: string): string => {
  const Icon = getModelIcon(modelName);
  return renderToStaticMarkup(<Icon />);
};

describe('getModelIcon', () => {
  it.each([
    ['an OpenAI model', 'GPT-5.6 Sol', 'M22.2819 9.8211'],
    ['an Anthropic model', 'Claude Opus 5', 'M17.3041 3.541'],
    ['a Google model', 'Gemini 3.8 Flash', '<linearGradient'],
    ['a GitHub model', 'Raptor mini', 'M12.5.75C6.146.75'],
    ['a Microsoft model', 'MAI-Code-1.1-Flash', 'fill="#F25022"'],
    ['a Moonshot AI model', 'Kimi K3', 'm1.053 16.91'],
    ['an xAI model', 'Grok 4.7', 'M14.234 10.162'],
    ['a normalized model name', '  CLAUDE_OPUS_5  ', 'M17.3041 3.541'],
    ['an unknown model', 'gpt-made-up', '<circle'],
  ])('resolves the icon for %s', (_case, modelName, expectedPath) => {
    expect(renderModelIcon(modelName)).toContain(expectedPath);
  });
});
