import type { SurfaceCohortSummary } from '../../../types/surfaceProductivity';
import { COHORT_LABELS } from './surfaceMetadata';

interface CohortContextTableProps {
  cohorts: SurfaceCohortSummary[];
}

function formatSigned(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toLocaleString()}`;
}

export default function CohortContextTable({
  cohorts,
}: CohortContextTableProps) {
  return (
    <section
      id="surface-productivity-overlap"
      className="scroll-mt-28 overflow-hidden rounded-md border border-default bg-default"
    >
      <div className="border-b border-default px-6 py-4">
        <h2 className="text-lg font-semibold text-default">Overlap context</h2>
        <p className="mt-1 max-w-3xl text-sm text-muted">
          Whole-user outcomes grouped by the surfaces each person used. These
          medians provide context, but do not attribute a multi-surface
          user&apos;s total output to any single surface.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-default">
          <thead className="bg-muted">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-muted">
                Usage pattern
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-muted">
                Users
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-muted">
                Median active days
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-muted">
                Median net LOC
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-default">
            {cohorts.map(cohort => (
              <tr key={cohort.cohort}>
                <th
                  scope="row"
                  className="whitespace-nowrap px-6 py-4 text-left text-sm font-medium text-default"
                >
                  {COHORT_LABELS[cohort.cohort]}
                </th>
                <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-default">
                  {cohort.users.toLocaleString()}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-default">
                  {cohort.medianActiveDays.toLocaleString()}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-default">
                  {formatSigned(cohort.medianNetLocImpact)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
