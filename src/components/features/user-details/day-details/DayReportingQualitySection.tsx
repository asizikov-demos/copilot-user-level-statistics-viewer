import { Label } from '@primer/react';
import type { ComponentRequirement, DayReportingQuality } from '../../../../types/reportingQuality';
import MetricsTable, { type TableColumn } from '../../../ui/MetricsTable';
import RequirementComponent from '../../../ui/RequirementComponent';

const STATUS_LABELS = { met: 'Meets minimum', unmet: 'Below minimum', unknown: 'Unknown' };

const columns: TableColumn<ComponentRequirement>[] = [
  {
    id: 'component',
    header: 'Component identifier',
    headerClassName: 'px-4 py-3 text-left',
    className: 'px-4 py-3 text-sm text-default',
    renderCell: row => <RequirementComponent component={row.component} />,
  },
  {
    id: 'status',
    header: 'Reported status',
    headerClassName: 'px-4 py-3 text-left',
    className: 'px-4 py-3 text-sm whitespace-nowrap',
    renderCell: row => <Label variant={row.status === 'unmet' ? 'danger' : row.status === 'unknown' ? 'attention' : 'secondary'}>{STATUS_LABELS[row.status]}</Label>,
  },
];

export default function DayReportingQualitySection({ quality }: { quality?: DayReportingQuality }) {
  const telemetry = quality?.telemetryStatus ?? 'unreported';
  const requirements = quality?.requirements;
  return (
    <section className="space-y-3 rounded-md border border-default bg-default p-4" aria-label="Day reporting quality">
      <h4 className="text-lg font-semibold text-default">Reporting quality</h4>
      <p className="flex items-center gap-2 text-sm text-default">
        Client telemetry
        <Label variant={telemetry === 'missing' ? 'attention' : 'secondary'}>
          {telemetry === 'missing' ? 'Missing' : telemetry === 'received' ? 'Received' : 'Not reported'}
        </Label>
      </p>
      {telemetry === 'missing' && (
        <p className="text-sm text-muted">Copilot activity was recorded server-side, but qualifying client usage telemetry was not received. Usage details may be incomplete. Check IDE telemetry settings, connectivity, and any reported version failures; this status alone does not identify a cause.</p>
      )}
      {telemetry === 'received' && <p className="text-sm text-muted">Received client telemetry does not guarantee complete usage detail. Telemetry and version requirements are independent signals.</p>}
      {requirements == null ? (
        <p className="text-sm text-muted">Version requirements were not reported for this day.</p>
      ) : requirements.length === 0 ? (
        <p className="text-sm text-muted">No components were listed in the reported requirements. Empty lists do not establish that all requirements passed.</p>
      ) : (
        <MetricsTable
          data={requirements}
          columns={columns}
          getRowKey={row => `${row.status}:${row.component}`}
          tableContainerClassName="overflow-x-auto border border-default"
          tableClassName="w-full divide-y divide-default"
          theadClassName="bg-muted"
        />
      )}
    </section>
  );
}
