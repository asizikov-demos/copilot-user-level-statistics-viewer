import { useEffect, useMemo, useState } from 'react';
import type { UserSummary } from '../types/metrics';
import { getIDEMetadata, normalizeIDEKey } from '../utils/ideMetadata';
import { formatIDEName } from '../utils/ideNames';

export const USER_FEATURE_FILTERS = [
  { value: 'chat', label: 'Chat' },
  { value: 'completions', label: 'Completions' },
  { value: 'agent', label: 'Agent' },
  { value: 'vscode_agent', label: 'VS Code Agents window' },
  { value: 'cli', label: 'CLI' },
  { value: 'app', label: 'App' },
  { value: 'cloud_agent', label: 'Cloud Agent' },
  { value: 'code_review', label: 'Code Review' },
  { value: 'auto_mode', label: 'Auto Mode' },
  { value: 'custom_model_provider', label: 'Custom Model Provider' },
  { value: 'local_byok', label: 'Local BYOK' },
] as const;

export type UserFeatureFilter = typeof USER_FEATURE_FILTERS[number]['value'];

interface ClientFilterOption {
  value: string;
  label: string;
}

interface UseUserFiltersResult {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  selectedClients: string[];
  setSelectedClients: (value: string[]) => void;
  selectedFeatures: UserFeatureFilter[];
  setSelectedFeatures: (value: UserFeatureFilter[]) => void;
  serverSideOnlyTelemetry: boolean;
  setServerSideOnlyTelemetry: (value: boolean) => void;
  clientOptions: ClientFilterOption[];
  featureOptions: typeof USER_FEATURE_FILTERS[number][];
  hasActiveFilters: boolean;
  clearFilters: () => void;
  filteredUsers: UserSummary[];
}

function getClientFilterKey(client: string): string {
  const key = getIDEMetadata(client)?.canonicalKey ?? normalizeIDEKey(client);
  return key === 'github_app' ? 'copilot_app' : key;
}

function clientLabelGroup(label: string): number {
  const trimmed = label.trim();
  if (/^\p{L}/u.test(trimmed)) return 0;
  if (/^\p{N}/u.test(trimmed)) return 1;
  return 2;
}

function matchesFeature(user: UserSummary, feature: UserFeatureFilter): boolean {
  switch (feature) {
    case 'chat':
      return user.used_chat;
    case 'completions':
      return user.used_code_completion;
    case 'agent':
      return user.used_agent;
    case 'vscode_agent':
      return user.used_vscode_agent === true;
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
    case 'custom_model_provider':
      return user.used_custom_model_provider === true;
    case 'local_byok':
      return user.used_local_byok === true;
  }
}

export function useUserFilters(users: UserSummary[]): UseUserFiltersResult {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [selectedFeatures, setSelectedFeatures] = useState<UserFeatureFilter[]>([]);
  const [serverSideOnlyTelemetry, setServerSideOnlyTelemetry] = useState(false);

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
      .sort((a, b) => clientLabelGroup(a.label) - clientLabelGroup(b.label)
        || a.label.localeCompare(b.label, undefined, { numeric: true, sensitivity: 'base' })
        || a.value.localeCompare(b.value));
  }, [users]);

  const featureOptions = useMemo(
    () => USER_FEATURE_FILTERS.filter(option => users.some(user => matchesFeature(user, option.value))),
    [users]
  );

  useEffect(() => {
    setSelectedFeatures(current => {
      const available = current.filter(feature => featureOptions.some(option => option.value === feature));
      return available.length === current.length ? current : available;
    });
  }, [featureOptions]);

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

    return users.filter(user => user.user_login.toLowerCase().includes(debouncedSearchQuery));
  }, [debouncedSearchQuery, users]);

  const filteredUsers = useMemo(
    () => usernameMatches.filter(user => {
      const matchesClient = selectedClients.length === 0
        || user.clients_used.some(
          client => selectedClients.includes(getClientFilterKey(client))
        );
      const matchesSelectedFeature = selectedFeatures.length === 0
        || selectedFeatures.some(feature => matchesFeature(user, feature));
      const matchesTelemetry = !serverSideOnlyTelemetry
        || user.has_server_side_only_telemetry === true;
      return matchesClient && matchesSelectedFeature && matchesTelemetry;
    }),
    [selectedClients, selectedFeatures, serverSideOnlyTelemetry, usernameMatches]
  );

  const clearFilters = () => {
    setSearchQuery('');
    setDebouncedSearchQuery('');
    setSelectedClients([]);
    setSelectedFeatures([]);
    setServerSideOnlyTelemetry(false);
  };

  return {
    searchQuery,
    setSearchQuery,
    selectedClients,
    setSelectedClients,
    selectedFeatures,
    setSelectedFeatures,
    serverSideOnlyTelemetry,
    setServerSideOnlyTelemetry,
    clientOptions,
    featureOptions,
    hasActiveFilters: Boolean(searchQuery || selectedClients.length || selectedFeatures.length || serverSideOnlyTelemetry),
    clearFilters,
    filteredUsers,
  };
}
