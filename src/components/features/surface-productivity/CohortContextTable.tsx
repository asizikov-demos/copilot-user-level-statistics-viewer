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
      className="scroll-mt-28 overflow-hidden rounded-md border border-[#d1d9e0] bg-white"
    >
      <div className="border-b border-gray-200 px-6 py-4">
        <h2 className="text-lg font-semibold text-gray-900">Overlap context</h2>
        <p className="mt-1 max-w-3xl text-sm text-gray-600">
          Whole-user outcomes grouped by the surfaces each person used. These
          medians provide context, but do not attribute a multi-surface
          user&apos;s total output to any single surface.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Usage pattern
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                Users
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                Median active days
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                Median net LOC
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {cohorts.map(cohort => (
              <tr key={cohort.cohort}>
                <th
                  scope="row"
                  className="whitespace-nowrap px-6 py-4 text-left text-sm font-medium text-gray-900"
                >
                  {COHORT_LABELS[cohort.cohort]}
                </th>
                <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-900">
                  {cohort.users.toLocaleString()}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-900">
                  {cohort.medianActiveDays.toLocaleString()}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-900">
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
