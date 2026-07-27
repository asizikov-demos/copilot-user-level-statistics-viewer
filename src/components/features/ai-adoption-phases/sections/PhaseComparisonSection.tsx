import MetricsTable from '../../../ui/MetricsTable';
import type { AiAdoptionPhaseReadModel } from '../../../../read-models/aiAdoptionPhases';
import { createAiAdoptionPhaseColumns } from '../aiAdoptionPhaseColumns';

interface PhaseComparisonSectionProps {
  sectionId: string;
  aiAdoptionPhaseData: AiAdoptionPhaseReadModel['aiAdoptionPhaseData'];
}

export function PhaseComparisonSection({
  sectionId,
  aiAdoptionPhaseData,
}: PhaseComparisonSectionProps) {
  return (
    <div id={sectionId} className="bg-white rounded-md border border-[#d1d9e0] scroll-mt-28">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Phase comparison</h3>
        <p className="mt-1 text-sm text-gray-600">Averages are calculated per user in each phase.</p>
      </div>
      <MetricsTable
        data={aiAdoptionPhaseData}
        columns={createAiAdoptionPhaseColumns()}
        tableClassName="w-full divide-y divide-gray-200"
        tableContainerClassName="overflow-x-auto"
        theadClassName="bg-gray-50"
        rowClassName={(_, index) => `${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-gray-50`}
        getRowKey={(phase) => phase.phase.phase_number}
        emptyState={(
          <div className="px-6 py-8 text-center text-sm text-gray-500">
            No AI adoption phase data is available in this metrics upload.
          </div>
        )}
      />
    </div>
  );
}
