import TopEntriesList from '../../ui/TopEntriesList';
import type { TableColumn } from '../../ui/MetricsTable';
import { formatIDEName, getIDEIcon } from '../../icons/IDEIcons';
import { getModelIcon } from '../../icons/ModelIcons';
import type { AiAdoptionPhaseReadModel } from '../../../read-models/aiAdoptionPhases';
import {
  formatAiAdoptionPhase,
  formatAiCreditCost,
  formatModelDisplayName,
  formatNumber,
} from '../../../utils/formatters';
import { PHASE_PILL_CLASS } from './aiAdoptionPhaseMetadata';

type AiAdoptionPhaseData = AiAdoptionPhaseReadModel['aiAdoptionPhaseData'][number];

function formatAverage(value: number): string {
  return formatNumber(value, 1);
}

export function createAiAdoptionPhaseColumns(): TableColumn<AiAdoptionPhaseData>[] {
  const rightHeaderClass = 'px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider';
  const rightCellClass = 'px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right';

  return [
    {
      id: 'phase',
      header: 'Phase',
      headerClassName: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[180px]',
      className: 'px-6 py-4 whitespace-nowrap',
      renderCell: (phase) => (
        <span className={PHASE_PILL_CLASS}>
          {formatAiAdoptionPhase(phase.phase)}
        </span>
      ),
    },
    {
      id: 'userCount',
      header: 'Users',
      headerClassName: rightHeaderClass,
      className: `${rightCellClass} font-medium`,
      renderCell: (phase) => phase.userCount.toLocaleString(),
    },
    {
      id: 'avgUserInitiatedInteractions',
      header: 'Avg Interactions',
      headerClassName: rightHeaderClass,
      className: rightCellClass,
      renderCell: (phase) => formatAverage(phase.avgUserInitiatedInteractions),
    },
    {
      id: 'avgLocImpact',
      header: 'Avg LOC Impact',
      headerClassName: rightHeaderClass,
      className: rightCellClass,
      renderCell: (phase) => (
        <span className="whitespace-nowrap tabular-nums">
          <span className="text-green-600">+{formatAverage(phase.avgLocAdded)}</span>
          <span className="text-gray-400">/</span>
          <span className="text-red-600">-{formatAverage(phase.avgLocDeleted)}</span>
        </span>
      ),
    },
    {
      id: 'avgAiCreditsUsed',
      header: 'Avg AI Cost',
      headerClassName: rightHeaderClass,
      className: rightCellClass,
      renderCell: (phase) => formatAiCreditCost(phase.avgAiCreditsUsed),
    },
    {
      id: 'totalLocImpact',
      header: 'Total LOC Impact',
      headerClassName: rightHeaderClass,
      className: rightCellClass,
      renderCell: (phase) => (
        <span className="whitespace-nowrap tabular-nums">
          <span className="text-green-600">+{phase.totalLocAdded.toLocaleString()}</span>
          <span className="text-gray-400">/</span>
          <span className="text-red-600">-{phase.totalLocDeleted.toLocaleString()}</span>
        </span>
      ),
    },
    {
      id: 'avgDaysActive',
      header: 'Avg Active Days',
      headerClassName: rightHeaderClass,
      className: rightCellClass,
      renderCell: (phase) => formatAverage(phase.avgDaysActive),
    },
    {
      id: 'topModels',
      header: 'Top Models - interactions',
      headerClassName: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[180px]',
      className: 'px-6 py-4 align-top',
      renderCell: (phase) => (
        <TopEntriesList
          entries={phase.topModels}
          formatName={formatModelDisplayName}
          getIcon={getModelIcon}
        />
      ),
    },
    {
      id: 'topClients',
      header: 'Top Clients - activity',
      headerClassName: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[180px]',
      className: 'px-6 py-4 align-top',
      renderCell: (phase) => (
        <TopEntriesList
          entries={phase.topClients}
          formatName={formatIDEName}
          getIcon={getIDEIcon}
        />
      ),
    },
    {
      id: 'topLanguages',
      header: 'Top Languages - generations + acceptances',
      headerClassName: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[180px]',
      className: 'px-6 py-4 align-top',
      renderCell: (phase) => <TopEntriesList entries={phase.topLanguages} />,
    },
  ];
}
