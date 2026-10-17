import type { SurfaceProductivitySummary } from '../../../types/surfaceProductivity';
import {
  SURFACE_METADATA,
  SURFACE_ORDER,
} from './surfaceMetadata';

interface SurfaceComparisonTableProps {
  summaries: SurfaceProductivitySummary[];
}

function LocImpact({
  locAdded,
  locDeleted,
}: {
  locAdded: number;
  locDeleted: number;
}) {
  return (
    <>
      <span className="text-success" data-tone="positive">+{locAdded.toLocaleString()}</span>
      <span className="text-disabled"> / </span>
      <span className="text-danger" data-tone="negative">-{locDeleted.toLocaleString()}</span>
    </>
  );
}

function getAverage(value: number, count: number): number {
  if (count === 0) return 0;
  return Math.round((value / count) * 10) / 10;
}

export default function SurfaceComparisonTable({
  summaries,
}: SurfaceComparisonTableProps) {
  const summariesBySurface = new Map(
    summaries.map(summary => [summary.surface, summary])
  );

  return (
    <section
      id="surface-productivity-comparison"
      className="scroll-mt-28 overflow-hidden rounded-md border border-default bg-default"
    >
      <div className="border-b border-default px-6 py-4">
        <h2 className="text-lg font-semibold text-default">
          Surface comparison
        </h2>
        <p className="mt-1 max-w-3xl text-sm text-muted">
          Compare reach and active user-days separately from LOC impact. Rates
          use each surface&apos;s own active days as the denominator.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-default">
          <thead className="bg-muted">
            <tr>
              {[
                'Surface',
                'Reach',
                'Active user-days',
                'Days / user',
                'LOC impact',
                'Avg LOC impact / user',
                'LOC / active day',
              ].map((label, index) => (
                <th
                  key={label}
                  scope="col"
                  className={`px-6 py-3 text-xs font-semibold text-muted ${
                    index === 0 ? 'text-left' : 'text-right'
                  }`}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-default">
            {SURFACE_ORDER.map(surface => {
              const summary = summariesBySurface.get(surface);
              const metadata = SURFACE_METADATA[surface];
              return (
                <tr key={surface}>
                  <th
                    scope="row"
                    className="min-w-64 px-6 py-4 text-left font-normal"
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${metadata.dotClassName}`}
                        aria-hidden="true"
                      />
                      <span>
                        <span className="block text-sm font-semibold text-default">
                          {metadata.label}
                        </span>
                        <span className="mt-0.5 block text-xs text-muted">
                          {metadata.shortDescription}
                        </span>
                      </span>
                    </div>
                  </th>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-default">
                    {summary?.uniqueUsers.toLocaleString() ?? '0'}
                    <span className="ml-1 text-muted">
                      ({summary?.reachPercentage ?? 0}%)
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-default">
                    {summary?.activeUserDays.toLocaleString() ?? '0'}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-default">
                    {summary?.activeDaysPerUser.toLocaleString() ?? '0'}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium text-default">
                    <LocImpact
                      locAdded={summary?.locAdded ?? 0}
                      locDeleted={summary?.locDeleted ?? 0}
                    />
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-default">
                    <LocImpact
                      locAdded={getAverage(
                        summary?.locAdded ?? 0,
                        summary?.uniqueUsers ?? 0
                      )}
                      locDeleted={getAverage(
                        summary?.locDeleted ?? 0,
                        summary?.uniqueUsers ?? 0
                      )}
                    />
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-default">
                    <LocImpact
                      locAdded={getAverage(
                        summary?.locAdded ?? 0,
                        summary?.activeUserDays ?? 0
                      )}
                      locDeleted={getAverage(
                        summary?.locDeleted ?? 0,
                        summary?.activeUserDays ?? 0
                      )}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
