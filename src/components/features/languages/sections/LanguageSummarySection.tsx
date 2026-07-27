import type { LanguageStats } from '../../../../domain/calculators/metricCalculators';
import { DashboardStatsCardGroup } from '../../../ui';

interface LanguageSummarySectionProps {
  sectionId: string;
  languages: LanguageStats[];
}

export default function LanguageSummarySection({
  sectionId,
  languages,
}: LanguageSummarySectionProps) {
  const totalLanguages = languages.length;
  const totalUsers = Math.max(...languages.map(lang => lang.uniqueUsers), 0);
  const totalLocAdded = languages.reduce((sum, lang) => sum + lang.locAdded, 0);
  const totalLocDeleted = languages.reduce((sum, lang) => sum + lang.locDeleted, 0);
  const totalNetLocImpact = totalLocAdded - totalLocDeleted;
  const netLocImpactAccent: 'green' | 'rose' = totalNetLocImpact >= 0 ? 'green' : 'rose';

  const summaryCards = [
    {
      value: totalLanguages,
      label: 'Total Languages',
      accent: 'blue' as const,
    },
    {
      value: totalUsers,
      label: 'Max Users/Lang',
      accent: 'teal' as const,
    },
    {
      value: totalLocAdded,
      label: 'LOC Added',
      accent: 'orange' as const,
    },
    {
      value: totalLocDeleted,
      label: 'LOC Deleted',
      accent: 'rose' as const,
    },
    {
      value: totalNetLocImpact,
      label: 'Net LOC Impact',
      accent: netLocImpactAccent,
    },
  ];

  return (
    <div id={sectionId} className="scroll-mt-28">
      <DashboardStatsCardGroup
        className="mb-6"
        columns={{ base: 2, md: 5 }}
        gapClassName="gap-4"
        items={summaryCards}
      />
    </div>
  );
}
