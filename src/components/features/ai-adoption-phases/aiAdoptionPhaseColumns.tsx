import TopEntriesList from '../../ui/TopEntriesList';
import type { TableColumn } from '../../ui/MetricsTable';
import { formatIDEName, getIDEIcon } from '../../icons/IDEIcons';
import { getModelIcon } from '../../icons/ModelIcons';
import type { AiAdoptionPhaseReadModel } from '../../../read-models/aiAdoptionPhases';
import {
  formatAiCreditCost,
  formatModelDisplayName,
  formatNumber,
} from '../../../utils/formatters';
import AiAdoptionPhaseLabel from './AiAdoptionPhaseLabel';

type AiAdoptionPhaseData = AiAdoptionPhaseReadModel['aiAdoptionPhaseData'][number];

function formatAverage(value: number): string {
  return formatNumber(value, 1);
}

export function createAiAdoptionPhaseColumns(): TableColumn<AiAdoptionPhaseData>[] {
  const leftHeaderClass = 'px-6 py-3 text-left min-w-[180px]';
  const rightHeaderClass = 'px-6 py-3 text-right';
  const rightCellClass = 'px-6 py-4 whitespace-nowrap text-sm text-default text-right';

  return [
    {
      id: 'phase',
      header: 'Phase',
      headerClassName: leftHeaderClass,
      className: 'px-6 py-4 whitespace-nowrap',
      renderCell: (phase) => (
        <AiAdoptionPhaseLabel phase={phase.phase} />
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
          <span className="text-success">+{formatAverage(phase.avgLocAdded)}</span>
          <span className="text-disabled">/</span>
          <span className="text-danger">-{formatAverage(phase.avgLocDeleted)}</span>
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
          <span className="text-success">+{phase.totalLocAdded.toLocaleString()}</span>
          <span className="text-disabled">/</span>
          <span className="text-danger">-{phase.totalLocDeleted.toLocaleString()}</span>
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
      headerClassName: leftHeaderClass,
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
      headerClassName: leftHeaderClass,
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
      headerClassName: leftHeaderClass,
      className: 'px-6 py-4 align-top',
      renderCell: (phase) => <TopEntriesList entries={phase.topLanguages} />,
    },
  ];
}
