import { describe, expect, it } from 'vitest';
import { sortByField, sortBySelector, takeTopBySelector, rankBySelector } from '../sorting';

interface Item {
  name: string;
  count: number;
}

const items: Item[] = [
  { name: 'c', count: 10 },
  { name: 'a', count: 30 },
  { name: 'b', count: 20 },
  { name: 'd', count: 10 }, // same count as 'c' — tie
];

describe('sortBySelector', () => {
  it('sorts descending by a numeric selector', () => {
    const result = sortBySelector(items, i => i.count);
    expect(result.map(i => i.name)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('sorts ascending by a numeric selector', () => {
    const result = sortBySelector(items, i => i.count, 'asc');
    expect(result.map(i => i.name)).toEqual(['c', 'd', 'b', 'a']);
  });

  it('sorts descending by a string selector', () => {
    const result = sortBySelector(items, i => i.name, 'desc');
    expect(result.map(i => i.name)).toEqual(['d', 'c', 'b', 'a']);
  });

  it('sorts ascending by a string selector', () => {
    const result = sortBySelector(items, i => i.name, 'asc');
    expect(result.map(i => i.name)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('handles an empty input', () => {
    expect(sortBySelector([], i => (i as Item).count)).toEqual([]);
  });

  it('does not mutate the original array', () => {
    const original = [...items];
    sortBySelector(items, i => i.count);
    expect(items).toEqual(original);
  });

  it('preserves relative order for tied values (stable sort)', () => {
    // 'c' comes before 'd' in the original array; both have count 10
    const result = sortBySelector(items, i => i.count, 'desc');
    const cIndex = result.findIndex(i => i.name === 'c');
    const dIndex = result.findIndex(i => i.name === 'd');
    expect(cIndex).toBeLessThan(dIndex);
  });
});

describe('sortByField', () => {
  it('sorts nullable strings with null values last', () => {
    const users: Array<{ login: string; top_client: string | null }> = [
      { login: 'first', top_client: 'vscode' },
      { login: 'missing', top_client: null },
      { login: 'second', top_client: 'intellij' },
    ];

    expect(sortByField(users, 'top_client', 'asc').map(user => user.login)).toEqual([
      'second',
      'first',
      'missing',
    ]);
    expect(sortByField(users, 'top_client', 'desc').map(user => user.login)).toEqual([
      'first',
      'second',
      'missing',
    ]);
  });
});

describe('takeTopBySelector', () => {
  it('returns the top-N items by descending value', () => {
    const result = takeTopBySelector(items, i => i.count, 2);
    expect(result.map(i => i.name)).toEqual(['a', 'b']);
  });

  it('returns all items when n exceeds array length', () => {
    const result = takeTopBySelector(items, i => i.count, 100);
    expect(result).toHaveLength(items.length);
  });

  it('handles empty input', () => {
    expect(takeTopBySelector([], i => (i as Item).count, 5)).toEqual([]);
  });

  it('returns empty for n = 0', () => {
    expect(takeTopBySelector(items, i => i.count, 0)).toEqual([]);
  });
});

describe('rankBySelector', () => {
  it('assigns rank 1 to the item with the highest value', () => {
    const map = rankBySelector(items, i => i.name, i => i.count);
    expect(map.get('a')).toBe(1);
  });

  it('assigns consecutive ranks to all items', () => {
    const map = rankBySelector(items, i => i.name, i => i.count);
    expect(map.get('a')).toBe(1); // count 30
    expect(map.get('b')).toBe(2); // count 20
    // 'c' and 'd' both have count 10; original order preserved
    expect(map.get('c')).toBe(3);
    expect(map.get('d')).toBe(4);
  });

  it('covers all keys from the input', () => {
    const map = rankBySelector(items, i => i.name, i => i.count);
    expect([...map.keys()].sort()).toEqual(['a', 'b', 'c', 'd']);
  });

  it('handles empty input', () => {
    const map = rankBySelector([], i => (i as Item).name, i => (i as Item).count);
    expect(map.size).toBe(0);
  });

  it('handles a single item', () => {
    const map = rankBySelector([{ name: 'x', count: 5 }], i => i.name, i => i.count);
    expect(map.get('x')).toBe(1);
  });

  it('handles a computed value selector', () => {
    const langs = [
      { language: 'ts', locAdded: 100, locDeleted: 20 },
      { language: 'js', locAdded: 50, locDeleted: 10 },
      { language: 'py', locAdded: 80, locDeleted: 90 },
    ];
    const map = rankBySelector(
      langs,
      l => l.language,
      l => l.locAdded - l.locDeleted,
    );
    expect(map.get('ts')).toBe(1); // net 80
    expect(map.get('js')).toBe(2); // net 40
    expect(map.get('py')).toBe(3); // net -10
  });
});
