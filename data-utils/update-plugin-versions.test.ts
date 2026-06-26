import { describe, it, expect } from 'vitest';
import {
  parseMinorFromTag,
  collectStableReleases,
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

describe('collectStableReleases', () => {
  const makeRelease = (
    version: string,
    lastUpdated = '2026-03-06T00:00:00.123Z',
  ) => ({
    version,
    lastUpdated,
  });

  it('filters out timestamp builds from Marketplace versions', () => {
    const releases = [
      makeRelease('0.39.2026030604'),
      makeRelease('0.38.2'),
      makeRelease('0.38.1'),
    ];
    const result = collectStableReleases(releases, 10);
    expect(result).toHaveLength(2);
    expect(result[0].version).toBe('0.38.2');
    expect(result[1].version).toBe('0.38.1');
  });

  it('respects the limit', () => {
    const releases = Array.from({ length: 30 }, (_, i) =>
      makeRelease(`0.${38 - i}.0`),
    );
    expect(collectStableReleases(releases, 5)).toHaveLength(5);
  });

  it('returns an empty array when all releases are timestamp builds', () => {
    const releases = [makeRelease('0.39.2026030604')];
    expect(collectStableReleases(releases, 10)).toHaveLength(0);
  });

  it('uses Marketplace lastUpdated for releaseDate without fractional seconds', () => {
    const releases = [makeRelease('0.38.2', '2026-03-06T12:00:00.987Z')];
    expect(collectStableReleases(releases, 10)[0].releaseDate).toBe('2026-03-06T12:00:00Z');
  });

  it('matches current Marketplace stable ordering', () => {
    const releases = [
      makeRelease('0.48.1', '2026-05-15T22:33:59.763Z'),
      makeRelease('0.45.1', '2026-04-23T20:05:11.56Z'),
      makeRelease('0.44.2', '2026-04-20T09:34:44.32Z'),
      makeRelease('0.43.2026040705', '2026-04-07T11:18:40.72Z'),
      makeRelease('0.43.0', '2026-04-07T11:38:19.68Z'),
    ];
    expect(collectStableReleases(releases, 10)).toEqual([
      { version: '0.48.1', releaseDate: '2026-05-15T22:33:59Z' },
      { version: '0.45.1', releaseDate: '2026-04-23T20:05:11Z' },
      { version: '0.44.2', releaseDate: '2026-04-20T09:34:44Z' },
      { version: '0.43.0', releaseDate: '2026-04-07T11:38:19Z' },
    ]);
  });

  it('STABLE_RELEASES_WINDOW is exported and is a positive number', () => {
    expect(STABLE_RELEASES_WINDOW).toBeGreaterThan(0);
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
