// @vitest-environment jsdom
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import ClientVersionsDashboard from '../ClientVersionsDashboard';
import type { ClientPlatformHealth } from '../clientVersionAnalysis';

const platforms: ClientPlatformHealth[] = [
  {
    scope: 'vscode',
    platform: 'VS Code',
    totalUsers: 10,
    usernames: ['octocat', 'hubot', 'mona', 'ada', 'grace', 'linus', 'ken', 'rob', 'sam', 'pat'],
    currentUsers: 7,
    outdatedUsers: 3,
    unclassifiedUsers: 0,
    unclassifiedUsernames: [],
    uniqueVersions: 2,
    metadataState: 'ready',
    thresholdLabel: 'Stable train 0.38',
    methodology: 'Versions earlier than stable train 0.38 are outdated.',
    outdatedVersions: [
      {
        scope: 'vscode',
        platform: 'VS Code',
        version: '0.37.0',
        userCount: 3,
        usernames: ['octocat', 'hubot', 'mona'],
        releaseDate: '2026-02-20',
        reason: 'Earlier than stable 0.38',
      },
    ],
    referenceReleases: [
      { version: '0.38.0', releaseDate: '2026-03-04' },
    ],
  },
  {
    scope: 'jetbrains',
    platform: 'JetBrains',
    totalUsers: 8,
    usernames: ['ada', 'grace', 'linus', 'ken', 'rob', 'sam', 'pat', 'taylor'],
    currentUsers: 8,
    outdatedUsers: 0,
    unclassifiedUsers: 0,
    unclassifiedUsernames: [],
    uniqueVersions: 1,
    metadataState: 'ready',
    thresholdLabel: 'Latest 20 stable releases',
    methodology: 'Versions outside the latest 20 stable releases are outdated.',
    outdatedVersions: [],
    referenceReleases: [
      { version: '1.5.51', releaseDate: '2026-03-02' },
    ],
  },
];

afterEach(cleanup);

