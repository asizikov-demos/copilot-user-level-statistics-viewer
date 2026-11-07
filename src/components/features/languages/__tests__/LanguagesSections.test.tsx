// @vitest-environment jsdom

import { renderToStaticMarkup } from 'react-dom/server';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
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
    generationsPerUser: 20 / 3,
    generationShare: 20 / 30,
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
    generationsPerUser: 2,
    generationShare: 10 / 30,
    locAdded: 12,
    locDeleted: 20,
    locSuggestedToAdd: 15,
    locSuggestedToDelete: 25,
  },
];

afterEach(cleanup);

describe('Languages feature sections', () => {
  it('renders the summary totals and net LOC impact', () => {
    const markup = renderToStaticMarkup(
      <LanguageSummarySection sectionId="languages-summary" languages={languages} />
    );

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

    expect(markup).toContain('Code Completion');
    expect(markup).toContain('chat');
    expect(markup).toContain('typescript');
    expect(markup).toContain('50');
    expect(markup).not.toContain('<footer');
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

    expect(markup).toContain('50.0%');
    expect(markup).toContain('40.0%');
    expect(markup).toContain('10.0');
    expect(markup).toContain('5.0');
    expect(markup).toContain('Ranked by total code generations.');
    expect(markup).toContain('Ranked by unique user count.');
    expect(markup).toContain('Showing 1-2 of 2 languages');
  });

  it('keeps each ranked list on its own 10-row page and resets after data changes', () => {
    const manyLanguages = Array.from({ length: 12 }, (_, index) => {
      const rank = index + 1;
      return {
        ...languages[0],
        language: `language-${rank}`,
        totalGenerations: rank,
        totalAcceptances: rank / 2,
        totalEngagements: rank * 2,
        uniqueUsers: 13 - rank,
      };
    });

    const { rerender } = render(
      <TopLanguageListsSection sectionId="languages-top-lists" languages={manyLanguages} />
    );
    const generationsCard = screen.getByRole('region', { name: 'Languages by Code Generations' });
    const usersCard = screen.getByRole('region', { name: 'Languages by Number of Users' });

    expect(within(generationsCard).getByText('Showing 1-10 of 12 languages')).toBeTruthy();
    expect(within(usersCard).getByText('Showing 1-10 of 12 languages')).toBeTruthy();
    fireEvent.click(within(generationsCard).getByRole('link', { name: 'Next Page' }));
    fireEvent.click(within(usersCard).getByRole('link', { name: 'Next Page' }));
    expect(within(generationsCard).getByText('language-1')).toBeTruthy();
    expect(within(usersCard).getByText('language-12')).toBeTruthy();
    expect(within(generationsCard).getByText('Showing 11-12 of 12 languages')).toBeTruthy();
    expect(within(usersCard).getByText('Showing 11-12 of 12 languages')).toBeTruthy();

    rerender(
      <TopLanguageListsSection sectionId="languages-top-lists" languages={[...manyLanguages]} />
    );
    expect(within(generationsCard).getByText('Showing 1-10 of 12 languages')).toBeTruthy();
    expect(within(usersCard).getByText('Showing 1-10 of 12 languages')).toBeTruthy();
  });

  it('renders net productivity impact with positive and negative impact styling', () => {
    const markup = renderToStaticMarkup(
      <NetProductivityImpactSection sectionId="languages-net-impact" languages={languages} />
    );

    expect(markup).toContain('40');
    expect(markup).toContain('-8');
    expect(markup).toContain('data-tone="positive">40');
    expect(markup).toContain('data-tone="negative">-8');
    expect(markup).toContain('Net Productivity Impact by Language');
    expect(markup).toContain('Showing 1-2 of 2 languages');
    expect(markup).toContain('<footer');
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
    expect(populatedMarkup).toContain('Switch between language totals and normalized per-user metrics.');
    expect(populatedMarkup).toContain('Showing 1-2 of 2 languages');
    expect(populatedMarkup).toContain('<footer');
    expect(emptyMarkup).not.toContain('<footer');

    const headerStart = populatedMarkup.indexOf('<header');
    const headerEnd = populatedMarkup.indexOf('</header>');
    const controlPosition = populatedMarkup.indexOf('aria-label="Language breakdown view"');
    expect(controlPosition).toBeGreaterThan(headerStart);
    expect(controlPosition).toBeLessThan(headerEnd);
  });
});
