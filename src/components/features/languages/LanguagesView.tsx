'use client';

import { ViewPanel } from '../../ui';
import type { LanguagesReadModel } from '../../../read-models/languages';
import CompleteLanguagesBreakdownSection from './sections/CompleteLanguagesBreakdownSection';
import LanguageDailyChartsSection from './sections/LanguageDailyChartsSection';
import LanguageFeatureImpactSection from './sections/LanguageFeatureImpactSection';
import LanguageSummarySection from './sections/LanguageSummarySection';
import NetProductivityImpactSection from './sections/NetProductivityImpactSection';
import TopLanguageListsSection from './sections/TopLanguageListsSection';
import { LANGUAGES_SECTIONS } from './languagesSections';

interface LanguagesViewProps {
  model: LanguagesReadModel;
}

export default function LanguagesView({ model }: LanguagesViewProps) {
  const {
    languageStats: languages,
    languageFeatureImpactData,
    dailyLanguageGenerationsData,
    dailyLanguageLocData,
  } = model;
  const [
    summarySection,
    dailyChartsSection,
    topListsSection,
    netImpactSection,
    completeBreakdownSection,
  ] = LANGUAGES_SECTIONS;

  return (
    <ViewPanel
      headerProps={{
        title: 'Programming Languages Analysis',
        description: 'Detailed breakdown of language usage patterns',
        descriptionClassName: 'text-gray-600 mt-1',
      }}
      contentClassName="space-y-6"
    >
      <LanguageSummarySection sectionId={summarySection.id} languages={languages} />
      <LanguageDailyChartsSection
        sectionId={dailyChartsSection.id}
        dailyLanguageGenerationsData={dailyLanguageGenerationsData}
        dailyLanguageLocData={dailyLanguageLocData}
      />
      <LanguageFeatureImpactSection languageFeatureImpactData={languageFeatureImpactData} />
      <TopLanguageListsSection sectionId={topListsSection.id} languages={languages} />
      <NetProductivityImpactSection sectionId={netImpactSection.id} languages={languages} />
      <CompleteLanguagesBreakdownSection
        sectionId={completeBreakdownSection.id}
        languages={languages}
      />
    </ViewPanel>
  );
}
