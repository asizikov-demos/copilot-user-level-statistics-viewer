import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import ChartContainer from '../ChartContainer';

describe('ChartContainer', () => {
  it('renders the title, description, stats, summary stats and chart slot', () => {
    const markup = renderToStaticMarkup(
      <ChartContainer
        title="Engagement"
        description="Daily activity"
        stats={[{ label: 'Peak', value: 12, color: 'stat-color' }, { label: 'Ratio', value: Number.NaN }]}
        summaryStats={[{ value: 5, label: 'Users', sublabel: 'active', colorClass: 'summary-color' }]}
        chartHeight="h-64"
        footer="Footnote"
      >
        <canvas />
      </ChartContainer>
    );

    expect(markup).toContain('data-component="ChartContainer"');
    expect(markup).toMatch(/<h3[^>]*>Engagement<\/h3>/);
    expect(markup).toContain('Daily activity');
    expect(markup).toContain('<span class="stat-color">12</span>');
    expect(markup).toContain('N/A');
    expect(markup).toMatch(/class="[^"]*summary-color[^"]*">5</);
    expect(markup).toContain('active');
    expect(markup).toMatch(/class="[^"]* h-64"><canvas>/);
    expect(markup).not.toContain('autoHeight');
    expect(markup).toContain('Footnote');
  });

  it('marks self-sizing chart slots so print keeps their natural height', () => {
    const markup = renderToStaticMarkup(
      <ChartContainer title="Summary" chartHeight="h-auto">
        <ul />
      </ChartContainer>
    );

    expect(markup).toMatch(/class="[^"]*autoHeight[^"]* h-auto"><ul>/);
  });

  it('renders the empty state instead of the chart', () => {
    const markup = renderToStaticMarkup(
      <ChartContainer title="Engagement" isEmpty emptyState="Nothing yet">
        <canvas />
      </ChartContainer>
    );

    expect(markup).toContain('data-empty="true"');
    expect(markup).toContain('Nothing yet');
    expect(markup).not.toContain('<canvas');
  });
});
