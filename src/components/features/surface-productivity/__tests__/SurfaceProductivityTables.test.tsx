import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type {
  SurfaceCohortSummary,
  SurfaceProductivitySummary,
} from '../../../../types/surfaceProductivity';
import CohortContextTable from '../CohortContextTable';
import SurfaceComparisonTable from '../SurfaceComparisonTable';

const summaries: SurfaceProductivitySummary[] = [
  {
    surface: 'ide',
    uniqueUsers: 12,
    reachPercentage: 80,
    activeUserDays: 48,
    activeDaysPerUser: 4,
    locAdded: 1200,
    locDeleted: 200,
    netLocImpact: 1000,
    netLocPerActiveDay: 20.8,
  },
  {
    surface: 'cli',
    uniqueUsers: 5,
    reachPercentage: 33.3,
    activeUserDays: 10,
    activeDaysPerUser: 2,
    locAdded: 250,
    locDeleted: 50,
    netLocImpact: 200,
    netLocPerActiveDay: 20,
  },
  {
    surface: 'copilotApp',
    uniqueUsers: 2,
    reachPercentage: 13.3,
    activeUserDays: 3,
    activeDaysPerUser: 1.5,
    locAdded: 90,
    locDeleted: 10,
    netLocImpact: 80,
    netLocPerActiveDay: 26.7,
  },
];

const cohorts: SurfaceCohortSummary[] = [
  {
    cohort: 'ideOnly',
    users: 8,
    medianActiveDays: 3,
    medianNetLocImpact: 120,
  },
  {
    cohort: 'cliOnly',
    users: 1,
    medianActiveDays: 2,
    medianNetLocImpact: 40,
  },
  {
    cohort: 'copilotAppOnly',
    users: 0,
    medianActiveDays: 0,
    medianNetLocImpact: 0,
  },
  {
    cohort: 'multiSurface',
    users: 6,
    medianActiveDays: 5,
    medianNetLocImpact: 340,
  },
];

describe('surface productivity tables', () => {
  it('renders every surface with signed LOC totals and per-user averages', () => {
    const markup = renderToStaticMarkup(
      <SurfaceComparisonTable summaries={summaries} />
    );

    for (const surface of ['IDE', 'CLI', 'Copilot App']) {
      expect(markup).toContain(surface);
    }
    expect(markup).toContain('(80%)');
    expect(markup).toContain('text-green-600">+1,200');
    expect(markup).toContain('text-red-600">-200');
    expect(markup).toContain('text-green-600">+100');
    expect(markup).toContain('text-red-600">-16.7');
    expect(markup).toContain('text-green-600">+25');
    expect(markup).toContain('text-red-600">-4.2');
  });

  it('keeps multi-surface users visible without attributing their outcome to one surface', () => {
    const markup = renderToStaticMarkup(
      <CohortContextTable cohorts={cohorts} />
    );

    expect(markup).toContain('Multiple surfaces');
    expect(markup).toContain('do not attribute');
    expect(markup).toContain('Copilot App only');
  });
});
