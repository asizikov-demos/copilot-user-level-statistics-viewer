// @vitest-environment jsdom

import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { UserSummary } from '../../types/metrics';
import { useUserFilters } from '../useUserFilters';

function makeUser(overrides: Partial<UserSummary> = {}): UserSummary {
  return {
    user_login: 'octocat',
    user_id: 1,
    total_user_initiated_interactions: 10,
    total_code_acceptance_activities: 3,
    total_loc_added: 20,
    total_loc_deleted: 4,
    total_loc_suggested_to_add: 30,
    total_loc_suggested_to_delete: 6,
    total_ai_credits_used: 12,
    net_loc_contribution: 16,
    days_active: 2,
    cloud_agent_days: 0,
    code_review_days: 0,
    top_client: 'vscode',
    clients_used: ['vscode'],
    used_code_completion: true,
    used_agent: false,
    used_chat: true,
    used_cli: false,
    used_copilot_app: false,
    used_copilot_coding_agent: false,
    used_copilot_code_review_active: false,
    used_copilot_code_review_passive: false,
    ...overrides,
  };
}

function applySearch(setSearchQuery: (value: string) => void, query: string) {
  act(() => setSearchQuery(query));
  act(() => {
    vi.advanceTimersByTime(200);
  });
}

describe('useUserFilters', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('matches mid-string, hyphenated, and EMU suffix substrings case-insensitively after trimming', () => {
    const users = [
      makeUser({ user_id: 1, user_login: 'john-smith' }),
      makeUser({ user_id: 2, user_login: 'JSmith_corp' }),
      makeUser({ user_id: 3, user_login: 'alice_octocorp' }),
      makeUser({ user_id: 4, user_login: 'octocat' }),
      makeUser({ user_id: 5, user_login: '' }),
    ];

    const { result } = renderHook(() => useUserFilters(users));

    act(() => result.current.setSearchQuery('  SMITH  '));
    expect(result.current.filteredUsers.map(user => user.user_login)).toEqual([
      'john-smith',
      'JSmith_corp',
      'alice_octocorp',
      'octocat',
      '',
    ]);

    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current.filteredUsers.map(user => user.user_login)).toEqual([
      'john-smith',
      'JSmith_corp',
    ]);

    applySearch(result.current.setSearchQuery, '_OCTOCORP');
    expect(result.current.filteredUsers.map(user => user.user_login)).toEqual(['alice_octocorp']);

    applySearch(result.current.setSearchQuery, 'cat');
    expect(result.current.filteredUsers.map(user => user.user_login)).toEqual(['octocat']);

    applySearch(result.current.setSearchQuery, 'missing-handle');
    expect(result.current.filteredUsers).toEqual([]);
  });

  it('treats empty and whitespace-only queries as unrestricted and clears active search immediately', () => {
    const users = [
      makeUser({ user_id: 1, user_login: 'john-smith' }),
      makeUser({ user_id: 2, user_login: 'alice_corp' }),
    ];

    const { result } = renderHook(() => useUserFilters(users));
    expect(result.current.hasActiveFilters).toBe(false);

    applySearch(result.current.setSearchQuery, '   ');
    expect(result.current.hasActiveFilters).toBe(true);
    expect(result.current.filteredUsers.map(user => user.user_login)).toEqual([
      'john-smith',
      'alice_corp',
    ]);

    applySearch(result.current.setSearchQuery, 'smith');
    expect(result.current.filteredUsers.map(user => user.user_login)).toEqual(['john-smith']);

    act(() => result.current.clearFilters());
    expect(result.current.searchQuery).toBe('');
    expect(result.current.hasActiveFilters).toBe(false);
    expect(result.current.filteredUsers.map(user => user.user_login)).toEqual([
      'john-smith',
      'alice_corp',
    ]);

    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current.filteredUsers.map(user => user.user_login)).toEqual([
      'john-smith',
      'alice_corp',
    ]);
  });

  it('intersects substring search with client, feature, and server-side-only telemetry filters', () => {
    const users = [
      makeUser({
        user_id: 1,
        user_login: 'ann-smith_emu',
        clients_used: [' GITHUB_APP ', 'vscode'],
        used_cli: true,
        has_server_side_only_telemetry: true,
      }),
      makeUser({
        user_id: 2,
        user_login: 'bob-smith_emu',
        clients_used: ['jetbrains'],
        used_cli: true,
        has_server_side_only_telemetry: true,
      }),
      makeUser({
        user_id: 3,
        user_login: 'cara-smith_emu',
        clients_used: ['copilot_app'],
        used_cli: false,
        has_server_side_only_telemetry: true,
      }),
      makeUser({
        user_id: 4,
        user_login: 'dan-smith_emu',
        clients_used: ['copilot_app'],
        used_cli: true,
        has_server_side_only_telemetry: false,
      }),
      makeUser({
        user_id: 5,
        user_login: 'eve-jones_emu',
        clients_used: ['copilot_app'],
        used_cli: true,
        has_server_side_only_telemetry: true,
      }),
    ];

    const { result } = renderHook(() => useUserFilters(users));

    act(() => {
      result.current.setSearchQuery('smith');
      result.current.setSelectedClients(['copilot_app']);
      result.current.setSelectedFeatures(['cli']);
      result.current.setServerSideOnlyTelemetry(true);
    });
    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(result.current.hasActiveFilters).toBe(true);
    expect(result.current.filteredUsers.map(user => user.user_login)).toEqual(['ann-smith_emu']);

    act(() => result.current.clearFilters());
    expect(result.current.hasActiveFilters).toBe(false);
    expect(result.current.filteredUsers).toHaveLength(5);
  });
});
