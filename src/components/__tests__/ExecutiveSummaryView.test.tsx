import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { aggregateMetrics } from '../../domain/metricsAggregator';
import { makeMetric } from '../../__tests__/factories/metrics';
import { selectExecutiveSummaryReadModel } from '../../read-models/overview';
import ExecutiveSummaryView from '../ExecutiveSummaryView';

const model = selectExecutiveSummaryReadModel(aggregateMetrics([
  makeMetric({
    day: '2026-09-01',
    ai_credits_used: 1.25,
    loc_added_sum: -20,
    loc_deleted_sum: 10,
    used_cli: true,
  }),
  makeMetric({ day: '2026-09-03', ai_credits_used: 0.25 }),
]).aggregated);

describe('ExecutiveSummaryView', () => {
  it.each([
    { enterpriseName: 'Acme', enterpriseId: 'enterprise-123', expected: 'Acme' },
    { enterpriseName: null, enterpriseId: 'enterprise-123', expected: 'enterprise-123' },
    { enterpriseName: null, enterpriseId: null, expected: 'N/A' },
  ])('renders enterprise identity: $expected', ({ enterpriseName, enterpriseId, expected }) => {
    const markup = renderToStaticMarkup(
      <ExecutiveSummaryView model={{ ...model, enterpriseId }} enterpriseName={enterpriseName} />
    );
    expect(markup).toContain(`Enterprise: ${expected}`);
    expect(markup.includes(`ID: ${enterpriseId}`)).toBe(enterpriseName !== null && enterpriseId !== null);
  });

  it('formats observed dates, fractional credits, signed LOC, and concentration', () => {
    const markup = renderToStaticMarkup(<ExecutiveSummaryView model={model} enterpriseName="Acme" />);

    expect(markup).toContain('Sep 1, 2026');
    expect(markup).toContain('Sep 3, 2026');
    expect(markup).toContain('1.5');
    expect(markup).toContain('0.75 per recorded user-day');
    expect(markup).toContain('-20');
    expect(markup).toContain('-30');
    expect(markup).not.toContain('+-');
    expect(markup).toContain('100%');
    expect(markup).toContain('rounded up to a whole user');
    expect(markup).not.toContain('<canvas');

    const fractional = renderToStaticMarkup(
      <ExecutiveSummaryView
        model={{ ...model, summary: { ...model.summary, totalAiCreditsUsed: 0.001, creditsPerUserDay: 0.001 } }}
        enterpriseName={null}
      />
    );
    expect(fractional).toContain('0.001 per recorded user-day');
  });

  it.each([false, true])('explains unavailable concentration (negative credits: %s)', hasNegativeUserCredits => {
    const markup = renderToStaticMarkup(
      <ExecutiveSummaryView
        model={{ ...model, summary: { ...model.summary, topDecile: null, hasNegativeUserCredits } }}
        enterpriseName={null}
      />
    );

    expect(markup).toContain('Concentration unavailable');
    expect(markup).not.toContain('highest-consuming 10%');
    expect(markup.includes('Negative per-user credit totals')).toBe(hasNegativeUserCredits);
  });

  it('renders an empty report with upload limitations and no manufactured values', () => {
    const empty = selectExecutiveSummaryReadModel(aggregateMetrics([]).aggregated);
    const markup = renderToStaticMarkup(
      <ExecutiveSummaryView model={empty} enterpriseName={null} dataWarning="One file failed to load." />
    );

    expect(markup).toContain('No activity records are available');
    expect(markup).toContain('No observed activity window');
    expect(markup).not.toContain('Suggested discussion');
    expect(markup).not.toMatch(/NaN|Infinity|Invalid Date/);
    expect(markup).toContain('Upload limitation:');
    expect(markup).toContain('One file failed to load.');
    expect(markup).not.toContain('Dismiss');
  });
});
