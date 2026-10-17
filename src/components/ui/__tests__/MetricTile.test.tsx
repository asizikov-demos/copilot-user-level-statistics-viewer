import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import MetricTile from '../MetricTile';
import MetricTileIcon from '../icons/MetricTileIcon';

describe('MetricTile', () => {
  it('renders decorative accents as neutral, non-interactive groups', () => {
    const markup = renderToStaticMarkup(
      <MetricTile title="Unique users" value={1234} accent="blue" icon={<MetricTileIcon name="unique-users" />} />
    );

    expect(markup).toMatch(/^<div role="group" aria-label="Unique users"/);
    expect(markup).toContain('data-component="MetricTile"');
    expect(markup).toContain('data-role="neutral"');
    expect(markup).toContain((1234).toLocaleString());
    expect(markup).toContain('octicon-people');
    expect(markup).not.toContain('octicon-chevron-right');
  });

  it('keeps status accents and renders interactive tiles as buttons with phrasing content', () => {
    const markup = renderToStaticMarkup(
      <MetricTile
        title="Outdated plugins"
        value={null}
        subtitle="Needs upgrade"
        accent="red"
        size="md"
        icon={<MetricTileIcon name="plugin-outdated" />}
        onClick={() => undefined}
        interactive
      />
    );

    expect(markup).toMatch(/^<button type="button"/);
    expect(markup).toContain('data-role="danger"');
    expect(markup).toContain('data-size="md"');
    expect(markup).toContain('data-interactive="true"');
    expect(markup).toContain('N/A');
    expect(markup).toContain('Needs upgrade');
    expect(markup).toContain('octicon-chevron-right');
    expect(markup).not.toMatch(/<(p|div)[\s>]/);
  });

  it('marks disabled tiles without wiring the click handler', () => {
    const markup = renderToStaticMarkup(
      <MetricTile title="Agents" value={2} accent="green" icon={null} onClick={() => undefined} disabled />
    );

    expect(markup).toContain('aria-disabled="true"');
    expect(markup).toContain('data-disabled="true"');
    expect(markup).toContain('data-role="success"');
  });
});
