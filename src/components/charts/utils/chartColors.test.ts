import { describe, it, expect } from 'vitest';
import { getIdeColor, hasIdeColor, ideFallbackColors } from './chartColors';

describe('getIdeColor', () => {
  it.each([
    ['VSCode', 'vscode'],
    ['  JetBrains  ', 'jetbrains'],
    ['visual_studio', 'visualstudio'],
  ])('resolves %j to the same brand color as %s', (variant, canonical) => {
    expect(hasIdeColor(variant)).toBe(true);
    expect(getIdeColor(variant, 0)).toBe(getIdeColor(canonical, 0));
  });

  it('uses a brand color independent of the fallback index for known IDEs', () => {
    expect(getIdeColor('vscode', 3)).toBe(getIdeColor('vscode', 0));
    expect(ideFallbackColors).not.toContain(getIdeColor('vscode', 0));
  });

  it('cycles through the fallback palette for unknown IDEs', () => {
    expect(hasIdeColor('unknown_ide')).toBe(false);
    expect(getIdeColor('unknown_ide', 1)).toBe(ideFallbackColors[1]);
    expect(getIdeColor('unknown_ide', ideFallbackColors.length + 3)).toBe(ideFallbackColors[3]);
  });
});
