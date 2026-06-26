import { describe, expect, it } from 'vitest';
import {
  derivePreviewMinor,
  isStableVsCodeVersion,
  parseTagMinor,
  parseVersionMinor,
  parseVsCodeVersion,
} from '../vscodeVersionRules';

describe('vscodeVersionRules', () => {
  it('parses minor from both prefixed and unprefixed versions', () => {
    expect(parseVersionMinor('v0.38.2')).toBe(38);
    expect(parseVersionMinor('0.38.2')).toBe(38);
  });

  it('parses tag minor from prefixed tags with suffixes', () => {
    expect(parseTagMinor('v0.38.2-insider')).toBe(38);
  });

  it('parses timestamp prerelease builds', () => {
    expect(parseVsCodeVersion('0.39.2026030604')?.isTimestampBuild).toBe(true);
  });

  it('accepts stable patch releases', () => {
    expect(isStableVsCodeVersion('0.38.2')).toBe(true);
  });

  it('rejects timestamp prerelease builds as stable', () => {
    expect(isStableVsCodeVersion('0.38.2026030604')).toBe(false);
  });

  it('rejects versions without a numeric patch from stable release list', () => {
    expect(isStableVsCodeVersion('0.38')).toBe(false);
    expect(isStableVsCodeVersion('insider')).toBe(false);
  });

  it('derives preview minor from the stable minor', () => {
    expect(derivePreviewMinor(38)).toBe(39);
  });
});
