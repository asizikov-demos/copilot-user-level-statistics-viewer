import { describe, expect, it } from 'vitest';
import {
  derivePreviewMinor,
  isStableVsCodeVersion,
  parseTagMinor,
  parseVersionMinor,
  parseVsCodeVersion,
} from '../vscodeVersionRules';

describe('parseVsCodeVersion', () => {
  it.each([
    ['0.38.2', { major: 0, minor: 38, patch: '2', isTimestampBuild: false }],
    ['0.38.2026030304', { major: 0, minor: 38, patch: '2026030304', isTimestampBuild: true }],
    ['0.38', { major: 0, minor: 38, patch: null, isTimestampBuild: false }],
  ])('parses %s', (version, expected) => {
    expect(parseVsCodeVersion(version)).toEqual(expected);
  });

  it('returns null for invalid versions', () => {
    expect(parseVsCodeVersion('not-a-version')).toBeNull();
  });
});

describe('parseVersionMinor', () => {
  it.each([
    ['0.38', 38],
    ['0.38.2', 38],
    ['v0.38.2', 38],
    ['0.38.2026030304', 38],
    ['0.39.2026030501', 39],
    ['1.100.0', 100],
  ])('parses the minor of %s as %d', (version, minor) => {
    expect(parseVersionMinor(version)).toBe(minor);
  });

  it.each(['42', '', '0.abc.1'])('returns null for %j', version => {
    expect(parseVersionMinor(version)).toBeNull();
  });
});

describe('parseTagMinor', () => {
  it('parses the minor from prefixed tags with suffixes', () => {
    expect(parseTagMinor('v0.38.2-insider')).toBe(38);
  });
});

describe('isStableVsCodeVersion', () => {
  it.each([
    ['0.38.2', true],
    ['0.38.2026030604', false],
    ['0.38', false],
    ['insider', false],
  ])('treats %s as stable: %s', (version, stable) => {
    expect(isStableVsCodeVersion(version)).toBe(stable);
  });
});

describe('derivePreviewMinor', () => {
  it('derives the preview minor from the stable minor', () => {
    expect(derivePreviewMinor(38)).toBe(39);
  });
});
