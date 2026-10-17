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
    <div id={sectionId} className="bg-default rounded-md border border-default scroll-mt-28">
      <div className="px-6 py-4 border-b border-default">
        <h3 className="text-lg font-semibold text-default">Phase comparison</h3>
        <p className="mt-1 text-sm text-muted">Averages are calculated per user in each phase.</p>
      </div>
      <MetricsTable
        data={aiAdoptionPhaseData}
        columns={createAiAdoptionPhaseColumns()}
        tableClassName="w-full divide-y divide-default"
        tableContainerClassName="overflow-x-auto"
        theadClassName="bg-muted"
        rowClassName={(_, index) => `${index % 2 === 0 ? 'bg-default' : 'bg-muted'} hover:bg-muted`}
        getRowKey={(phase) => phase.phase.phase_number}
        emptyState={(
          <div className="px-6 py-8 text-center text-sm text-muted">
            No AI adoption phase data is available in this metrics upload.
          </div>
        )}
      />
    </div>
  );
}
