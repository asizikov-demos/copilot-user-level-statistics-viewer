import { useEffect, useMemo, useState } from 'react';
import type { UserSummary } from '../types/metrics';
import { getIDEMetadata, normalizeIDEKey } from '../utils/ideMetadata';
import { formatIDEName } from '../utils/ideNames';

export const USER_FEATURE_FILTERS = [
  { value: 'chat', label: 'Chat' },
  { value: 'completions', label: 'Completions' },
  { value: 'agent', label: 'Agent' },
  { value: 'cli', label: 'CLI' },
  { value: 'app', label: 'App' },
  { value: 'cloud_agent', label: 'Cloud Agent' },
  { value: 'code_review', label: 'Code Review' },
  { value: 'auto_mode', label: 'Auto Mode' },
] as const;

interface ClientFilterOption {
  value: string;
  label: string;
}

interface UseUserFiltersResult {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  selectedClient: string;
  setSelectedClient: (value: string) => void;
  selectedFeature: string;
  setSelectedFeature: (value: string) => void;
  clientOptions: ClientFilterOption[];
  hasActiveFilters: boolean;
  clearFilters: () => void;
  filteredUsers: UserSummary[];
}

type TrieNode = {
  children: Record<string, TrieNode>;
  users: UserSummary[];
};

function getClientFilterKey(client: string): string {
  return getIDEMetadata(client)?.canonicalKey ?? normalizeIDEKey(client);
}

function matchesFeature(user: UserSummary, feature: string): boolean {
  switch (feature) {
    case 'chat':
      return user.used_chat;
    case 'completions':
      return user.used_code_completion;
    case 'agent':
      return user.used_agent;
    case 'cli':
      return user.used_cli;
    case 'app':
      return user.used_copilot_app;
    case 'cloud_agent':
      return user.used_copilot_coding_agent;
    case 'code_review':
      return user.used_copilot_code_review_active
        || user.used_copilot_code_review_passive;
    case 'auto_mode':
      return user.used_auto_mode ?? false;
    default:
      return true;
  }
}

export function useUserFilters(users: UserSummary[]): UseUserFiltersResult {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedFeature, setSelectedFeature] = useState('');

  const trieRoot = useMemo(() => {
    const root: TrieNode = {
      children: {},
      users: [],
    };

    const insert = (key: string, user: UserSummary) => {
      let node = root;
      node.users.push(user);

      for (const char of key) {
        if (!node.children[char]) {
          node.children[char] = {
            children: {},
            users: [],
          };
        }
        node = node.children[char];
        node.users.push(user);
      }
    };

    users.forEach((user) => {
      const key = user.user_login.toLowerCase();
      if (key) {
        insert(key, user);
      }
    });

    return root;
  }, [users]);

  const clientOptions = useMemo(() => {
    const options = new Map<string, string>();

    for (const user of users) {
      for (const client of user.clients_used) {
        const value = getClientFilterKey(client);
        if (!options.has(value)) {
          options.set(value, formatIDEName(client));
        }
      }
    }

    return Array.from(options, ([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [users]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim().toLowerCase());
    }, 200);

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);

  const usernameMatches = useMemo(() => {
    if (!debouncedSearchQuery) {
      return users;
    }

    let node: TrieNode | undefined = trieRoot;
    for (const char of debouncedSearchQuery) {
      node = node.children[char];
      if (!node) {
        return [];
      }
    }

    return node.users;
  }, [debouncedSearchQuery, trieRoot, users]);

  const filteredUsers = useMemo(
    () => usernameMatches.filter(user => {
      const matchesClient = !selectedClient
        || user.clients_used.some(
          client => getClientFilterKey(client) === selectedClient
        );
      return matchesClient && matchesFeature(user, selectedFeature);
    }),
    [selectedClient, selectedFeature, usernameMatches]
  );

  const clearFilters = () => {
    setSearchQuery('');
    setDebouncedSearchQuery('');
    setSelectedClient('');
    setSelectedFeature('');
  };

  return {
    searchQuery,
    setSearchQuery,
    selectedClient,
    setSelectedClient,
    selectedFeature,
    setSelectedFeature,
    clientOptions,
    hasActiveFilters: Boolean(searchQuery || selectedClient || selectedFeature),
    clearFilters,
    filteredUsers,
  };
}
