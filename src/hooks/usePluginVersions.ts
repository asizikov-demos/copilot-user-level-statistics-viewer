"use client";

import { useState, useEffect } from 'react';
import { getBasePath } from '../utils/basePath';
import { deriveCurrentStableMinor, parseVsCodeVersion } from '../domain/vscodeVersionClassifier';

export interface PluginVersion {
  version: string;
  releaseDate: string;
}

export interface PluginVersionsResult {
  versions: PluginVersion[];
  /** Rolling window of stable VS Code releases with release dates. Empty for JetBrains. */
  stableReleases: PluginVersion[];
  isLoading: boolean;
  error: string | null;
  currentStableMinor: number | null;
  currentPreviewMinor: number | null;
  updatedAt: string | null;
}

export interface ParsedPluginVersionsResponse {
  versions: PluginVersion[];
  /** Rolling window of stable VS Code releases with release dates. Empty for JetBrains. */
  stableReleases: PluginVersion[];
  currentStableMinor: number | null;
  currentPreviewMinor: number | null;
  updatedAt: string | null;
}

function mapPluginVersions(versions: unknown[]): PluginVersion[] {
  return versions.map((item) => {
    const obj = item as { version?: unknown; releaseDate?: unknown };
    return {
      version: typeof obj.version === 'string' ? obj.version : 'n/a',
      releaseDate: typeof obj.releaseDate === 'string' ? obj.releaseDate : String(obj.releaseDate ?? ''),
    };
  });
}

export function parsePluginVersionsResponse(
  type: 'jetbrains' | 'vscode',
  data: unknown,
): ParsedPluginVersionsResponse {
  if (!data || typeof data !== 'object') {
    throw new Error('Unexpected response shape');
  }

  const raw = data as {
    versions?: unknown;
    stableReleases?: unknown;
    stableMinor?: unknown;
    previewMinor?: unknown;
    updatedAt?: unknown;
  };

  if (type === 'jetbrains') {
    if (!Array.isArray(raw.versions)) {
      throw new Error('Unexpected response shape');
    }

    return {
      versions: mapPluginVersions(raw.versions),
      stableReleases: [],
      currentStableMinor: null,
      currentPreviewMinor: null,
      updatedAt: null,
    };
  }

  const versions = Array.isArray(raw.versions) ? mapPluginVersions(raw.versions) : [];
  const currentStableMinor =
    typeof raw.stableMinor === 'number' && Number.isInteger(raw.stableMinor)
      ? raw.stableMinor
      : deriveCurrentStableMinor(versions);

  if (currentStableMinor === null) {
    throw new Error('Unexpected response shape');
  }

  // Parse stable release window, excluding timestamp builds (those are pre-release channels)
  const stableReleases = Array.isArray(raw.stableReleases)
    ? mapPluginVersions(raw.stableReleases).filter(({ version }) => {
        const parsed = parseVsCodeVersion(version);
        return parsed !== null && !parsed.isTimestampBuild;
      })
    : [];

  return {
    versions,
    stableReleases,
    currentStableMinor,
    currentPreviewMinor:
      typeof raw.previewMinor === 'number' && Number.isInteger(raw.previewMinor)
        ? raw.previewMinor
        : currentStableMinor + 1,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : null,
  };
}

export function usePluginVersions(type: 'jetbrains' | 'vscode'): PluginVersionsResult {
  const [versions, setVersions] = useState<PluginVersion[]>([]);
  const [stableReleases, setStableReleases] = useState<PluginVersion[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStableMinor, setCurrentStableMinor] = useState<number | null>(null);
  const [currentPreviewMinor, setCurrentPreviewMinor] = useState<number | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadVersions() {
      try {
        setIsLoading(true);
        setError(null);

        const endpoint = type === 'jetbrains' ? '/data/jetbrains.json' : '/data/vscode.json';
        const res = await fetch(`${getBasePath()}${endpoint}`, { cache: 'no-store' });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const data: unknown = await res.json();
        const parsed = parsePluginVersionsResponse(type, data);

        if (isMounted) {
          setVersions(parsed.versions);
          setStableReleases(parsed.stableReleases);
          setCurrentStableMinor(parsed.currentStableMinor);
          setCurrentPreviewMinor(parsed.currentPreviewMinor);
          setUpdatedAt(parsed.updatedAt);
        }
      } catch (e) {
        if (isMounted) {
          setError((e as Error).message);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadVersions();

    return () => {
      isMounted = false;
    };
  }, [type]);

  return { versions, stableReleases, isLoading, error, currentStableMinor, currentPreviewMinor, updatedAt };
}
