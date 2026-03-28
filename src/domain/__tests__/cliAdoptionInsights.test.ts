import { describe, it, expect } from 'vitest';
import { computeCliInsights } from '../cliAdoptionInsights';
import type { MetricsStats } from '../../types/metrics';
import type { DailyCliAdoptionTrend } from '../calculators/metricCalculators';

function makeStats(overrides: Partial<MetricsStats> = {}): MetricsStats {
  return {
    uniqueUsers: 100,
    cliUsers: 0,
    chatUsers: 50,
    agentUsers: 30,
    codingAgentUsers: 0,
    completionOnlyUsers: 20,
    reportStartDay: '2024-01-01',
    reportEndDay: '2024-01-15',
    totalRecords: 150,
    topLanguage: { name: 'TypeScript', engagements: 80 },
    topIde: { name: 'VSCode', entries: 60 },
    topModel: { name: 'gpt-4.1', engagements: 90 },
    ...overrides,
  };
}

function makeTrend(days: Array<{ date: string; newUsers: number; returningUsers: number }>): DailyCliAdoptionTrend[] {
  let cumulative = 0;
  const seenIds = new Set<number>();
  return days.map(d => {
    cumulative += d.newUsers;
    for (let i = 0; i < d.newUsers; i++) {
      seenIds.add(seenIds.size + 1);
    }
    return {
      date: d.date,
      newUsers: d.newUsers,
      returningUsers: d.returningUsers,
      totalActiveUsers: d.newUsers + d.returningUsers,
      cumulativeUsers: cumulative,
    };
  });
}

describe('computeCliInsights', () => {
  it('should return "CLI Not in Use" when cliUsers is 0', () => {
    const insights = computeCliInsights(makeStats({ cliUsers: 0 }), []);
    expect(insights).toHaveLength(1);
    expect(insights[0].title).toBe('CLI Not in Use');
    expect(insights[0].variant).toBe('red');
  });

  it('should return "Collecting Data" when trend has fewer than 2 entries', () => {
    const stats = makeStats({ cliUsers: 5 });
    const trend = makeTrend([{ date: '2024-01-15', newUsers: 5, returningUsers: 0 }]);

    const insights = computeCliInsights(stats, trend);
    expect(insights).toHaveLength(1);
    expect(insights[0].title).toBe('Collecting Data');
    expect(insights[0].variant).toBe('blue');
  });

  it('should flag low adoption when under 5%', () => {
    const stats = makeStats({ cliUsers: 3, uniqueUsers: 100 });
    const trend = makeTrend([
      { date: '2024-01-01', newUsers: 1, returningUsers: 0 },
      { date: '2024-01-02', newUsers: 1, returningUsers: 0 },
      { date: '2024-01-03', newUsers: 1, returningUsers: 0 },
    ]);

    const insights = computeCliInsights(stats, trend);
    const lowAdoption = insights.find(i => i.title === 'Low CLI Adoption');
    expect(lowAdoption).toBeDefined();
    expect(lowAdoption!.variant).toBe('orange');
  });

  it('should detect growing adoption', () => {
    const stats = makeStats({ cliUsers: 10 });
    const trend = makeTrend([
      { date: '2024-01-01', newUsers: 0, returningUsers: 2 },
      { date: '2024-01-02', newUsers: 1, returningUsers: 2 },
      { date: '2024-01-03', newUsers: 0, returningUsers: 3 },
      { date: '2024-01-04', newUsers: 2, returningUsers: 3 },
      { date: '2024-01-05', newUsers: 3, returningUsers: 4 },
      { date: '2024-01-06', newUsers: 2, returningUsers: 4 },
    ]);

    const insights = computeCliInsights(stats, trend);
    const growing = insights.find(i => i.title === 'Growing Adoption');
    expect(growing).toBeDefined();
    expect(growing!.variant).toBe('green');
  });

  it('should detect strong retention', () => {
    const stats = makeStats({ cliUsers: 10 });
    const trend = makeTrend([
      { date: '2024-01-01', newUsers: 5, returningUsers: 0 },
      { date: '2024-01-02', newUsers: 1, returningUsers: 4 },
      { date: '2024-01-03', newUsers: 0, returningUsers: 5 },
      { date: '2024-01-04', newUsers: 0, returningUsers: 5 },
    ]);

    const insights = computeCliInsights(stats, trend);
    const retention = insights.find(i => i.title === 'Strong Retention');
    expect(retention).toBeDefined();
    expect(retention!.variant).toBe('green');
  });

  it('should detect declining activity', () => {
    const stats = makeStats({ cliUsers: 10 });
    const trend = makeTrend([
      { date: '2024-01-01', newUsers: 3, returningUsers: 5 },
      { date: '2024-01-02', newUsers: 2, returningUsers: 4 },
      { date: '2024-01-03', newUsers: 1, returningUsers: 3 },
      { date: '2024-01-04', newUsers: 0, returningUsers: 1 },
      { date: '2024-01-05', newUsers: 0, returningUsers: 1 },
      { date: '2024-01-06', newUsers: 0, returningUsers: 0 },
    ]);

    const insights = computeCliInsights(stats, trend);
    const declining = insights.find(i => i.title === 'Declining Activity');
    expect(declining).toBeDefined();
    expect(declining!.variant).toBe('orange');
  });

  it('should flag healthy adoption when above 20%', () => {
    const stats = makeStats({ cliUsers: 25, uniqueUsers: 100 });
    const trend = makeTrend([
      { date: '2024-01-01', newUsers: 10, returningUsers: 0 },
      { date: '2024-01-02', newUsers: 5, returningUsers: 8 },
      { date: '2024-01-03', newUsers: 5, returningUsers: 10 },
      { date: '2024-01-04', newUsers: 5, returningUsers: 12 },
    ]);

    const insights = computeCliInsights(stats, trend);
    const healthy = insights.find(i => i.title === 'Healthy CLI Adoption');
    expect(healthy).toBeDefined();
    expect(healthy!.variant).toBe('green');
  });
});
