import { describe, it, expect } from 'vitest';
import { getIdeColor, ideColors, ideFallbackColors } from './chartColors';

describe('getIdeColor', () => {
  it('returns the brand color for a known IDE key', () => {
    expect(getIdeColor('vscode', 0)).toBe(ideColors['vscode']);
    expect(getIdeColor('jetbrains', 0)).toBe(ideColors['jetbrains']);
    expect(getIdeColor('copilot_cli', 0)).toBe(ideColors['copilot_cli']);
  });

  it('normalizes the key with lowercase and trim', () => {
    expect(getIdeColor('VSCode', 0)).toBe(ideColors['vscode']);
    expect(getIdeColor('  JetBrains  ', 0)).toBe(ideColors['jetbrains']);
  });

  it('supports both visualstudio and visual_studio as aliases', () => {
    expect(getIdeColor('visualstudio', 0)).toBe(ideColors['visualstudio']);
    expect(getIdeColor('visual_studio', 0)).toBe(ideColors['visual_studio']);
    expect(getIdeColor('visualstudio', 0)).toBe(getIdeColor('visual_studio', 0));
  });

  it('returns a fallback color for an unknown IDE key', () => {
    expect(getIdeColor('unknown_ide', 0)).toBe(ideFallbackColors[0]);
    expect(getIdeColor('unknown_ide', 1)).toBe(ideFallbackColors[1]);
  });

  it('wraps around the fallback palette', () => {
    const len = ideFallbackColors.length;
    expect(getIdeColor('unknown_ide', len)).toBe(ideFallbackColors[0]);
    expect(getIdeColor('unknown_ide', len + 3)).toBe(ideFallbackColors[3]);
  });
});
