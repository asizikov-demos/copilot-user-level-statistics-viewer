import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { describe, expect, it } from 'vitest';
import type { LanguageStats } from '../../../../domain/calculators/languageCalculator';
import CompleteLanguagesBreakdownSection from '../sections/CompleteLanguagesBreakdownSection';

function makeLanguage(language: string, overrides: Partial<LanguageStats> = {}): LanguageStats {
  return {
    language,
    totalGenerations: 0,
    totalAcceptances: 0,
    totalEngagements: 0,
    uniqueUsers: 0,
    generationsPerUser: null,
    generationShare: null,
    locAdded: 0,
    locDeleted: 0,
    locSuggestedToAdd: 0,
    locSuggestedToDelete: 0,
    ...overrides,
  };
}

function makeLanguages(): LanguageStats[] {
  return [
    makeLanguage('typescript', { totalGenerations: 600, totalEngagements: 600, uniqueUsers: 150, generationsPerUser: 4, generationShare: 0.6 }),
    makeLanguage('kotlin', { totalGenerations: 400, totalEngagements: 400, uniqueUsers: 50, generationsPerUser: 8, generationShare: 0.4 }),
  ];
}

async function withTable(languages: LanguageStats[], test: (root: ReactTestInstance) => Promise<void>) {
  let renderer: ReactTestRenderer | undefined;
  try {
    await act(async () => {
      renderer = create(<CompleteLanguagesBreakdownSection sectionId="breakdown" languages={languages} />);
    });
    await test(renderer!.root);
  } finally {
    await act(async () => { renderer?.unmount(); });
  }
}

async function click(root: ReactTestInstance, label: string) {
  const button = root.findAllByType('button').find(node =>
    node.props.children === label || node.props.children[0] === label
  );
  expect(button, `button ${label}`).toBeDefined();
  await act(async () => { button!.props.onClick(); });
}

function rows(root: ReactTestInstance) {
  return root.findByType('tbody').findAllByType('tr').map(row =>
    row.findAllByType('td').map(cell => cell.findAllByType('div').length
      ? cell.findByType('div').children.join('')
      : cell.children.join(''))
  );
}

describe('Complete Languages Breakdown view toggle', () => {
  it('defaults to the unchanged Totals columns and switches to contextualized normalized values', async () => {
    await withTable(makeLanguages(), async root => {
      const totalsHeaders = root.findAllByType('th').map(header => header.findAllByType('button')[0]?.props.children[0] ?? header.props.children);
      expect(totalsHeaders).toEqual([
        'Language', 'Total Engagements', 'Generations', 'Acceptances', 'Unique Users',
        'LOC Added', 'LOC Deleted', 'Suggested Add', 'Net LOC Impact', 'Acceptance Rate',
      ]);
      expect(root.findAllByType('button').find(button => button.props.children === 'Totals')?.props['aria-pressed']).toBe(true);
      expect(rows(root)[0].slice(0, 5)).toEqual(['typescript', '600', '600', '0', '150']);
      await click(root, 'Normalized');
      expect(root.findAllByType('th')).toHaveLength(5);
      expect(rows(root)).toEqual([
        ['kotlin', '50', '400', '8.0', '40%'],
        ['typescript', '150', '600', '4.0', '60%'],
      ]);
      const copy = root.findByType('p').children.join('');
      expect(copy).toContain('uploaded period');
      expect(copy).toContain('zero-activity entries');
      expect(copy).toContain('not weekly rates or productivity');
      await click(root, 'Totals');
      expect(rows(root)[0][0]).toBe('typescript');
      expect(root.findAllByType('th')).toHaveLength(10);
    });
  });

  it('sorts all normalized columns and retains independent sort selections on toggling', async () => {
    await withTable(makeLanguages(), async root => {
      await click(root, 'Language');
      expect(rows(root)[0][0]).toBe('kotlin');
      await click(root, 'Normalized');
      for (const label of ['Observed Language Users', 'Generations', 'Share of Language Generations']) {
        await click(root, label);
        expect(rows(root)[0][0]).toBe('kotlin');
        await click(root, label);
        expect(rows(root)[0][0]).toBe('typescript');
      }
      await click(root, 'Generations / Observed User');
      expect(rows(root)[0][0]).toBe('typescript');
      await click(root, 'Generations / Observed User');
      expect(rows(root)[0][0]).toBe('kotlin');
      await click(root, 'Language');
      await click(root, 'Language');
      expect(rows(root)[0][0]).toBe('typescript');
      await click(root, 'Totals');
      expect(rows(root)[0][0]).toBe('kotlin');
      await click(root, 'Normalized');
      expect(rows(root)[0][0]).toBe('typescript');
    });
  });

  it('preserves top-ten disclosure and all-row shares across sorting and view changes', async () => {
    const languages = Array.from({ length: 12 }, (_, index) => makeLanguage(`language-${index}`, {
      totalGenerations: 10, totalEngagements: 10, uniqueUsers: 1, generationsPerUser: 10, generationShare: 1 / 12,
    }));
    await withTable(languages, async root => {
      expect(rows(root)).toHaveLength(10);
      await click(root, 'Normalized');
      expect(rows(root)).toHaveLength(10);
      expect(rows(root).every(row => row[4] === '8.3%')).toBe(true);
      await click(root, 'Show All 12 Languages');
      expect(rows(root)).toHaveLength(12);
      await click(root, 'Language');
      expect(rows(root)).toHaveLength(12);
      await click(root, 'Totals');
      expect(rows(root)).toHaveLength(12);
      await click(root, 'Show Less');
      expect(rows(root)).toHaveLength(10);
    });
  });

  it('displays dashes for unavailable ratios and sorts them last in either direction', async () => {
    const languages = [...makeLanguages(), makeLanguage('unavailable')];
    await withTable(languages, async root => {
      await click(root, 'Normalized');
      expect(rows(root)[2]).toEqual(['unavailable', '0', '0', '-', '-']);
      await click(root, 'Generations / Observed User');
      expect(rows(root)[2][0]).toBe('unavailable');
      await click(root, 'Share of Language Generations');
      expect(rows(root)[2][0]).toBe('unavailable');
      await click(root, 'Share of Language Generations');
      expect(rows(root)[2][0]).toBe('unavailable');
    });
  });

  it('renders real zero averages, zero-total shares, and the empty state', async () => {
    await withTable([makeLanguage('zero', { uniqueUsers: 1, generationsPerUser: 0 })], async root => {
      await click(root, 'Normalized');
      expect(rows(root)).toEqual([['zero', '1', '0', '0.0', '-']]);
    });
    await withTable([], async root => {
      await click(root, 'Normalized');
      expect(rows(root)).toEqual([]);
      expect(root.findAllByType('p').some(node => node.children.join('') === 'No language data available')).toBe(true);
    });
  });
});
