import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
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

describe('ClientVersionsDashboard', () => {
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
