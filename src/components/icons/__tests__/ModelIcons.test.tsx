import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { getModelIcon } from '../ModelIcons';

const renderModelIcon = (modelName: string): string => {
  const Icon = getModelIcon(modelName);
  return renderToStaticMarkup(<Icon />);
};

describe('getModelIcon', () => {
  it('should use configured vendor icons for known models', () => {
    expect(renderModelIcon('GPT-5.6 Sol')).toContain('M22.2819 9.8211');
    expect(renderModelIcon('Claude Opus 5')).toContain('M17.3041 3.541');
    expect(renderModelIcon('Gemini 3.8 Flash')).toContain('<linearGradient');
    expect(renderModelIcon('gemini-3.1-pro-preview')).toContain('<linearGradient');
    expect(renderModelIcon('MAI-Code-1.1-Flash')).toContain('fill="#F25022"');
    expect(renderModelIcon('Kimi K3')).toContain('m1.053 16.91');
    expect(renderModelIcon('Grok 4.7')).toContain('M14.234 10.162');
  });

  it('should use the GitHub icon for GitHub models', () => {
    expect(renderModelIcon('Goldeneye')).toContain('M12.5.75C6.146.75');
    expect(renderModelIcon('Raptor mini')).toContain('M12.5.75C6.146.75');
  });

  it('should use model config normalization when resolving vendors', () => {
    expect(renderModelIcon('  CLAUDE_OPUS_5  ')).toContain('M17.3041 3.541');
  });

  it('should use the default icon for models missing from the config', () => {
    expect(renderModelIcon('gpt-made-up')).toContain('<circle');
  });
});
