import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { getCustomModelIcon, getModelIcon, getVendorIcon } from '../ModelIcons';

const renderModelIcon = (modelName: string): string => {
  const Icon = getModelIcon(modelName);
  return renderToStaticMarkup(<Icon />);
};

describe('getModelIcon', () => {
  it.each([
    ['an OpenAI model', 'GPT-5.6 Sol', 'M22.2819 9.8211'],
    ['an Anthropic model', 'Claude Opus 5', 'M17.3041 3.541'],
    ['the Fable 5.1 report spelling', 'claude-fable-5-1', 'M17.3041 3.541'],
    ['a Google model', 'Gemini 3.8 Flash', '<linearGradient'],
    ['a GitHub model', 'Raptor mini', 'octicon-mark-github'],
    ['a Microsoft model', 'MAI-Code-1.1-Flash', 'fill="#F25022"'],
    ['a Moonshot AI model', 'Kimi K3', 'm1.053 16.91'],
    ['an xAI model', 'Grok 4.7', 'M14.234 10.162'],
    ['the Grok 4 report spelling', 'grok-4', 'M14.234 10.162'],
    ['a normalized model name', '  CLAUDE_OPUS_5  ', 'M17.3041 3.541'],
    ['an unknown model', 'gpt-made-up', 'octicon-ai-model'],
  ])('resolves the icon for %s', (_case, modelName, expectedPath) => {
    expect(renderModelIcon(modelName)).toContain(expectedPath);
  });

  describe('getCustomModelIcon', () => {
    it.each([
      ['claude-opus-5-5', 'claude-opus-5.5'],
      ['claude-sonnet-5-5', 'claude-sonnet-5.5'],
      ['gpt-5.5', 'gpt-5.5'],
      ['gpt-5-5', 'gpt-5.5'],
      ['  GEMINI_3_8_FLASH  ', 'gemini-3.8-flash'],
      ['mai-code-1-1-flash', 'mai-code-1.1-flash'],
      ['kimi-k3', 'kimi-k3'],
    ])('matches the vendor icon for reported spelling %s without changing catalog classification', (reported, canonical) => {
      expect(getCustomModelIcon(reported)).toBe(getModelIcon(canonical));
    });

    it.each(['smart-router', 'claude-made-up', 'gpt-99-9', 'Foundry Anthropic/claude-opus-5-5'])(
      'does not guess a vendor for %s',
      model => expect(getCustomModelIcon(model)).toBe(getVendorIcon('Unattributed')),
    );
  });

  it.each([16, 24] as const)('renders vendor marks and the unattributed fallback at %ipx', size => {
    for (const vendor of ['Anthropic', 'GitHub', 'Google', 'Microsoft', 'Moonshot AI', 'OpenAI', 'xAI', 'Unattributed'] as const) {
      const Icon = getVendorIcon(vendor);
      const markup = renderToStaticMarkup(<Icon size={size} />);
      expect(markup).toContain(`width="${size}"`);
      expect(markup).toContain(`height="${size}"`);
      expect(markup).toContain('aria-hidden="true"');
      expect(markup).not.toContain('w-5');
    }
  });

  it('uses the same model fallback for unknown names and unattributed vendors', () => {
    const Icon = getVendorIcon('Unattributed');
    expect(renderModelIcon('unknown')).toBe(renderToStaticMarkup(<Icon />));
    expect(renderModelIcon('unknown')).toContain('width="16"');
  });
});
