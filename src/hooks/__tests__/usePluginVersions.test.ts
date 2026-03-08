import { describe, expect, it } from 'vitest';
import { parsePluginVersionsResponse } from '../usePluginVersions';

describe('parsePluginVersionsResponse', () => {
  it('parses JetBrains rolling versions', () => {
    const result = parsePluginVersionsResponse('jetbrains', {
      versions: [{ version: '1.2.3', releaseDate: '2026-03-01T00:00:00Z' }],
    });

    expect(result).toEqual({
      versions: [{ version: '1.2.3', releaseDate: '2026-03-01T00:00:00Z' }],
      stableReleases: [],
      currentStableMinor: null,
      currentPreviewMinor: null,
      updatedAt: null,
    });
  });

  it('parses compact VS Code release metadata without a versions array', () => {
    const result = parsePluginVersionsResponse('vscode', {
      stableMinor: 38,
      previewMinor: 39,
      updatedAt: '2026-03-06T23:48:26Z',
    });

    expect(result).toEqual({
      versions: [],
      stableReleases: [],
      currentStableMinor: 38,
      currentPreviewMinor: 39,
      updatedAt: '2026-03-06T23:48:26Z',
    });
  });

  it('derives preview minor when the compact VS Code payload omits it', () => {
    const result = parsePluginVersionsResponse('vscode', {
      stableMinor: 38,
      updatedAt: '2026-03-06T23:48:26Z',
    });

    expect(result.currentPreviewMinor).toBe(39);
  });

  it('accepts the legacy VS Code rolling-window payload as a fallback', () => {
    const result = parsePluginVersionsResponse('vscode', {
      versions: [
        { version: '0.38.2026030304', releaseDate: '2026-03-03T00:00:00Z' },
        { version: '0.38.2026030204', releaseDate: '2026-03-02T00:00:00Z' },
        { version: '0.39.2026030501', releaseDate: '2026-03-05T00:00:00Z' },
      ],
    });

    expect(result.currentStableMinor).toBe(38);
    expect(result.currentPreviewMinor).toBe(39);
    expect(result.versions).toHaveLength(3);
    expect(result.stableReleases).toEqual([]);
  });

  it('parses stableReleases from VS Code payload', () => {
    const result = parsePluginVersionsResponse('vscode', {
      stableMinor: 38,
      previewMinor: 39,
      updatedAt: '2026-03-06T23:48:26Z',
      stableReleases: [
        { version: '0.38.2', releaseDate: '2026-03-01T00:00:00Z' },
        { version: '0.38.1', releaseDate: '2026-02-15T00:00:00Z' },
        { version: '0.37.5', releaseDate: '2026-01-20T00:00:00Z' },
      ],
    });

    expect(result.stableReleases).toEqual([
      { version: '0.38.2', releaseDate: '2026-03-01T00:00:00Z' },
      { version: '0.38.1', releaseDate: '2026-02-15T00:00:00Z' },
      { version: '0.37.5', releaseDate: '2026-01-20T00:00:00Z' },
    ]);
  });

  it('excludes timestamp builds from stableReleases', () => {
    const result = parsePluginVersionsResponse('vscode', {
      stableMinor: 38,
      previewMinor: 39,
      updatedAt: '2026-03-06T23:48:26Z',
      stableReleases: [
        { version: '0.38.2', releaseDate: '2026-03-01T00:00:00Z' },
        { version: '0.38.2026030304', releaseDate: '2026-03-03T00:00:00Z' },
        { version: '0.38.1', releaseDate: '2026-02-15T00:00:00Z' },
      ],
    });

    expect(result.stableReleases).toEqual([
      { version: '0.38.2', releaseDate: '2026-03-01T00:00:00Z' },
      { version: '0.38.1', releaseDate: '2026-02-15T00:00:00Z' },
    ]);
    expect(result.stableReleases.some(({ version }) => version.includes('2026030304'))).toBe(false);
  });

  it('returns empty stableReleases when VS Code payload omits the field', () => {
    const result = parsePluginVersionsResponse('vscode', {
      stableMinor: 38,
      previewMinor: 39,
    });

    expect(result.stableReleases).toEqual([]);
  });

  it('throws for invalid JetBrains payloads', () => {
    expect(() => parsePluginVersionsResponse('jetbrains', {})).toThrow('Unexpected response shape');
  });

  it('throws for invalid VS Code payloads', () => {
    expect(() => parsePluginVersionsResponse('vscode', {})).toThrow('Unexpected response shape');
  });
});
