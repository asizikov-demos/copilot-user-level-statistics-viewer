import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import TopEntriesList from '../TopEntriesList';

const TestIcon = () => <svg data-icon="test" />;

describe('TopEntriesList', () => {
  it('renders the shared empty state', () => {
    const markup = renderToStaticMarkup(<TopEntriesList entries={[]} />);

    expect(markup).toContain('No data');
  });

  it('renders formatted entries with icons, raw-name titles, and unique-user totals', () => {
    const markup = renderToStaticMarkup(
      <TopEntriesList
        entries={[{ name: 'gpt-4o', total: 1234, uniqueUsers: 56 }]}
        formatName={(name) => `Formatted ${name}`}
        getIcon={() => TestIcon}
      />
    );

    expect(markup).toContain('Formatted gpt-4o');
    expect(markup).toContain('title="gpt-4o"');
    expect(markup).toContain('title="56 users"');
    expect(markup).toContain('1,234');
    expect(markup).toContain('data-icon="test"');
  });

  it('renders plain-text entries without requiring an icon callback', () => {
    const markup = renderToStaticMarkup(
      <TopEntriesList entries={[{ name: 'TypeScript', total: 7, uniqueUsers: 3 }]} />
    );

    expect(markup).toContain('TypeScript');
    expect(markup).toContain('title="3 users"');
    expect(markup).not.toContain('data-icon=');
  });
});
