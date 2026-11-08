'use client';

import type { UserDetailedMetrics } from '../../../../types/aggregatedMetrics';
import { getTotalUserInitiatedInteractionCount } from '../../../../domain/assumedInteractions';
import { translateFeature } from '../../../../domain/featureTranslations';
import MetricsTable, { type TableColumn } from '../../../ui/MetricsTable';
import TableCard from '../../../ui/TableCard';

type FeatureAggregate = UserDetailedMetrics['featureAggregates'][number];

interface UserDetailsFeatureActivitySectionProps {
  sectionId: string;
  featureAggregates: UserDetailedMetrics['featureAggregates'];
}

const headerRightClassName = 'px-6 py-3 text-right';
const valueCellClassName = 'px-6 py-4 whitespace-nowrap text-sm text-default text-right';

const columns: TableColumn<FeatureAggregate>[] = [
  {
    id: 'feature',
    header: 'Feature',
    className: 'px-6 py-4 whitespace-nowrap text-sm font-medium text-default',
    renderCell: (feature) => translateFeature(feature.feature),
  },
  {
    id: 'interactions',
    header: 'Interactions',
    headerClassName: headerRightClassName,
    className: valueCellClassName,
    renderCell: (feature) => getTotalUserInitiatedInteractionCount(feature).toLocaleString(),
  },
  {
    id: 'generation',
    header: 'Generation',
    headerClassName: headerRightClassName,
    className: valueCellClassName,
    renderCell: (feature) => feature.code_generation_activity_count.toLocaleString(),
  },
  {
    id: 'acceptance',
    header: 'Acceptance',
    headerClassName: headerRightClassName,
    className: valueCellClassName,
    renderCell: (feature) => feature.code_acceptance_activity_count.toLocaleString(),
  },
  {
    id: 'locAdded',
    header: 'LOC Added',
    headerClassName: headerRightClassName,
    className: valueCellClassName,
    renderCell: (feature) => feature.loc_added_sum.toLocaleString(),
  },
  {
    id: 'locDeleted',
    header: 'LOC Deleted',
    headerClassName: headerRightClassName,
    className: valueCellClassName,
    renderCell: (feature) => feature.loc_deleted_sum.toLocaleString(),
  },
  {
    id: 'suggestedAdd',
    header: 'Suggested Add',
    headerClassName: headerRightClassName,
    className: valueCellClassName,
    renderCell: (feature) => feature.loc_suggested_to_add_sum.toLocaleString(),
  },
  {
    id: 'suggestedDelete',
    header: 'Suggested Delete',
    headerClassName: headerRightClassName,
    className: valueCellClassName,
    renderCell: (feature) => feature.loc_suggested_to_delete_sum.toLocaleString(),
  },
];

export default function UserDetailsFeatureActivitySection({
  sectionId,
  featureAggregates,
}: UserDetailsFeatureActivitySectionProps) {
  return (
    <div id={sectionId} className="mt-8 pt-6 border-t border-default scroll-mt-28">
      <TableCard
        title="Activity by Feature"
        description="Interactions, code generation, acceptances, and suggested or actual LOC changes grouped by feature."
      >
        <MetricsTable
          data={featureAggregates}
          columns={columns}
          tableContainerClassName="overflow-x-auto"
          getRowKey={(feature) => feature.feature}
        />
      </TableCard>
    </div>
  );
}
