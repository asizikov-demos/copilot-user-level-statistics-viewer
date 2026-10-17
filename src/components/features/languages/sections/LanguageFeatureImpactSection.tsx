import { translateFeature } from '../../../../domain/featureTranslations';
import type { LanguageFeatureImpactData, LanguageFeatureImpactRow } from '../../../../types/metrics';
import MetricsTable, { type TableColumn } from '../../../ui/MetricsTable';

interface LanguageFeatureImpactSectionProps {
  languageFeatureImpactData: LanguageFeatureImpactData;
}

const headerLeftClassName = 'px-4 py-3 text-left';
const headerRightClassName = 'px-4 py-3 text-right';
const cellClassName = 'px-4 py-3 whitespace-nowrap text-sm text-default text-right';

export default function LanguageFeatureImpactSection({
  languageFeatureImpactData,
}: LanguageFeatureImpactSectionProps) {
  if (languageFeatureImpactData.rows.length === 0) {
    return null;
  }

  const columns: TableColumn<LanguageFeatureImpactRow>[] = [
    {
      id: 'language',
      header: 'Language',
      headerClassName: headerLeftClassName,
      className: 'px-4 py-3 whitespace-nowrap text-sm font-medium text-default',
      renderCell: (row) => row.language,
    },
    {
      id: 'total',
      header: 'Total',
      headerClassName: headerRightClassName,
      className: `${cellClassName} font-medium`,
      renderCell: (row) => row.total.toLocaleString(),
    },
    ...languageFeatureImpactData.features.map((feature): TableColumn<LanguageFeatureImpactRow> => ({
      id: feature,
      header: translateFeature(feature),
      headerClassName: headerRightClassName,
      className: cellClassName,
      renderCell: (row) => row.features[feature].toLocaleString(),
    })),
  ];

  return (
    <div className="mt-6 pt-6 border-t border-default">
      <h3 className="text-lg font-semibold text-default mb-2">LOC Impact by Language and Feature</h3>
      <p className="text-sm text-muted mb-4">
        Lines of code impacted (added + deleted) for top 10 languages, broken down by Copilot feature.
      </p>
      <MetricsTable
        data={languageFeatureImpactData.rows}
        columns={columns}
        tableContainerClassName="overflow-x-auto border border-default"
        getRowKey={(row) => row.language}
      />
    </div>
  );
}
