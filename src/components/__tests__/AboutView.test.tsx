import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import AboutView from '../AboutView';

describe('AboutView', () => {
  it('renders the repository link as a Primer button', () => {
    const markup = renderToStaticMarkup(<AboutView />);

    expect(markup).toMatch(
      /<a[^>]*href="https:\/\/github\.com\/asizikov-demos\/copilot-user-level-statistics-viewer"[^>]*>/,
    );
    expect(markup).toMatch(/<a[^>]*class="[^"]*prc-Button-ButtonBase-[^"]*"/);
    expect(markup).toMatch(/<a[^>]*target="_blank"[^>]*rel="noopener noreferrer"|<a[^>]*rel="noopener noreferrer"[^>]*target="_blank"/);
    expect(markup).toContain('View source on GitHub');
    expect(markup).toContain('octicon-mark-github');
  });
});
