import { describe, expect, it } from 'vitest';
import { deriveEnterpriseName, extractEnterpriseNameFromLogin } from '../enterpriseName';

describe('extractEnterpriseNameFromLogin', () => {
  it('returns the trailing underscore suffix', () => {
    expect(extractEnterpriseNameFromLogin('octocat_acme')).toBe('acme');
    expect(extractEnterpriseNameFromLogin('mona_lisa_acme')).toBe('acme');
  });

  it('returns null when the login has no usable suffix', () => {
    expect(extractEnterpriseNameFromLogin('octocat')).toBeNull();
    expect(extractEnterpriseNameFromLogin('octocat_')).toBeNull();
    expect(extractEnterpriseNameFromLogin('_acme')).toBeNull();
    expect(extractEnterpriseNameFromLogin('')).toBeNull();
    expect(extractEnterpriseNameFromLogin(undefined)).toBeNull();
  });
});

describe('deriveEnterpriseName', () => {
  it('uses the first login that carries a suffix', () => {
    expect(deriveEnterpriseName(['octocat', 'hubot_acme', 'mona_other'])).toBe('acme');
  });

  it('returns null when no login carries a suffix', () => {
    expect(deriveEnterpriseName(['octocat', 'hubot'])).toBeNull();
    expect(deriveEnterpriseName([])).toBeNull();
  });
});
