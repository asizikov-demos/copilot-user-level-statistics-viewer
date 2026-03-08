import { describe, it, expect } from 'vitest';
import {
  parseMinorFromTag,
  findLatestStableRelease,
  collectStableReleases,
  hasVsCodeDataChanged,
  STABLE_RELEASES_WINDOW,
  type GitHubRelease,
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

  it('returns null for tags that do not match major.minor', () => {
    expect(parseMinorFromTag('latest')).toBeNull();
    expect(parseMinorFromTag('')).toBeNull();
  });
});

describe('findLatestStableRelease', () => {
  const makeRelease = (
    tag: string,
    prerelease: boolean,
    draft = false,
  ): GitHubRelease => ({
    tag_name: tag,
    prerelease,
    draft,
    published_at: '2026-03-06T00:00:00Z',
    created_at: '2026-03-06T00:00:00Z',
  });

  it('returns the first non-prerelease non-draft release', () => {
    const releases: GitHubRelease[] = [
      makeRelease('v0.39.2026030604', true),
      makeRelease('v0.38.2', false),
      makeRelease('v0.38.1', false),
    ];
    expect(findLatestStableRelease(releases)?.tag_name).toBe('v0.38.2');
  });

  it('skips draft releases', () => {
    const releases: GitHubRelease[] = [
      makeRelease('v0.38.3', false, true), // draft
      makeRelease('v0.38.2', false, false),
    ];
    expect(findLatestStableRelease(releases)?.tag_name).toBe('v0.38.2');
  });

  it('returns null when all releases are prerelease', () => {
    const releases: GitHubRelease[] = [
      makeRelease('v0.39.001', true),
      makeRelease('v0.39.002', true),
    ];
    expect(findLatestStableRelease(releases)).toBeNull();
  });

  it('returns null for an empty list', () => {
    expect(findLatestStableRelease([])).toBeNull();
  });
});

describe('collectStableReleases', () => {
  const makeRelease = (
    tag: string,
    prerelease: boolean,
    draft = false,
    publishedAt = '2026-03-06T00:00:00Z',
  ): GitHubRelease => ({
    tag_name: tag,
    prerelease,
    draft,
    published_at: publishedAt,
    created_at: publishedAt,
  });

  it('filters out prerelease and draft releases', () => {
    const releases: GitHubRelease[] = [
      makeRelease('v0.39.2026030604', true),
      makeRelease('v0.38.3', false, true), // draft
      makeRelease('v0.38.2', false),
      makeRelease('v0.38.1', false),
    ];
    const result = collectStableReleases(releases, 10);
    expect(result).toHaveLength(2);
    expect(result[0].version).toBe('0.38.2');
    expect(result[1].version).toBe('0.38.1');
  });

  it('strips the v prefix from tag names', () => {
    const releases: GitHubRelease[] = [makeRelease('v0.38.2', false)];
    expect(collectStableReleases(releases, 10)[0].version).toBe('0.38.2');
  });

  it('respects the limit', () => {
    const releases: GitHubRelease[] = Array.from({ length: 30 }, (_, i) =>
      makeRelease(`v0.${38 - i}.0`, false),
    );
    expect(collectStableReleases(releases, 5)).toHaveLength(5);
  });

  it('returns an empty array when all releases are prerelease', () => {
    const releases: GitHubRelease[] = [makeRelease('v0.39.001', true)];
    expect(collectStableReleases(releases, 10)).toHaveLength(0);
  });

  it('uses published_at for releaseDate when available', () => {
    const releases: GitHubRelease[] = [
      {
        tag_name: 'v0.38.2',
        prerelease: false,
        draft: false,
        published_at: '2026-03-06T12:00:00Z',
        created_at: '2026-03-05T00:00:00Z',
      },
    ];
    expect(collectStableReleases(releases, 10)[0].releaseDate).toBe('2026-03-06T12:00:00Z');
  });

  it('falls back to created_at when published_at is null', () => {
    const releases: GitHubRelease[] = [
      {
        tag_name: 'v0.38.2',
        prerelease: false,
        draft: false,
        published_at: null,
        created_at: '2026-03-05T00:00:00Z',
      },
    ];
    expect(collectStableReleases(releases, 10)[0].releaseDate).toBe('2026-03-05T00:00:00Z');
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
});
