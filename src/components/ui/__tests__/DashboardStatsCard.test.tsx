import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import DashboardStatsCard from '../DashboardStatsCard';

describe('DashboardStatsCard', () => {
  it('collapses decorative accents into a neutral card', () => {
    const markup = renderToStaticMarkup(<DashboardStatsCard label="Languages" value={42} accent="teal" />);

    expect(markup).toContain('data-component="DashboardStatsCard"');
    expect(markup).toContain('data-role="neutral"');
    expect(markup).toContain('data-tone="neutral"');
    expect(markup).toContain('data-size="lg"');
    expect(markup).toContain('Languages');
    expect(markup).toContain('42');
  });

  it('keeps status roles for tinted cards and shows a dash for missing values', () => {
    const markup = renderToStaticMarkup(
      <DashboardStatsCard label="LOC deleted" value={null} accent="rose" tone="tint" helperText="Across all users" />
    );

    expect(markup).toContain('data-role="danger"');
    expect(markup).toContain('data-tone="tint"');
    expect(markup).toContain('—');
    expect(markup).toContain('Across all users');
  });
});
