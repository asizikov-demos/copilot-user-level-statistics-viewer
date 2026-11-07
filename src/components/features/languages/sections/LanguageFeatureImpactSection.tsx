import { translateFeature } from '../../../../domain/featureTranslations';
import type { LanguageFeatureImpactData, LanguageFeatureImpactRow } from '../../../../types/metrics';
import MetricsTable, { type TableColumn } from '../../../ui/MetricsTable';
import TableCard from '../../../ui/TableCard';

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
      <TableCard
        title="LOC Impact by Language and Feature"
        description="Lines of code impacted (added + deleted) for top 10 languages, broken down by Copilot feature."
      >
        <MetricsTable
          data={languageFeatureImpactData.rows}
          columns={columns}
          tableContainerClassName="overflow-x-auto"
          getRowKey={(row) => row.language}
        />
      </TableCard>
    </div>
  );
}
