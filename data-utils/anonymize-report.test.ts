import { describe, expect, it } from 'vitest';

import { buildSequentialUserIdMap, getUserIdentityKey } from './anonymize-report';

describe('getUserIdentityKey', () => {
  it('prefers user_login when available', () => {
    expect(getUserIdentityKey({ user_login: 'octocat', user_id: 42 })).toBe('login:octocat');
  });

  it('falls back to user_id when login is missing', () => {
    expect(getUserIdentityKey({ user_id: 42 })).toBe('id:42');
  });

  it('returns null when neither login nor user_id is usable', () => {
    expect(getUserIdentityKey({ user_login: '   ' })).toBeNull();
  });
});

describe('buildSequentialUserIdMap', () => {
  it('assigns stable sequential ids in first-seen order', () => {
    const map = buildSequentialUserIdMap([
      { user_login: 'alpha', user_id: 999 },
      { user_login: 'beta', user_id: 123 },
      { user_login: 'alpha', user_id: 999 },
      { user_id: 777 },
    ]);

    expect(Array.from(map.entries())).toEqual([
      ['login:alpha', 1],
      ['login:beta', 2],
      ['id:777', 3],
    ]);
  });
});
