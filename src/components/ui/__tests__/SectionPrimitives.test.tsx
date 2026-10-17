import { renderToStaticMarkup } from 'react-dom/server';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { describe, expect, it } from 'vitest';
import DisclosureSection from '../DisclosureSection';
import ExpandableInlineList from '../ExpandableInlineList';
import InsightsCard from '../InsightsCard';
import SectionHeader from '../SectionHeader';
import StatsCardGroup from '../StatsCardGroup';

describe('SectionHeader', () => {
  it('renders a level-two heading, description and back button', () => {
    const markup = renderToStaticMarkup(
      <SectionHeader title="Languages" description="Language usage" onBack={() => undefined} />
    );

    expect(markup).toMatch(/<h2[^>]*>Languages<\/h2>/);
    expect(markup).toContain('Language usage');
    expect(markup).toContain('Back to Overview');
    expect(markup).toContain('octicon-arrow-left');
  });

  it('omits the back button without a handler', () => {
    const markup = renderToStaticMarkup(<SectionHeader title="Languages" />);

    expect(markup).not.toContain('<button');
  });
});

describe('InsightsCard', () => {
  it('maps the legacy variant to a semantic role', () => {
    const markup = renderToStaticMarkup(
      <InsightsCard title="Insight" variant="green">Body copy</InsightsCard>
    );

    expect(markup).toContain('data-role="success"');
    expect(markup).toMatch(/<h4[^>]*>Insight<\/h4>/);
    expect(markup).toContain('octicon-light-bulb');
    expect(markup).toContain('Body copy');
  });

  it('defaults to the accent role and accepts a custom icon', () => {
    const markup = renderToStaticMarkup(
      <InsightsCard title="Insight" icon={<svg data-icon="custom" />}>Body</InsightsCard>
    );

    expect(markup).toContain('data-role="accent"');
    expect(markup).toContain('data-icon="custom"');
    expect(markup).not.toContain('octicon-light-bulb');
  });
});

describe('StatsCardGroup', () => {
  it('renders the configured heading level and string description', () => {
    const markup = renderToStaticMarkup(
      <StatsCardGroup
        title="Summary"
        description="Totals"
        headingTag="h4"
        items={['a', 'b']}
        renderItem={(item) => <span>{item}</span>}
      />
    );

    expect(markup).toMatch(/<h4[^>]*>Summary<\/h4>/);
    expect(markup).toContain('Totals');
    expect(markup).toContain('<span>a</span><span>b</span>');
  });

  it('renders nothing without items', () => {
    expect(renderToStaticMarkup(<StatsCardGroup items={[]} renderItem={() => null} />)).toBe('');
  });
});

describe('DisclosureSection', () => {
  it('toggles content and the chevron state', async () => {
    let renderer: ReactTestRenderer | undefined;
    await act(async () => {
      renderer = create(<DisclosureSection label="Details"><p>Hidden content</p></DisclosureSection>);
    });

    try {
      const root = renderer!.root;
      const button = root.findByType('button');
      expect(button.props['aria-expanded']).toBe(false);
      expect(root.findAllByType('p')).toHaveLength(0);

      await act(async () => { button.props.onClick(); });

      expect(root.findByType('button').props['aria-expanded']).toBe(true);
      expect(root.findByProps({ 'data-expanded': 'true' })).toBeDefined();
      expect(root.findByType('p').children).toEqual(['Hidden content']);
    } finally {
      await act(async () => { renderer?.unmount(); });
    }
  });
});

describe('ExpandableInlineList', () => {
  it('renders the toggle as a Primer link button wired to the list', () => {
    const markup = renderToStaticMarkup(
      <ExpandableInlineList items={['a', 'b', 'c', 'd']} initialCount={2} contentId="users" />
    );

    expect(markup).toContain('<span id="users"');
    expect(markup).toContain('a, b...');
    expect(markup).toMatch(/<button[^>]*type="button"[^>]*aria-expanded="false"[^>]*aria-controls="users"[^>]*>Show All 4<\/button>/);
  });
});
