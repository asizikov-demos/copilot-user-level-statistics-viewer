import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { describe, expect, it } from 'vitest';
import {
  accumulateLanguageStats,
  computeLanguageStats,
  createLanguageAccumulator,
  type LanguageStats,
} from '../../../../domain/calculators/languageCalculator';
import CompleteLanguagesBreakdownSection from '../sections/CompleteLanguagesBreakdownSection';

function makeLanguages(): LanguageStats[] {
  const accumulator = createLanguageAccumulator();
  for (let user = 1; user <= 150; user++) {
    accumulateLanguageStats(accumulator, user, 'typescript', 4, 0, 0, 0, 0, 0);
    if (user <= 50) {
      accumulateLanguageStats(accumulator, user, 'kotlin', 8, 0, 0, 0, 0, 0);
    }
  }
  return computeLanguageStats(accumulator);
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
    const accumulator = createLanguageAccumulator();
    for (let index = 0; index < 12; index++) {
      accumulateLanguageStats(accumulator, 1, `language-${index}`, 10, 0, 0, 0, 0, 0);
    }
    await withTable(computeLanguageStats(accumulator), async root => {
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
    const languages = makeLanguages();
    languages.push({ ...languages[0], language: 'unavailable', uniqueUsers: 0, totalGenerations: 0, generationsPerUser: null, generationShare: null });
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
    const accumulator = createLanguageAccumulator();
    accumulateLanguageStats(accumulator, 1, 'zero', 0, 0, 0, 0, 0, 0);
    await withTable(computeLanguageStats(accumulator), async root => {
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
