// @vitest-environment jsdom

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { makeAggregatedMetrics, makeUserSummary } from '../../__tests__/factories/aggregatedMetrics';
import { selectAiCreditsReadModel } from '../../read-models/aiCredits';
import AiCreditsView from '../AiCreditsView';
import { computeAiCreditsSummary } from '../../domain/calculators/aiCreditsCalculator';

vi.mock('../charts/AiCreditsChart', () => ({
  default: () => <div data-testid="ai-credits-chart" />,
}));

const emptyMessage = 'No AI credit consumption was recorded during the reporting period.';
const sectionIds = [
  'ai-credits-daily-consumption',
  'ai-credits-top-users',
  'ai-credits-usage-distribution',
];

function renderView(model = selectAiCreditsReadModel(makeAggregatedMetrics(), vi.fn())) {
  const container = document.createElement('div');
  container.innerHTML = renderToStaticMarkup(<AiCreditsView model={model} />);
  return sectionIds.map(id => {
    const section = container.querySelector(`#${id}`);
    expect(section).not.toBeNull();
    expect(section?.classList.contains('scroll-mt-28')).toBe(true);
    return section!;
  });
}

describe('AiCreditsView empty states', () => {
  it('uses shared empty-state headings in all three sections without consumption', () => {
    const sections = renderView();

    sections.forEach((section, index) => {
      expect(section.querySelector(index === 0 ? 'h3' : 'h4')?.textContent).toBe(emptyMessage);
      expect(section.querySelector('table')).toBeNull();
      expect(section.querySelector('[data-testid="ai-credits-chart"]')).toBeNull();
    });
    expect(sections[1].querySelector('header')?.textContent).toContain('Top 5 Users by AI Credits Consumption');
    expect(sections[1].querySelector('header')?.textContent).toContain('share of total credits consumed.');
    expect(sections[2].querySelector('header')?.textContent).toContain('Usage Distribution');
    expect(sections[2].querySelector('header')?.textContent).toContain('Averages are calculated per user');
    expect(sections[1].querySelector('footer')).toBeNull();
    expect(sections[2].querySelector('footer')).toBeNull();
  });

  it('keeps the empty states for zero-credit daily entries, users, and empty buckets', () => {
    const model = selectAiCreditsReadModel(makeAggregatedMetrics(), vi.fn());
    model.dailyAiCreditsData = [{ date: '2026-10-01', aiCreditsUsed: 0, users: 0 }];
    model.creditsSummary = computeAiCreditsSummary([makeUserSummary({ total_ai_credits_used: 0 })], model.dailyAiCreditsData);

    renderView(model).forEach(section => {
      expect(section.textContent).toContain(emptyMessage);
    });
  });

  it('replaces each empty state with its populated chart or table', () => {
    const model = selectAiCreditsReadModel(makeAggregatedMetrics(), vi.fn());
    model.dailyAiCreditsData = [{ date: '2026-10-01', aiCreditsUsed: 5, users: 1 }];
    model.creditsSummary = computeAiCreditsSummary([makeUserSummary({ total_ai_credits_used: 5 })], model.dailyAiCreditsData);
    model.totalAiCreditsUsed = 5;
    model.usageDistributionData = model.usageDistributionData.map(bucket => ({
      ...bucket,
      userCount: 1,
    }));

    const sections = renderView(model);

    sections.forEach(section => expect(section.textContent).not.toContain(emptyMessage));
    expect(sections[0].querySelector('[data-testid="ai-credits-chart"]')).not.toBeNull();
    expect(sections[1].querySelector('table')).not.toBeNull();
    expect(sections[2].querySelector('table')).not.toBeNull();
  });
});
