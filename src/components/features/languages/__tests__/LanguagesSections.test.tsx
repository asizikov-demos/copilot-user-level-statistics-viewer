import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { LanguageStats } from '../../../../domain/calculators/metricCalculators';
import CompleteLanguagesBreakdownSection from '../sections/CompleteLanguagesBreakdownSection';
import LanguageFeatureImpactSection from '../sections/LanguageFeatureImpactSection';
import LanguageSummarySection from '../sections/LanguageSummarySection';
import NetProductivityImpactSection from '../sections/NetProductivityImpactSection';
import TopLanguageListsSection from '../sections/TopLanguageListsSection';

const languages: LanguageStats[] = [
  {
    language: 'typescript',
    totalGenerations: 20,
    totalAcceptances: 10,
    totalEngagements: 30,
    uniqueUsers: 3,
    locAdded: 45,
    locDeleted: 5,
    locSuggestedToAdd: 60,
    locSuggestedToDelete: 8,
  },
  {
    language: 'python',
    totalGenerations: 10,
    totalAcceptances: 4,
    totalEngagements: 25,
    uniqueUsers: 5,
    locAdded: 12,
    locDeleted: 20,
    locSuggestedToAdd: 15,
    locSuggestedToDelete: 25,
  },
];

describe('Languages feature sections', () => {
  it('renders the summary totals and net LOC impact without changing labels', () => {
    const markup = renderToStaticMarkup(
      <LanguageSummarySection sectionId="languages-summary" languages={languages} />
    );

    expect(markup).toContain('Total Languages');
    expect(markup).toContain('Max Users/Lang');
    expect(markup).toContain('LOC Added');
    expect(markup).toContain('LOC Deleted');
    expect(markup).toContain('Net LOC Impact');
    expect(markup).toContain('57');
    expect(markup).toContain('25');
    expect(markup).toContain('32');
  });

  it('renders language feature impact with translated feature headers', () => {
    const markup = renderToStaticMarkup(
      <LanguageFeatureImpactSection
        languageFeatureImpactData={{
          features: ['code_completion', 'chat'],
          rows: [
            {
              language: 'typescript',
              total: 50,
              features: {
                code_completion: 35,
                chat: 15,
              },
            },
          ],
        }}
      />
    );

    expect(markup).toContain('LOC Impact by Language and Feature');
    expect(markup).toContain('Code Completion');
    expect(markup).toContain('chat');
    expect(markup).toContain('typescript');
    expect(markup).toContain('50');
  });

  it('omits language feature impact when no rows are available', () => {
    const markup = renderToStaticMarkup(
      <LanguageFeatureImpactSection
        languageFeatureImpactData={{ features: [], rows: [] }}
      />
    );

    expect(markup).toBe('');
  });

  it('keeps top language lists ranked by generations and users', () => {
    const markup = renderToStaticMarkup(
      <TopLanguageListsSection sectionId="languages-top-lists" languages={languages} />
    );

    expect(markup).toContain('Languages by Code Generations');
    expect(markup).toContain('Languages by Number of Users');
    expect(markup).toContain('50.0%');
    expect(markup).toContain('40.0%');
    expect(markup).toContain('10.0');
    expect(markup).toContain('5.0');
  });

  it('renders net productivity impact with positive and negative impact styling', () => {
    const markup = renderToStaticMarkup(
      <NetProductivityImpactSection sectionId="languages-net-impact" languages={languages} />
    );

    expect(markup).toContain('Net Productivity Impact by Language');
    expect(markup).toContain('40');
    expect(markup).toContain('-8');
    expect(markup).toContain('text-green-600');
    expect(markup).toContain('text-rose-600');
  });

  it('renders the complete breakdown empty state only when no languages exist', () => {
    const emptyMarkup = renderToStaticMarkup(
      <CompleteLanguagesBreakdownSection
        sectionId="languages-complete-breakdown"
        languages={[]}
      />
    );
    const populatedMarkup = renderToStaticMarkup(
      <CompleteLanguagesBreakdownSection
        sectionId="languages-complete-breakdown"
        languages={languages}
      />
    );

    expect(emptyMarkup).toContain('No language data available');
    expect(populatedMarkup).toContain('Complete Languages Breakdown');
    expect(populatedMarkup).not.toContain('No language data available');
  });
});
