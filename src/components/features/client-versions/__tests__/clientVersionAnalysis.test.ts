import { describe, expect, it } from 'vitest';
import {
  analyzeJetBrainsHealth,
  analyzeVsCodeHealth,
} from '../clientVersionAnalysis';

describe('client version health analysis', () => {
  it('does not classify JetBrains versions while release metadata is loading', () => {
    const analysis = analyzeJetBrainsHealth({
      versionAnalysis: [
        { version: '1.0.0', userCount: 2, usernames: ['octocat', 'hubot'] },
      ],
      totalUsers: 2,
      releases: [],
      isLoading: true,
      error: null,
    });

    expect(analysis.metadataState).toBe('loading');
    expect(analysis.outdatedUsers).toBeNull();
    expect(analysis.outdatedVersions).toEqual([]);
  });

  it('identifies JetBrains versions outside the latest stable release window', () => {
    const latestReleases = Array.from({ length: 20 }, (_, index) => ({
      version: `2.${index}.0`,
      releaseDate: `2026-02-${String(index + 1).padStart(2, '0')}`,
    }));
    const analysis = analyzeJetBrainsHealth({
      versionAnalysis: [
        { version: '1.0.0', userCount: 2, usernames: ['octocat', 'hubot'] },
        { version: '2.0.0', userCount: 1, usernames: ['mona'] },
      ],
      totalUsers: 3,
      releases: [
        ...latestReleases,
        { version: '2.99.0-nightly', releaseDate: '2026-02-28' },
      ],
      isLoading: false,
      error: null,
    });

    expect(analysis.metadataState).toBe('ready');
    expect(analysis.outdatedUsers).toBe(2);
    expect(analysis.currentUsers).toBe(1);
    expect(analysis.outdatedVersions.map(({ version }) => version)).toEqual(['1.0.0']);
    expect(analysis.referenceReleases).toHaveLength(20);
    expect(analysis.referenceReleases.some(({ version }) => version.endsWith('-nightly'))).toBe(false);
  });

  it('classifies VS Code versions against the stable train at report start', () => {
    const analysis = analyzeVsCodeHealth({
      versionAnalysis: [
        { version: '0.37.0', userCount: 1, usernames: ['octocat'] },
        { version: '0.38.0', userCount: 1, usernames: ['hubot'] },
      ],
      totalUsers: 2,
      stableReleases: [
        { version: '0.38.0', releaseDate: '2026-03-04' },
        { version: '0.37.0', releaseDate: '2026-02-20' },
      ],
      isLoading: false,
      error: null,
      currentStableMinor: 38,
      currentPreviewMinor: 39,
      reportStartDay: '2026-03-05',
    });

    expect(analysis.metadataState).toBe('ready');
    expect(analysis.thresholdLabel).toBe('Stable train 0.38');
    expect(analysis.outdatedUsers).toBe(1);
    expect(analysis.currentUsers).toBe(1);
    expect(analysis.outdatedVersions[0]).toMatchObject({
      version: '0.37.0',
      releaseDate: '2026-02-20',
      reason: 'Earlier than stable 0.38',
    });
  });

  it('preserves the historical metadata gap without outdated classification', () => {
    const analysis = analyzeVsCodeHealth({
      versionAnalysis: [
        { version: '0.20.0', userCount: 1, usernames: ['octocat'] },
      ],
      totalUsers: 1,
      stableReleases: [
        { version: '0.38.0', releaseDate: '2026-03-04' },
      ],
      isLoading: false,
      error: null,
      currentStableMinor: 38,
      currentPreviewMinor: 39,
      reportStartDay: '2026-01-01',
    });

    expect(analysis.metadataState).toBe('historical-gap');
    expect(analysis.outdatedUsers).toBeNull();
    expect(analysis.outdatedVersions).toEqual([]);
    expect(analysis.methodology).toContain('predates the bundled VS Code release history');
  });

  it('keeps unrecognized VS Code versions out of the current-user count', () => {
    const analysis = analyzeVsCodeHealth({
      versionAnalysis: [
        { version: '0.38.0', userCount: 1, usernames: ['hubot'] },
        { version: 'not-a-version', userCount: 1, usernames: ['octocat'] },
      ],
      totalUsers: 2,
      stableReleases: [
        { version: '0.38.0', releaseDate: '2026-03-04' },
      ],
      isLoading: false,
      error: null,
      currentStableMinor: 38,
      currentPreviewMinor: 39,
      reportStartDay: '2026-03-05',
    });

    expect(analysis.currentUsers).toBe(1);
    expect(analysis.outdatedUsers).toBe(0);
    expect(analysis.unclassifiedUsers).toBe(1);
    expect(analysis.unclassifiedUsernames).toEqual(['octocat']);
  });
});
