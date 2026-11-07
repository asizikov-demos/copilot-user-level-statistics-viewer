import type { DayReportingQuality } from '../../../../types/reportingQuality';
import RequirementComponent from '../../../ui/RequirementComponent';

const TELEMETRY_LABELS = {
  missing: 'Server-side telemetry only',
  received: 'Client telemetry received',
  unreported: 'Telemetry status not reported',
};

export default function CalendarReportingCard({ day, quality }: { day: string; quality?: DayReportingQuality }) {
  const status = quality?.telemetryStatus ?? 'unreported';
  const counts = quality?.requirementCounts;
  const components = quality?.requirements?.filter(row => row.status !== 'met') ?? [];
  const preview = components.slice(0, 3);
  return (
    <div className="space-y-2 p-4 text-sm text-default">
      <p className="font-semibold">
        {new Date(day).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}
      </p>
      <p className="font-medium">{TELEMETRY_LABELS[status]}</p>
      {status === 'missing' && (
        <p className="text-muted">Copilot activity was recorded server-side, but qualifying client usage telemetry was not received. Usage details may be incomplete; this does not establish a cause.</p>
      )}
      {status === 'received' && <p className="text-muted">Received telemetry does not guarantee complete usage detail.</p>}
      {counts && (
        <>
          <p>{counts.unmet} below minimum · {counts.unknown} unknown</p>
          {quality?.requirements?.length === 0 && <p className="text-muted">No components were listed in the reported requirements.</p>}
          {preview.length > 0 && (
            <ul className="space-y-2 text-xs">
              {preview.map(row => (
                <li key={`${row.status}:${row.component}`}>
                  <RequirementComponent component={row.component} compact />
                  <span className="block text-muted">{row.status === 'unmet' ? 'Below minimum' : 'Unknown'}</span>
                </li>
              ))}
            </ul>
          )}
          {components.length > preview.length && <p className="text-muted">+{components.length - preview.length} more</p>}
        </>
      )}
      <p className="text-xs text-muted">Click to open day details.</p>
    </div>
  );
}
