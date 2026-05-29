import { describe, expect, it } from 'vitest';
import { formatExpandableInlineText } from '../ExpandableInlineList';

describe('ExpandableInlineList', () => {
  it('formats collapsed text with ellipsis and expanded text without it', () => {
    expect(formatExpandableInlineText(['alice', 'bob', 'carol'], true, false)).toBe('alice, bob, carol...');
    expect(formatExpandableInlineText(['alice', 'bob', 'carol', 'dave'], true, true)).toBe('alice, bob, carol, dave');
    expect(formatExpandableInlineText(['alice', 'bob'], false, false)).toBe('alice, bob');
  });

  it('handles empty and single-item lists', () => {
    expect(formatExpandableInlineText([], false, false)).toBe('');
    expect(formatExpandableInlineText(['alice'], false, false)).toBe('alice');
  });

  it('does not append ellipsis when expanded', () => {
    expect(formatExpandableInlineText(['alice', 'bob', 'carol'], true, true)).toBe('alice, bob, carol');
  });
});
