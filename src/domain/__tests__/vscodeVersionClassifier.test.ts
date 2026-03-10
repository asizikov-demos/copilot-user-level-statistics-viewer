import { describe, it, expect } from 'vitest';
import {
  parseVsCodeVersion,
  parseVersionMinor,
  parseReportDayInclusiveEnd,
  classifyVsCodeVersion,
  deriveCurrentStableMinor,
  resolveCurrentStableMinorAtDate,
  type VsCodeVersionClassification,
} from '../vscodeVersionClassifier';

describe('parseVersionMinor', () => {
  it('parses minor from stable train label (0.38)', () => {
    expect(parseVersionMinor('0.38')).toBe(38);
  });

  it('parses minor from stable patch release (0.38.2)', () => {
    expect(parseVersionMinor('0.38.2')).toBe(38);
  });

  it('parses minor from stable rolling build (0.38.2026030304)', () => {
    expect(parseVersionMinor('0.38.2026030304')).toBe(38);
  });

  it('parses minor from preview rolling build (0.39.2026030501)', () => {
    expect(parseVersionMinor('0.39.2026030501')).toBe(39);
  });

  it('parses minor when minor is a larger number', () => {
    expect(parseVersionMinor('1.100.0')).toBe(100);
  });

  it('returns null for a single-segment string', () => {
    expect(parseVersionMinor('42')).toBeNull();
  });

  it('returns null for an empty string', () => {
    expect(parseVersionMinor('')).toBeNull();
  });

  it('returns null when minor segment is not a number', () => {
    expect(parseVersionMinor('0.abc.1')).toBeNull();
  });
});

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

  it('classifies stable train label as stable', () => {
    expect(classifyVsCodeVersion('0.38', stableMinor)).toBe<VsCodeVersionClassification>('stable');
  });

  it('classifies stable patch release as stable', () => {
    expect(classifyVsCodeVersion('0.38.2', stableMinor)).toBe<VsCodeVersionClassification>('stable');
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

describe('parseVsCodeVersion', () => {
  it('parses stable patch versions', () => {
    expect(parseVsCodeVersion('0.38.2')).toEqual({
      major: 0,
      minor: 38,
      patch: '2',
      isTimestampBuild: false,
    });
  });

  it('parses timestamp prerelease builds', () => {
    expect(parseVsCodeVersion('0.38.2026030304')).toEqual({
      major: 0,
      minor: 38,
      patch: '2026030304',
      isTimestampBuild: true,
    });
  });

  it('returns null for invalid versions', () => {
    expect(parseVsCodeVersion('not-a-version')).toBeNull();
  });
});

describe('deriveCurrentStableMinor', () => {
  it('returns null for an empty list', () => {
    expect(deriveCurrentStableMinor([])).toBeNull();
  });

  it('returns null when no version is parseable', () => {
    expect(deriveCurrentStableMinor([{ version: 'bad' }, { version: 'also-bad' }])).toBeNull();
  });

  it('returns the only minor when there is a single minor in the list', () => {
    const versions = [
      { version: '0.38.2026030304' },
      { version: '0.38.2026030302' },
      { version: '0.38.2026022801' },
    ];
    expect(deriveCurrentStableMinor(versions)).toBe(38);
  });

  it('returns the minor with the most entries as the stable minor', () => {
    // Stable 0.38 has 16 builds, preview 0.39 has 4 — mirrors the real vscode.json
    const versions = [
      ...Array.from({ length: 16 }, (_, i) => ({ version: `0.38.202602${String(i + 1).padStart(2, '0')}01` })),
      ...Array.from({ length: 4 }, (_, i) => ({ version: `0.39.202603${String(i + 1).padStart(2, '0')}01` })),
    ];
    expect(deriveCurrentStableMinor(versions)).toBe(38);
  });

  it('returns one of the tied minors when counts are equal', () => {
    // Equal counts: the first entry wins (stable wins if listed first and tied)
    const versions = [
      { version: '0.38.2026030304' },
      { version: '0.39.2026030501' },
    ];
    const result = deriveCurrentStableMinor(versions);
    expect(result === 38 || result === 39).toBe(true);
  });

  it('handles a list with only preview builds by returning the only minor present', () => {
    const versions = [
      { version: '0.39.2026030501' },
      { version: '0.39.2026030604' },
    ];
    expect(deriveCurrentStableMinor(versions)).toBe(39);
  });

  it('ignores unparseable version strings when computing counts', () => {
    const versions = [
      { version: '0.38.2026030304' },
      { version: '0.38.2026030302' },
      { version: 'insider' },
      { version: '0.39.2026030501' },
    ];
    expect(deriveCurrentStableMinor(versions)).toBe(38);
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
    // Scenario: report window Feb 1–Feb 28. Stable 0.38 shipped Feb 25.
    // At report start (Feb 1), 0.37 was the current stable train.
    // Versions on the 0.37 train should NOT be classified as outdated when anchored to Feb 1.
    const releases = [
      { version: '0.38.0', releaseDate: '2026-02-25T10:00:00Z' },
      { version: '0.37.9', releaseDate: '2026-01-15T10:00:00Z' },
    ];

    const stableAtStart = resolveCurrentStableMinorAtDate(releases, '2026-02-01');
    const stableAtEnd = resolveCurrentStableMinorAtDate(releases, '2026-02-28');

    // At report start, only 0.37 had shipped → should not mark 0.37 train as outdated
    expect(stableAtStart).toBe(37);
    // At report end, 0.38 has shipped
    expect(stableAtEnd).toBe(38);
  });
});
