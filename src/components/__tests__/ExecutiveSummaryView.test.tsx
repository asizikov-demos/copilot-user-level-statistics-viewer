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
    { enterpriseName: 'Acme', enterpriseId: null, expected: 'Acme' },
    { enterpriseName: null, enterpriseId: 'enterprise-123', expected: 'enterprise-123' },
    { enterpriseName: null, enterpriseId: null, expected: 'N/A' },
  ])('renders enterprise identity: $expected', ({ enterpriseName, enterpriseId, expected }) => {
    const markup = renderToStaticMarkup(
      <ExecutiveSummaryView model={{ ...model, enterpriseId }} enterpriseName={enterpriseName} />
    );
    expect(markup).toContain(`Enterprise: ${expected}`);
    if (enterpriseName !== null && enterpriseId !== null) {
      expect(markup).toContain(`ID: ${enterpriseId}`);
    }
  });

  it('renders the brief with printable evidence, fractional credits, and signed LOC', () => {
    const markup = renderToStaticMarkup(<ExecutiveSummaryView model={model} enterpriseName="Acme" />);
    expect(markup).toContain('GitHub Copilot, in perspective.');
    expect(markup).toContain('Print / Save PDF');
    expect(markup).toContain('A4');
    expect(markup).toContain('Letter');
    expect(markup).toContain('Sep 1, 2026');
    expect(markup).toContain('Sep 3, 2026');
    expect(markup).toContain('Daily observed users');
    expect(markup).not.toContain('Daily data');
    expect(markup).not.toContain('<details');
    expect(markup).not.toContain('daily data table');
    expect(markup).toContain('1.5');
    expect(markup).toContain('0.75 per recorded user-day');
    expect(markup).toContain('-20');
    expect(markup).toContain('-30');
    expect(markup).not.toContain('+-');
    expect(markup).not.toContain('Feature Adoption Funnel');
    expect(markup).not.toContain('<canvas');
    expect(markup).toContain('Gaps have no uploaded records');
    expect(markup).toContain('100%');
    expect(markup).toContain('rounded up to a whole user');
  });

  it('does not manufacture zeros or recommendations for an empty report', () => {
    const empty = selectExecutiveSummaryReadModel(aggregateMetrics([]).aggregated);
    const markup = renderToStaticMarkup(<ExecutiveSummaryView model={empty} enterpriseName={null} />);
    expect(markup).toContain('No activity records are available');
    expect(markup).toContain('No observed activity window');
    expect(markup).not.toContain('Suggested discussion');
    expect(markup).not.toMatch(/NaN|Infinity|Invalid Date/);
  });

  it('keeps upload limitations inside the printable report', () => {
    const markup = renderToStaticMarkup(
      <ExecutiveSummaryView model={model} enterpriseName={null} dataWarning="One file failed to load." />
    );
    expect(markup).toContain('Upload limitation:');
    expect(markup).toContain('One file failed to load.');
    expect(markup).not.toContain('Dismiss');
  });

  it('does not round small positive credits and credit rates to zero', () => {
    const fractional = selectExecutiveSummaryReadModel(aggregateMetrics([
      makeMetric({ ai_credits_used: 0.001 }),
    ]).aggregated);
    const markup = renderToStaticMarkup(<ExecutiveSummaryView model={fractional} enterpriseName={null} />);
    expect(markup).toContain('0.001');
    expect(markup).toContain('0.001 per recorded user-day');
  });

  it.each([0, -1.25])('explains unavailable concentration for %s credits', credits => {
    const noConcentration = selectExecutiveSummaryReadModel(aggregateMetrics([
      makeMetric({ ai_credits_used: credits }),
    ]).aggregated);
    const markup = renderToStaticMarkup(<ExecutiveSummaryView model={noConcentration} enterpriseName={null} />);
    expect(markup).toContain('Concentration unavailable');
    expect(markup).not.toContain('highest-consuming 10%');
    expect(markup).not.toMatch(/NaN|Infinity/);
    if (credits < 0) expect(markup).toContain('Negative per-user credit totals');
  });
});
