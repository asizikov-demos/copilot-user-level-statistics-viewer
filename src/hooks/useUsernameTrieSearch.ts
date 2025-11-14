import { useEffect, useMemo, useState } from 'react';
import type { UserSummary } from '../types/metrics';

interface UseUsernameTrieSearchResult {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  filteredUsers: UserSummary[];
}

type TrieNode = {
  children: Record<string, TrieNode>;
  users: UserSummary[];
};

export function useUsernameTrieSearch(users: UserSummary[]): UseUsernameTrieSearchResult {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

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

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim().toLowerCase());
    }, 200);

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);

  const filteredUsers: UserSummary[] = useMemo(() => {
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

  return {
    searchQuery,
    setSearchQuery,
    filteredUsers,
  };
}
