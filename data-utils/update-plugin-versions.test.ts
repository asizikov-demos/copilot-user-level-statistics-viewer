import { afterEach, describe, it, expect, vi } from 'vitest';
import {
  parseMinorFromTag,
  fetchVsCodeData,
  hasVsCodeDataChanged,
  STABLE_RELEASES_WINDOW,
  type VsCodeData,
} from './update-plugin-versions';

describe('parseMinorFromTag', () => {
  it('parses minor from vX.Y.Z tag', () => {
    expect(parseMinorFromTag('v0.38.2')).toBe(38);
  });

  it('parses minor from X.Y.Z tag without v prefix', () => {
    expect(parseMinorFromTag('0.38.0')).toBe(38);
  });

  it('parses minor from timestamp-based tag', () => {
    expect(parseMinorFromTag('v0.39.2026030604')).toBe(39);
  });

  it('parses minor from tags with version suffixes', () => {
    expect(parseMinorFromTag('v0.38.2-insider')).toBe(38);
  });

  it('returns null for tags that do not match major.minor', () => {
    expect(parseMinorFromTag('latest')).toBeNull();
    expect(parseMinorFromTag('')).toBeNull();
  });
});

describe('fetchVsCodeData', () => {
  afterEach(() => vi.unstubAllGlobals());

  const existing: VsCodeData = {
    stableMinor: 48, previewMinor: 49, updatedAt: '', stableReleases: [],
  };
  const editorVersions = ['1.150.1', ...Array.from({ length: 25 }, (_, i) => `1.${150 - i}.0`)];

  function mockFeed(invalidManifest = false) {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith('/api/releases/stable')) return Response.json(editorVersions);
      if (url.includes('/api/versions/')) {
        const editorVersion = url.split('/')[5];
        const [, minor, patch] = editorVersion.split('.').map(Number);
        const commit = String(minor * 10 + patch).padStart(40, '0');
        return Response.json({
          productVersion: editorVersion, version: commit,
          timestamp: Date.UTC(2026, 0, minor - 120, patch),
        });
      }
      const commit = url.split('/')[5];
      const minor = Math.floor(Number(commit) / 10);
      return Response.json({
        name: 'copilot-chat', publisher: 'GitHub',
        version: invalidManifest ? '0.80.2026111201' : `0.${minor - 70}.0`,
      });
    });
    vi.stubGlobal('fetch', fetchMock);
    return fetchMock;
  }

  it('uses bundled stable versions, deduplicates patches, and retains the earliest release date', async () => {
    mockFeed();
    const data = await fetchVsCodeData(existing);
    expect(data.stableMinor).toBe(80);
    expect(data.previewMinor).toBe(81);
    expect(data.stableReleases).toHaveLength(STABLE_RELEASES_WINDOW);
    expect(data.stableReleases[0]).toEqual({
      version: '0.80.0', releaseDate: new Date(Date.UTC(2026, 0, 30)).toISOString(),
    });
    expect(data.stableReleases.at(-1)?.version).toBe('0.61.0');
  });

  it('reuses release metadata from the previous update', async () => {
    const fetchMock = mockFeed();
    const first = await fetchVsCodeData(existing);
    fetchMock.mockClear();
    const second = await fetchVsCodeData(first);
    expect(second).toEqual(first);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('fails instead of publishing prerelease or invalid bundled metadata', async () => {
    mockFeed(true);
    await expect(fetchVsCodeData(existing)).rejects.toThrow('Invalid bundled Copilot Chat version');
  });
});

describe('hasVsCodeDataChanged', () => {
  const makeStableRelease = (version: string, releaseDate = '2026-03-06T00:00:00Z') => ({
    version,
    releaseDate,
  });

  const make = (
    stableMinor: number,
    previewMinor = stableMinor + 1,
    releases = [makeStableRelease(`0.${stableMinor}.0`)],
  ): VsCodeData => ({
    stableMinor,
    previewMinor,
    updatedAt: '2026-03-06T00:00:00Z',
    stableReleases: releases,
  });

  it('returns true when stableMinor advances', () => {
    expect(hasVsCodeDataChanged(make(38), make(39))).toBe(true);
  });

  it('returns false when stableMinor, previewMinor, and stableReleases are unchanged', () => {
    const releases = [makeStableRelease('0.38.2'), makeStableRelease('0.38.1')];
    expect(hasVsCodeDataChanged(make(38, 39, releases), make(38, 39, releases))).toBe(false);
  });

  it('returns true when previewMinor changes', () => {
    const releases = [makeStableRelease('0.38.2')];
    expect(hasVsCodeDataChanged(make(38, 39, releases), make(38, 40, releases))).toBe(true);
  });

  it('returns true when a new stable patch release is added to the list', () => {
    const existing = make(38, 39, [makeStableRelease('0.38.2'), makeStableRelease('0.38.1')]);
    const incoming = make(38, 39, [
      makeStableRelease('0.38.3'),
      makeStableRelease('0.38.2'),
      makeStableRelease('0.38.1'),
    ]);
    expect(hasVsCodeDataChanged(existing, incoming)).toBe(true);
  });

  it('returns true when bootstrapping from an empty stableReleases list', () => {
    const empty = make(0, 1, []);
    const populated = make(38, 39, [makeStableRelease('0.38.2')]);
    expect(hasVsCodeDataChanged(empty, populated)).toBe(true);
  });

  it('returns true when bootstrapping from zero', () => {
    expect(hasVsCodeDataChanged(make(0), make(38))).toBe(true);
  });

  it('returns true when a later entry version changes (not the first)', () => {
    const base = [makeStableRelease('0.38.3'), makeStableRelease('0.38.2'), makeStableRelease('0.38.1')];
    const changed = [makeStableRelease('0.38.3'), makeStableRelease('0.38.2'), makeStableRelease('0.38.0')];
    expect(hasVsCodeDataChanged(make(38, 39, base), make(38, 39, changed))).toBe(true);
  });

  it('returns true when a releaseDate is corrected in an existing entry', () => {
    const existing = [makeStableRelease('0.38.2', '2026-03-06T00:00:00Z'), makeStableRelease('0.38.1', '2026-02-01T00:00:00Z')];
    const corrected = [makeStableRelease('0.38.2', '2026-03-06T00:00:00Z'), makeStableRelease('0.38.1', '2026-02-02T00:00:00Z')];
    expect(hasVsCodeDataChanged(make(38, 39, existing), make(38, 39, corrected))).toBe(true);
  });

  it('returns false when all entry versions and releaseDates match', () => {
    const releases = [makeStableRelease('0.38.2', '2026-03-06T00:00:00Z'), makeStableRelease('0.38.1', '2026-02-01T00:00:00Z')];
    expect(hasVsCodeDataChanged(make(38, 39, releases), make(38, 39, releases))).toBe(false);
  });
});
