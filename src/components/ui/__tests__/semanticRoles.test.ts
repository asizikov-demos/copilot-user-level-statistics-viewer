import { describe, expect, it } from 'vitest';
import { ACCENT_ROLE, resolveAccentRole, resolveCardRole, type AccentColor } from '../colorSchemes';

describe('colorSchemes', () => {
  it('maps every legacy accent to a Primer semantic role', () => {
    expect(ACCENT_ROLE).toEqual({
      blue: 'accent',
      cyan: 'accent',
      green: 'success',
      emerald: 'success',
      amber: 'attention',
      orange: 'severe',
      red: 'danger',
      rose: 'danger',
      purple: 'done',
      violet: 'done',
      indigo: 'done',
      teal: 'neutral',
    });
  });

  it('keeps full role colors for status surfaces', () => {
    expect(resolveAccentRole('blue')).toBe('accent');
    expect(resolveAccentRole('rose')).toBe('danger');
  });

  it('collapses decorative accents into neutral cards and keeps status roles', () => {
    const decorative: AccentColor[] = ['blue', 'cyan', 'purple', 'violet', 'indigo', 'teal'];
    for (const accent of decorative) {
      expect(resolveCardRole(accent)).toBe('neutral');
    }

    expect(resolveCardRole('green')).toBe('success');
    expect(resolveCardRole('emerald')).toBe('success');
    expect(resolveCardRole('amber')).toBe('attention');
    expect(resolveCardRole('orange')).toBe('severe');
    expect(resolveCardRole('red')).toBe('danger');
    expect(resolveCardRole('rose')).toBe('danger');
  });
});
