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
    const total = 1234;
    const uniqueUsers = 56;
    const markup = renderToStaticMarkup(
      <TopEntriesList
        entries={[{ name: 'gpt-4o', total, uniqueUsers }]}
        formatName={(name) => `Formatted ${name}`}
        getIcon={() => TestIcon}
      />
    );

    expect(markup).toContain('Formatted gpt-4o');
    expect(markup).toContain('title="gpt-4o"');
    expect(markup).toContain(`title="${uniqueUsers.toLocaleString()} users"`);
    expect(markup).toContain(total.toLocaleString());
    expect(markup).toContain('aria-hidden="true"');
    expect(markup).toContain('data-icon="test"');
  });

  it('renders plain-text entries without requiring an icon callback', () => {
    const uniqueUsers = 3;
    const markup = renderToStaticMarkup(
      <TopEntriesList entries={[{ name: 'TypeScript', total: 7, uniqueUsers }]} />
    );

    expect(markup).toContain('TypeScript');
    expect(markup).toContain(`title="${uniqueUsers.toLocaleString()} users"`);
    expect(markup).not.toContain('data-icon=');
  });

  it('pluralizes unique-user tooltip labels', () => {
    const singularMarkup = renderToStaticMarkup(
      <TopEntriesList entries={[{ name: 'Model A', total: 1, uniqueUsers: 1 }]} />
    );

    expect(singularMarkup).toContain(`title="${(1).toLocaleString()} user"`);
  });
});