describe('ClientVersionsDashboard', () => {
  it('paginates version drift into ten-row pages and resets for changed cohorts', () => {
    const withCohorts = (count: number): ClientPlatformHealth[] => [{
      ...platforms[0],
      totalUsers: count,
      currentUsers: 0,
      outdatedUsers: count,
      uniqueVersions: count,
      usernames: Array.from({ length: count }, (_, index) => `synthetic-${index}`),
      outdatedVersions: Array.from({ length: count }, (_, index) => ({
        ...platforms[0].outdatedVersions[0],
        version: `0.37.${index}`,
        userCount: 1,
        usernames: [`synthetic-${index}`],
      })),
    }];
    const dashboard = (data: ClientPlatformHealth[]) => <ClientVersionsDashboard
      platforms={data} reportStartDay="2026-03-05" vsCodeUpdatedAt="2026-03-05"
      sectionIds={{ health: 'health', drift: 'drift', methodology: 'methodology' }} />;
    const { rerender } = render(dashboard(withCohorts(25)));
    const drift = within(screen.getByRole('heading', { name: 'Version drift' }).closest('section')!);
    const table = drift.getByRole('table');
    expect(within(table).getAllByRole('row')).toHaveLength(11);
    expect(drift.getByText('Showing 1-10 of 25 outdated versions')).toBeTruthy();
    expect(drift.queryByRole('button', { name: /Show all/ })).toBeNull();
    fireEvent.click(drift.getByRole('link', { name: 'Page 2' }));
    expect(within(table).getAllByRole('row')).toHaveLength(11);
    expect(within(table).getAllByRole('row')[1].textContent).toContain('0.37.10');
    expect(drift.getByText('Showing 11-20 of 25 outdated versions')).toBeTruthy();
    fireEvent.click(drift.getByRole('link', { name: 'Page 3' }));
    expect(within(table).getAllByRole('row')).toHaveLength(6);
    expect(drift.getByText('Showing 21-25 of 25 outdated versions')).toBeTruthy();
    rerender(dashboard(withCohorts(3)));
    expect(drift.getByText('Showing 1-3 of 3 outdated versions')).toBeTruthy();
    expect(within(table).getAllByRole('row')).toHaveLength(4);
    expect(drift.queryByRole('link', { name: 'Page 3' })).toBeNull();
    rerender(dashboard(withCohorts(0)));
    expect(drift.queryByRole('group', { name: 'Pagination for outdated versions' })).toBeNull();
  });

  it.each(platforms)('shows the $platform icon beside its name in the version drift client column', (platform) => {
    const markup = renderToStaticMarkup(
      <ClientVersionsDashboard
        platforms={[{
          ...platform,
          outdatedVersions: [{
            ...platforms[0].outdatedVersions[0],
            scope: platform.scope,
            platform: platform.platform,
          }],
        }]}
        reportStartDay="2026-03-05"
        vsCodeUpdatedAt="2026-03-05"
        sectionIds={{ health: 'health', drift: 'drift', methodology: 'methodology' }}
      />,
    );
    const drift = markup.split('id="drift"')[1]?.split('</section>')[0] ?? '';
    const clientCell = drift.match(/<td\b[^>]*>([\s\S]*?)<\/td>/)?.[1] ?? '';
    expect(clientCell).toContain(platform.platform);
    expect(clientCell).toContain('<svg');
    expect(clientCell).toContain('aria-hidden="true"');
    expect(clientCell).not.toMatch(/class="[^"]*\bborder\b/);
  });

  it('leads with fleet health and consolidates outdated cohorts into one table', () => {
    const markup = renderToStaticMarkup(
      <ClientVersionsDashboard
        platforms={platforms}
        reportStartDay="2026-03-05"
        vsCodeUpdatedAt="2026-03-05"
        sectionIds={{
          health: 'client-version-health',
          drift: 'client-version-drift',
          methodology: 'client-version-methodology',
        }}
      />,
    );

    expect(markup).toContain('3 users need attention');
    expect(markup).toContain('72.7%');
    expect(markup).toContain('Version drift');
    expect(markup).toContain('0.37.0');
    expect(markup).toContain('Earlier than stable 0.38');
    expect(markup).toContain('How version status is evaluated');
    expect(markup).toContain('No outdated users');
    expect(markup).toContain('id="client-version-health"');
    expect(markup).toContain('id="client-version-drift"');
    expect(markup).toContain('id="client-version-methodology"');
  });

  it('renders navigable empty states for every context section', () => {
    const emptyPlatforms = platforms.map((platform) => ({
      ...platform,
      totalUsers: 0,
      currentUsers: null,
      outdatedUsers: null,
      unclassifiedUsers: 0,
      unclassifiedUsernames: [],
      uniqueVersions: 0,
      metadataState: 'unavailable' as const,
      outdatedVersions: [],
      referenceReleases: [],
    }));
    const markup = renderToStaticMarkup(
      <ClientVersionsDashboard
        platforms={emptyPlatforms}
        reportStartDay="2026-03-05"
        vsCodeUpdatedAt={null}
        sectionIds={{
          health: 'client-version-health',
          drift: 'client-version-drift',
          methodology: 'client-version-methodology',
        }}
      />,
    );

    expect(markup).toContain('No client version data available');
    expect(markup).toContain('No version cohorts available');
    expect(markup).toContain('How version status is evaluated');
    expect(markup).toContain('id="client-version-health"');
    expect(markup).toContain('id="client-version-drift"');
    expect(markup).toContain('id="client-version-methodology"');
  });

  it('does not infer a healthy state when release metadata is unavailable', () => {
    const unclassifiedPlatforms = platforms.map((platform) => ({
      ...platform,
      currentUsers: null,
      outdatedUsers: null,
      unclassifiedUsers: platform.totalUsers,
      unclassifiedUsernames: platform.usernames,
      metadataState: 'error' as const,
      outdatedVersions: [],
      referenceReleases: [],
    }));
    const markup = renderToStaticMarkup(
      <ClientVersionsDashboard
        platforms={unclassifiedPlatforms}
        reportStartDay="2026-03-05"
        vsCodeUpdatedAt={null}
        sectionIds={{
          health: 'client-version-health',
          drift: 'client-version-drift',
          methodology: 'client-version-methodology',
        }}
      />,
    );

    expect(markup).toContain('Some client versions could not be evaluated');
    expect(markup).toContain('Release metadata or version details are missing for 11 users');
    expect(markup).toContain('No outdated versions identified');
    expect(markup).toContain('no healthy status is inferred');
    expect(markup).not.toContain('No outdated versions detected');
  });
});
