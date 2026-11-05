import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { IDE_METADATA_BY_KEY } from '../../../utils/ideMetadata';
import { getIDEIcon } from '../IDEIcons';

describe('client icons', () => {
  it.each([16, 24] as const)('renders all registered marks at %ipx without size overrides', size => {
    for (const client of Object.keys(IDE_METADATA_BY_KEY)) {
      const Icon = getIDEIcon(client);
      const markup = renderToStaticMarkup(<Icon size={size} />);
      expect(markup, client).toContain(`width="${size}"`);
      expect(markup, client).toContain(`height="${size}"`);
      expect(markup, client).not.toMatch(/class="[^"]*\b[wh]-5\b/);
      if (markup.includes('<svg')) {
        expect(markup, client).toContain('aria-hidden="true"');
      } else {
        expect(markup, client).toContain('alt=""');
      }
    }
  });

  it('uses compact native Octicons for Copilot, GitHub and the generic fallback', () => {
    for (const [client, iconClass] of [
      ['copilot_cli', 'octicon-copilot'],
      ['copilot_app', 'octicon-copilot'],
      ['github_web', 'octicon-mark-github'],
      ['unknown-client', 'octicon-terminal'],
    ]) {
      const Icon = getIDEIcon(client);
      const markup = renderToStaticMarkup(<Icon />);
      expect(markup).toContain(iconClass);
      expect(markup).toContain('width="16"');
      expect(markup).toContain('viewBox="0 0 16 16"');
    }
    const CliIcon = getIDEIcon('copilot_cli');
    expect(renderToStaticMarkup(<CliIcon />)).toContain('fill="#6E40C9"');
  });
});
