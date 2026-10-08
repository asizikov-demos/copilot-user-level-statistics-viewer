import { describe, it, expect } from 'vitest';
import {
  parseReportDayInclusiveEnd,
  classifyVsCodeVersion,
  resolveCurrentStableMinorAtDate,
  type VsCodeVersionClassification,
} from '../vscodeVersionClassifier';

describe('parseReportDayInclusiveEnd', () => {
  it('returns the end of day in UTC for a valid report day', () => {
    expect(parseReportDayInclusiveEnd('2026-03-01')?.toISOString()).toBe('2026-03-01T23:59:59.999Z');
  });

  it('rejects impossible calendar dates', () => {
    expect(parseReportDayInclusiveEnd('2026-02-30')).toBeNull();
    expect(parseReportDayInclusiveEnd('2026-13-01')).toBeNull();
  });

  it('rejects non-report-day inputs instead of parsing arbitrary datetimes', () => {
    expect(parseReportDayInclusiveEnd('2026-03-01T00:00:00Z')).toBeNull();
    expect(parseReportDayInclusiveEnd('not-a-day')).toBeNull();
  });
});

describe('classifyVsCodeVersion', () => {
  const stableMinor = 38;
  const previewMinor = 39;

  it.each(['0.38', '0.38.2'])('classifies %s on the stable minor as stable', version => {
    expect(classifyVsCodeVersion(version, stableMinor)).toBe<VsCodeVersionClassification>('stable');
  });

  it('classifies timestamp builds on the current stable minor as prerelease', () => {
    expect(classifyVsCodeVersion('0.38.2026030304', stableMinor)).toBe<VsCodeVersionClassification>('prerelease');
    expect(classifyVsCodeVersion('0.38.2026022801', stableMinor)).toBe<VsCodeVersionClassification>('prerelease');
  });

  it('classifies next-minor builds as the latest preview train', () => {
    expect(classifyVsCodeVersion('0.39.2026030501', stableMinor, previewMinor)).toBe<VsCodeVersionClassification>('latest-preview');
    expect(classifyVsCodeVersion('0.39.2026030604', stableMinor, previewMinor)).toBe<VsCodeVersionClassification>('latest-preview');
    expect(classifyVsCodeVersion('0.39.0', stableMinor, previewMinor)).toBe<VsCodeVersionClassification>('latest-preview');
  });

  it('classifies lower minor than stable as outdated', () => {
    expect(classifyVsCodeVersion('0.37.2025120101', stableMinor)).toBe<VsCodeVersionClassification>('outdated');
    expect(classifyVsCodeVersion('0.36.0', stableMinor)).toBe<VsCodeVersionClassification>('outdated');
    expect(classifyVsCodeVersion('0.1.0', stableMinor)).toBe<VsCodeVersionClassification>('outdated');
  });

  it('classifies minor more than 1 ahead of stable as unknown', () => {
    expect(classifyVsCodeVersion('0.40.0', stableMinor)).toBe<VsCodeVersionClassification>('unknown');
  });

  it('classifies unparseable version as unknown', () => {
    expect(classifyVsCodeVersion('not-a-version', stableMinor)).toBe<VsCodeVersionClassification>('unknown');
    expect(classifyVsCodeVersion('', stableMinor)).toBe<VsCodeVersionClassification>('unknown');
  });
});

describe('resolveCurrentStableMinorAtDate', () => {
  const stableReleases = [
    { version: '0.38.2', releaseDate: '2026-03-06T23:48:26Z' },
    { version: '0.38.1', releaseDate: '2026-03-05T16:26:00Z' },
    { version: '0.38.0', releaseDate: '2026-03-04T18:28:00Z' },
    { version: '0.37.9', releaseDate: '2026-02-26T23:42:00Z' },
    { version: '0.37.8', releaseDate: '2026-02-20T22:59:00Z' },
    { version: '0.36.2', releaseDate: '2026-01-22T21:25:00Z' },
  ];

  it('returns the stable minor effective at the end of the report day', () => {
    expect(resolveCurrentStableMinorAtDate(stableReleases, '2026-03-01')).toBe(37);
    expect(resolveCurrentStableMinorAtDate(stableReleases, '2026-03-04')).toBe(38);
  });

  it('treats same-day releases as active for that report day', () => {
    expect(resolveCurrentStableMinorAtDate(stableReleases, '2026-02-26')).toBe(37);
  });

  it('keeps the newer stable train active when an older train receives a later patch', () => {
    const releasesWithBackport = [
      { version: '0.38.0', releaseDate: '2026-03-04T18:28:00Z' },
      { version: '0.37.10', releaseDate: '2026-03-06T10:00:00Z' },
      { version: '0.37.9', releaseDate: '2026-02-26T23:42:00Z' },
    ];

    expect(resolveCurrentStableMinorAtDate(releasesWithBackport, '2026-03-06')).toBe(38);
  });

  it('returns null when no stable release existed yet or the day is invalid', () => {
    expect(resolveCurrentStableMinorAtDate(stableReleases, '2026-01-01')).toBeNull();
    expect(resolveCurrentStableMinorAtDate(stableReleases, 'not-a-day')).toBeNull();
  });

  it('anchors to report start date so a release that shipped mid-window does not affect outdated classification at window open', () => {
    const releases = [
      { version: '0.38.0', releaseDate: '2026-02-25T10:00:00Z' },
      { version: '0.37.9', releaseDate: '2026-01-15T10:00:00Z' },
    ];

    const stableAtStart = resolveCurrentStableMinorAtDate(releases, '2026-02-01');
    const stableAtEnd = resolveCurrentStableMinorAtDate(releases, '2026-02-28');

    expect(stableAtStart).toBe(37);
    expect(stableAtEnd).toBe(38);
  });
});
