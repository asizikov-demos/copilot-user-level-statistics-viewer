'use client';

import type { UserDetailedMetrics } from '../../../../types/aggregatedMetrics';
import { translateFeature } from '../../../../domain/featureTranslations';
import MetricsTable, { type TableColumn } from '../../../ui/MetricsTable';
import { withInteractionsTableColumns } from '../../../charts/utils/activityMetricColumns';

type FeatureAggregate = UserDetailedMetrics['featureAggregates'][number];

interface UserDetailsFeatureActivitySectionProps {
  sectionId: string;
  featureAggregates: UserDetailedMetrics['featureAggregates'];
}

const HEADER_LEFT = 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider';
const CELL_LEFT = 'px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900';

const featureColumns: TableColumn<FeatureAggregate>[] = [
  {
    id: 'feature',
    header: 'Feature',
    headerClassName: HEADER_LEFT,
    className: CELL_LEFT,
    renderCell: (r) => translateFeature(r.feature),
  },
  ...withInteractionsTableColumns<FeatureAggregate>(),
];

export default function UserDetailsFeatureActivitySection({
  sectionId,
  featureAggregates,
}: UserDetailsFeatureActivitySectionProps) {
  return (
    <div id={sectionId} className="mt-8 pt-6 border-t border-gray-200 scroll-mt-28">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Activity by Feature</h3>
      <MetricsTable
        data={featureAggregates}
        columns={featureColumns}
        tableContainerClassName="overflow-x-auto border border-gray-200"
        theadClassName="bg-gray-50"
        tbodyClassName="bg-white divide-y divide-gray-200"
        getRowKey={(r) => r.feature}
      />
    </div>
  );
}
